import { isInternalPathIndexable, isNoindexMarkdownFile } from './linkPolicy.mjs';

export default function rehypeLinkPolicy() {
  return (tree, file) => {
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
