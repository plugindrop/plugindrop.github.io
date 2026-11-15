const block = (kind) => new RegExp(`<!-- deal-context-${kind}:start -->[\\s\\S]*?<!-- deal-context-${kind}:end -->`, 'g');
export function splitV4Article(html) {
  if (typeof html !== 'string' || !/<!-- role:(product|price|claim|bundle) -->/.test(html)) return null;
  try {
    let body = html;
    const extracted = {};
    for (const kind of ['video', 'formats', 'sale-windows', 'alternatives']) {
      const matches = [...body.matchAll(block(kind))].map(match => match[0]);
      if (body.includes(`<!-- deal-context-${kind}:start -->`) !== body.includes(`<!-- deal-context-${kind}:end -->`)) return null;
      extracted[kind] = matches.map(match => match.replace(new RegExp(`^<!-- deal-context-${kind}:start -->|<!-- deal-context-${kind}:end -->$`, 'g'), '')).join('');
      body = body.replace(block(kind), '');
    }
    const headers = [...body.matchAll(/<h2\b[^>]*\bid="([^"]+)"[^>]*>[\s\S]*?<\/h2>/gi)];
    if (!headers.length) return null;
    const tldrHtml = body.slice(0, headers[0].index);
    const sections = headers.map((header, i) => {
      const section = body.slice(header.index, headers[i + 1]?.index ?? body.length);
      const role = section.match(/<!-- role:([a-z-]+) -->/)?.[1];
      return role ? { role, id: header[1], html: section } : null;
    });
    if (sections.some(section => !section)) return null;
    const faq = sections.find(section => section.role === 'faq')?.html ?? '';
    const faqItems = [...faq.matchAll(/<p>Q:\s*([\s\S]*?)<\/p>\s*<p>A:\s*([\s\S]*?)<\/p>/gi)].map(match => ({ q: match[1].replace(/<[^>]*>/g, '').trim(), aHtml: match[2] }));
    return { tldrHtml, sections, videoHtml: extracted.video, formatsHtml: extracted.formats, faqItems };
  } catch { return null; }
}
