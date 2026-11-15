export function isV4Article(rawBody) {
  return /^<!-- role:(product|price|claim|bundle) -->$/m.test(rawBody ?? '');
}
