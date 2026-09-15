/**
 * rehypeProductLinks — 記事本文中の追跡製品名を価格トラッカーページへ自動リンクする。
 *
 * NW-C (docs/next-wave-2026-07-12.md): ビルド時に本文中の price_history.json
 * キー（追跡製品名）を /plugin-prices/{slug}/ へリンクする。
 *   - 長い名前優先（"FabFilter Pro-Q 4" が "Pro-Q 4" 系の部分一致に勝つよう
 *     正規表現の選択肢を文字数降順で構築）
 *   - 1記事1製品1回（最初の出現のみ）
 *   - 既存リンク(a)・見出し(h1-h6)・コード(code/pre)・script/style 内は除外
 *   - 生HTML（iframe等）は raw ノードのため構造的に対象外
 *   - 大文字小文字は区別する（"Vital" と形容詞 "vital" の誤リンク防止）
 *
 * slugify は src/lib/priceUtils.ts の実装と完全一致させること（リンク先の
 * /plugin-prices/[slug].astro ルート生成と同じ規則）。
 */
import fs from 'node:fs';

const dataUrl = new URL('../data/price_history.json', import.meta.url);

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildMatcher() {
  const raw = JSON.parse(fs.readFileSync(dataUrl, 'utf8'));
  const names = [
    ...Object.keys(raw.bundles ?? {}),
    ...Object.keys(raw.plugins ?? {}),
  ];
  // 長い名前優先: 同一開始位置では正規表現の選択肢は左から試されるため、
  // 文字数降順に並べれば "FabFilter Pro-Q 4" > "Pro-Q 4" が保証される。
  names.sort((a, b) => b.length - a.length);
  const slugByName = new Map(names.map((n) => [n, slugify(n)]));
  const alternation = names.map(escapeRegExp).join('|');
  // 単語境界: 製品名は空白・記号を含むため \b では不十分。前後が英数字・
  // ハイフンでないことを要求する（"Serum 2000" の "Serum 2" 誤マッチ防止）。
  const re = new RegExp(`(?<![A-Za-z0-9-])(${alternation})(?![A-Za-z0-9-])`);
  return { re, slugByName };
}

const EXCLUDED_TAGS = new Set(['a', 'code', 'pre', 'script', 'style', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

export default function rehypeProductLinks() {
  const { re, slugByName } = buildMatcher();

  return function transformer(tree) {
    const linkedSlugs = new Set(); // 1記事1製品1回

    function processText(node) {
      // このテキストノードを [text, a, text, ...] のノード列へ分割する
      const out = [];
      let rest = node.value;
      let changed = false;
      while (rest) {
        const m = re.exec(rest);
        if (!m) break;
        const name = m[1];
        const slug = slugByName.get(name);
        if (!slug || linkedSlugs.has(slug)) {
          // リンク済み製品: マッチ部分を素通しして残りを走査
          out.push({ type: 'text', value: rest.slice(0, m.index + name.length) });
          rest = rest.slice(m.index + name.length);
          continue;
        }
        linkedSlugs.add(slug);
        changed = true;
        if (m.index > 0) out.push({ type: 'text', value: rest.slice(0, m.index) });
        out.push({
          type: 'element',
          tagName: 'a',
          properties: {
            href: `/plugin-prices/${slug}/`,
            title: `${name} price history & sale tracker`,
            'data-auto-price-link': '',
          },
          children: [{ type: 'text', value: name }],
        });
        rest = rest.slice(m.index + name.length);
      }
      if (!changed) return null;
      if (rest) out.push({ type: 'text', value: rest });
      return out;
    }

    function walk(node) {
      if (!node.children) return;
      if (node.type === 'element' && EXCLUDED_TAGS.has(node.tagName)) return;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type === 'text') {
          const replaced = processText(child);
          if (replaced) {
            node.children.splice(i, 1, ...replaced);
            i += replaced.length - 1;
          }
        } else {
          walk(child);
        }
      }
    }

    walk(tree);
  };
}
