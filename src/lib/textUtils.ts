/**
 * Generic text helpers shared across pages/components.
 */

/**
 * Remove Markdown link/strikethrough/bold syntax, keeping the inner text.
 * Used for `description` frontmatter values, which are meant to be rendered
 * as plain text (meta tags, listing excerpts) but can carry Markdown left
 * over from LLM-generated article body style.
 */
export function stripMarkdownEmphasis(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1');
}
