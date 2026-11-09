export function resolveInternalFlag(search, stored) {
  const params = new URLSearchParams(search);
  const value = params.get('internal');
  if (value === '1') return { flag: true, write: '1' };
  if (value === '0') return { flag: false, write: 'clear' };
  return { flag: stored === '1', write: null };
}

export function tagPbHrefForInternal(href) {
  try {
    const url = new URL(href);
    if (url.hostname !== 'pluginboutique.com' && url.hostname !== 'www.pluginboutique.com') return href;
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return href;
    if (url.searchParams.has('data2')) return href;
    url.searchParams.set('data2', 'internal');
    return url.href;
  } catch {
    return href;
  }
}
