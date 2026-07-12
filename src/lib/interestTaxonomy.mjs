/**
 * interestTaxonomy — NW-H パーソナライズの興味カテゴリ判定（ビルド時専用）。
 *
 * 設計書 docs/nw-h-personalization-design.md §2 の実装。判定ロジックはこの
 * 1ファイルに集約する（ページ側に分散させない）。判定は辞書ベースのみで、
 * 確信が持てないコンテンツは空配列 = パーソナライズ対象外（誠実側に倒す）。
 */

export const PD_CATEGORIES = [
  'synth', 'guitar-bass', 'drums', 'vocals', 'orchestral',
  'mixing', 'effects', 'sampling', 'daw', 'free',
];

// frontmatter tags → カテゴリ
const TAG_RULES = {
  synth: 'synth', synths: 'synth', wavetable: 'synth',
  guitar: 'guitar-bass', bass: 'guitar-bass', amp: 'guitar-bass',
  drums: 'drums', drum: 'drums', percussion: 'drums',
  vocals: 'vocals', vocal: 'vocals',
  orchestral: 'orchestral', choir: 'orchestral', strings: 'orchestral', cinematic: 'orchestral', kontakt: 'orchestral',
  mixing: 'mixing', mastering: 'mixing', eq: 'mixing', compressor: 'mixing',
  effects: 'effects', reverb: 'effects', delay: 'effects', saturation: 'effects', lofi: 'effects',
  'sample-pack': 'sampling', samples: 'sampling', sampler: 'sampling', loops: 'sampling',
  daw: 'daw', software: 'daw', workflow: 'daw',
  free: 'free',
};

// タイトル/名前中のキーワード → カテゴリ（小文字比較・単語気味の部分一致）
const KEYWORD_RULES = [
  [/(synth|serum|vital|pigments|omnisphere|sylenth|phase plant|massive|reaktor|dune|nexus|zebra|hive|arturia v|dx7|fm8|wavetable|analog lab)/, 'synth'],
  [/(guitar|amp sim|amplifier|tonex|engl|bass vst|pedal|riffs?)/, 'guitar-bass'],
  [/(drum|808|kick|snare|ezdrummer|superior drummer|addictive drums|battery|beat maker|percussion)/, 'drums'],
  [/(vocal|voice|auto-?tune|nectar|de-?esser|pitch correction|autotune|harmoni[zs]er)/, 'vocals'],
  [/(orchestr|choir|strings|cinematic|film scoring|spitfire|kontakt|8dio|opus|symphon|brass|woodwind|soundpaint)/, 'orchestral'],
  [/(mixing|mastering|\beq\b|equali[zs]er|compressor|limiter|loudness|ozone|neutron|channel strip|de-?noise)/, 'mixing'],
  [/(reverb|delay|saturation|distortion|chorus|flanger|phaser|lo-?fi|tape|granular|glitch|multi-?effect|vinyl)/, 'effects'],
  [/(sample pack|samples|loops|splice|loopcloud|sampler|sound ?bank|preset pack)/, 'sampling'],
  [/(\bdaw\b|ableton|fl studio|logic pro|cubase|studio one|reaper|garageband|cakewalk|bitwig|pro tools)/, 'daw'],
  [/(free|freebie|giveaway)/, 'free'],
];

// ブランド → カテゴリ（製品ページ・ディール用の補助）
const BRAND_RULES = [
  [/(spitfire|8dio|projectsam|eastwest|heavyocity|orchestral tools|cinesamples|versilian)/, 'orchestral'],
  [/(toontrack|xln audio|steven slate|getgood|gg ?audio)/, 'drums'],
  [/(antares|celemony|synchro arts)/, 'vocals'],
  [/(fabfilter|izotope|sonible|oeksound|tokyo dawn|dmg audio|sonnox|leapwing)/, 'mixing'],
  [/(valhalla|soundtoys|eventide|baby audio|wavesfactory|audiothing|caelum|chowdsp|klanghelm)/, 'effects'],
  [/(xfer|lennardigital|reveal sound|u-he|vital audio|matt tytel|reFX|spectrasonics|cherry audio|gforce|korg|roland)/, 'synth'],
  [/(splice|loopmasters|loopcloud|adsr)/, 'sampling'],
];

const MAX_CATS = 3;

/**
 * コンテンツを最大3カテゴリに分類する（優先度: tags > title > brand/extra）。
 * @param {object} p
 * @param {string} [p.title]  記事タイトル or 製品名
 * @param {string[]} [p.tags] frontmatter tags
 * @param {string} [p.extra]  ブランド名・カテゴリ名等の補助文字列
 * @returns {string[]} カテゴリid配列（0〜3件）
 */
export function categorize({ title = '', tags = [], extra = '' } = {}) {
  const found = [];
  const push = (cat) => {
    if (cat && !found.includes(cat) && found.length < MAX_CATS) found.push(cat);
  };

  for (const tag of tags) {
    push(TAG_RULES[String(tag).toLowerCase()]);
  }
  const t = String(title).toLowerCase();
  for (const [re, cat] of KEYWORD_RULES) {
    if (re.test(t)) push(cat);
  }
  const x = String(extra).toLowerCase();
  if (x) {
    for (const [re, cat] of BRAND_RULES) {
      if (re.test(x)) push(cat);
    }
    for (const [re, cat] of KEYWORD_RULES) {
      if (re.test(x)) push(cat);
    }
  }
  return found;
}

/** data-pd 属性値（カンマ区切り）を作る。該当なしは空文字。 */
export function pdAttr(input) {
  return categorize(input).join(',');
}
