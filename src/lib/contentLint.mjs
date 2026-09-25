/**
 * contentLint — checks run against every published article's raw markdown
 * body to catch two classes of problem the "no fake reviews" pass in
 * generator.py doesn't: paraphrased first-person experience claims we never
 * actually performed, and deal articles with no real content behind the CTA.
 *
 * Design source: docs/codex-requests/topdeals-content-ux-audit-2026-09-25.md
 * (PR-7).
 */

// Matches paraphrased claims of hands-on testing/experience that the site
// has no basis for (no reviewer, no test rig — see BlogPost.astro's removed
// reviewLD for why AggregateRating was disabled for the same reason).
// Deliberately requires past-tense/possessive forms so it doesn't fire on
// ordinary how-to phrasing like "Can I use this on vocals?".
const FIRST_PERSON_EXPERIENCE_RE =
  /\bI(?:'|’)ve (?:used|run|tested|been using|mixed|compared)\b|\bI (?:ran|tested|used)\b|\bamong the best I\b|\bI recommend\b|\bmy (?:default|go-to)\b|\bwe (?:tested|put .{0,20} through)\b|\bin our (?:tests|testing)\b|after using it|hands-on (?:review|testing)/gi;

/**
 * Returns every line (1-indexed) in `markdown` that reads as a first-person
 * or "we tested" experience claim. Empty array means the article makes no
 * such claim — which is what every published article should do, since none
 * of them are backed by an actual reviewer or test rig.
 */
export function firstPersonExperienceHits(markdown) {
  const hits = [];
  const lines = (markdown ?? '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    FIRST_PERSON_EXPERIENCE_RE.lastIndex = 0;
    if (FIRST_PERSON_EXPERIENCE_RE.test(lines[i])) {
      hits.push({ line: i + 1, text: lines[i].trim() });
    }
  }
  return hits;
}

/**
 * True when a deal article's actual body (frontmatter, HTML embeds, the
 * "Related Guides" footer, and the affiliate-disclosure line stripped out)
 * has no real content behind the CTA: under 150 words or fewer than two
 * `## ` sections. This is the "jd-800" shape — a video embed and a link,
 * nothing that motivates the purchase.
 */
export function publishedDealBodyTooThin(markdown) {
  let body = markdown ?? '';
  body = body.replace(/<[^>]+>/g, ' ');
  body = body.split(/##\s*Related Guides/i)[0];
  body = body.replace(/\*This post contains affiliate links.*?\*/gis, ' ');
  const headings = (body.match(/^##\s+/gm) ?? []).length;
  const words = (body.match(/\b\w+\b/g) ?? []).length;
  return words < 150 || headings < 2;
}

/**
 * Slugs allowed to fail one of the checks above, with the reason and the
 * PR that will actually fix it. Keep this empty by default — an entry here
 * is a known, tracked exception, not a place to quietly suppress a new hit.
 */
export const ALLOWLIST = {};
