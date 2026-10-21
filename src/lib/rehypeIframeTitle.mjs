// Iframe titles are accessibility labels only; a leftover "17% Off ..." deal claim there goes stale when the sale ends.
const clean = (title) => title.replace(/^\s*\d{1,3}%\s*Off\s+/i, '').replace(/\s*\(\$\d+(?:\.\d+)?\)/, '');
const walk = (node) => {
  if (node?.type === 'element' && node.tagName === 'iframe' && typeof node.properties?.title === 'string') {
    node.properties.title = clean(node.properties.title);
  }
  // Raw HTML written inside markdown arrives as a `raw` node, not an element.
  if (node?.type === 'raw' && typeof node.value === 'string' && node.value.includes('<iframe')) {
    node.value = node.value.replace(/(<iframe\b[^>]*\btitle=")([^"]*)(")/gi, (_, a, title, c) => a + clean(title) + c);
  }
  for (const child of node?.children ?? []) walk(child);
};
export default function rehypeIframeTitle() { return (tree) => walk(tree); }
