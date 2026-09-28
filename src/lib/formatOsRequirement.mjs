export function formatOsRequirement(value) {
  if (typeof value !== 'string') return 'not published';
  let text = value.trim();
  text = text.replace(/;\s*(?:Important Notes:|PC\b|Awards\b|Testimonials\b|Formats:).*$/i, '').trim();
  if (text.length > 150) text = text.includes(';') ? text.split(';', 1)[0].trim() : '';
  return text || 'not published';
}
