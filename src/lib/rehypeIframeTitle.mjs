// Iframe titles are accessibility labels only; a leftover "17% Off ..." deal claim there goes stale when the sale ends.
const walk = (node) => {
  if (node?.type === 'element' && node.tagName === 'iframe' && typeof node.properties?.title === 'string') {
    node.properties.title = node.properties.title.replace(/^\s*\d{1,3}%\s*Off\s+/i, '').replace(/\s*\(\$\d+(?:\.\d+)?\)/, '');
  }
  for (const child of node?.children ?? []) walk(child);
};
export default function rehypeIframeTitle() { return (tree) => walk(tree); }
