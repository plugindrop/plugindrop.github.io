import { isInternalPathIndexable, isNoindexMarkdownFile } from './linkPolicy.mjs';
import { pbLink } from './priceUtils.ts';
import path from 'node:path';

export default function rehypeLinkPolicy() {
  return (tree, file) => {
    const slug = path.basename(file?.path ?? file?.history?.[0] ?? 'article').replace(/\.mdx?$/i, '');
    function tagAffiliateLinks(node) {
      if (node.type === 'element' && node.tagName === 'a' && /^https?:\/\//i.test(node.properties?.href ?? '')) {
        node.properties.href = pbLink(node.properties.href, '', { campaign: slug, data1: slug });
      }
      for (const child of node.children ?? []) tagAffiliateLinks(child);
    }
    tagAffiliateLinks(tree);
    if (isNoindexMarkdownFile(file?.path ?? file?.history?.[0])) return;
    function walk(node) {
      if (!Array.isArray(node.children)) return;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type === 'element' && child.tagName === 'a' && !isInternalPathIndexable(child.properties?.href)) {
          const children = child.children ?? [];
          node.children.splice(i, 1, ...children);
          i += children.length - 1;
        } else walk(child);
      }
    }
    walk(tree);
  };
}
