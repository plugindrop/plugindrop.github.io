import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  firstPersonExperienceHits,
  publishedDealBodyTooThin,
  ALLOWLIST,
} from '../src/lib/contentLint.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.join(__dirname, '..', 'src', 'content', 'blog');

// --- unit tests: firstPersonExperienceHits -----------------------------

test('firstPersonExperienceHits catches every paraphrase in the spec', () => {
  const positives = [
    "I've used this on every vocal chain this year.",
    "I've run it head-to-head against three competitors.",
    "I've been using this since 2023.",
    "I've mixed a dozen records with it.",
    "I've compared it against the competition directly.",
    'I ran it through a full mastering chain.',
    'I tested it on drum busses.',
    'I used it for a month straight.',
    "the Plate algorithm ranks among the best I've used at any price.",
    'This is the reverb plugin I recommend to every producer.',
    'It has become my default send for lead vocals.',
    'This is my go-to limiter for mastering.',
    'we tested it against three competitors.',
    'we put it through a full mastering chain.',
    'in our tests, it held up well.',
    'in our testing, latency was negligible.',
    'after using it for a week, the workflow clicked.',
    'this is a hands-on review of the plugin.',
    'we did hands-on testing across ten tracks.',
  ];
  for (const line of positives) {
    assert.ok(firstPersonExperienceHits(line).length > 0, `expected a hit for: ${line}`);
  }
});

test('firstPersonExperienceHits does not false-positive on ordinary how-to phrasing', () => {
  const negatives = [
    'Can I use this on vocals?',
    'Can I run this on Apple Silicon?',
    'You can use it on drum busses too.',
    'This is a great default setting for most mixes.',
    'Our recommendation for most producers is the mid-tier bundle.',
    'The manufacturer recommends 8GB of RAM.',
    'Testing shows the plugin uses minimal CPU.',
  ];
  for (const line of negatives) {
    assert.deepEqual(firstPersonExperienceHits(line), [], `unexpected hit for: ${line}`);
  }
});

test('firstPersonExperienceHits reports 1-indexed line numbers', () => {
  const markdown = 'line one\nline two\nI recommend this plugin\nline four';
  const hits = firstPersonExperienceHits(markdown);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 3);
});

test('firstPersonExperienceHits returns empty for empty/undefined input', () => {
  assert.deepEqual(firstPersonExperienceHits(''), []);
  assert.deepEqual(firstPersonExperienceHits(undefined), []);
});

// --- unit tests: publishedDealBodyTooThin -------------------------------

function longParagraph(words) {
  return Array.from({ length: words }, (_, i) => `word${i}`).join(' ');
}

test('publishedDealBodyTooThin is true for a stub article (jd-800 shape)', () => {
  const markdown = `
<div class="video-embed"><iframe title="demo"></iframe></div>
## Related Guides

- [Best Plugin Bundle Deals](/posts/best-plugin-bundle-deals/)

---

*This post contains affiliate links. We may earn a small commission at no extra cost to you.*
`;
  assert.equal(publishedDealBodyTooThin(markdown), true);
});

test('publishedDealBodyTooThin is false for a substantial article', () => {
  const markdown = `
**TL;DR:** ${longParagraph(40)}

## What It Does

${longParagraph(60)}

## Use Cases

${longParagraph(60)}

## Related Guides

- [Some Other Post](/posts/other/)

---

*This post contains affiliate links. We may earn a small commission at no extra cost to you.*
`;
  assert.equal(publishedDealBodyTooThin(markdown), false);
});

test('publishedDealBodyTooThin is true when word count is high but headings are under 2', () => {
  const markdown = `## Only One Heading\n\n${longParagraph(200)}`;
  assert.equal(publishedDealBodyTooThin(markdown), true);
});

test('publishedDealBodyTooThin does not count HTML embeds or the disclosure line as body words', () => {
  const markdown = `
<div class="video-embed"><iframe title="a very long title that would pad the word count if counted"></iframe></div>

## Heading One

${longParagraph(80)}

## Heading Two

${longParagraph(80)}

*This post contains affiliate links. We may earn a small commission at no extra cost to you.*
`;
  assert.equal(publishedDealBodyTooThin(markdown), false);
});

// --- corpus tests: every published article -----------------------------

function stripFrontmatter(raw) {
  if (!raw.startsWith('---')) return { frontmatter: '', body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { frontmatter: '', body: raw };
  return { frontmatter: raw.slice(3, end), body: raw.slice(end + 4) };
}

function frontmatterField(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^"(.*)"$/, '$1') : undefined;
}

function loadPublishedPosts() {
  return fs
    .readdirSync(BLOG_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const slug = name.slice(0, -3);
      const raw = fs.readFileSync(path.join(BLOG_DIR, name), 'utf-8');
      const { frontmatter, body } = stripFrontmatter(raw);
      return {
        slug,
        body,
        draft: frontmatterField(frontmatter, 'draft') === 'true',
        dealPrice: frontmatterField(frontmatter, 'dealPrice'),
        evergreen: frontmatterField(frontmatter, 'evergreen') === 'true',
      };
    })
    .filter((post) => !post.draft);
}

test('no published article contains a first-person-experience claim (outside ALLOWLIST)', () => {
  const posts = loadPublishedPosts();
  assert.ok(posts.length > 50, 'sanity check: expected the full published corpus, not a subset');
  const offenders = [];
  for (const post of posts) {
    const allowed = ALLOWLIST[post.slug];
    if (allowed && allowed.check === 'firstPersonExperienceHits') continue;
    const hits = firstPersonExperienceHits(post.body);
    if (hits.length > 0) {
      offenders.push(`${post.slug}:${hits.map((h) => h.line).join(',')}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('no published deal article has a too-thin body (outside ALLOWLIST)', () => {
  const posts = loadPublishedPosts().filter((post) => post.dealPrice && !post.evergreen);
  assert.ok(posts.length > 0, 'sanity check: expected at least one deal article');
  const offenders = [];
  for (const post of posts) {
    const allowed = ALLOWLIST[post.slug];
    if (allowed && allowed.check === 'publishedDealBodyTooThin') continue;
    if (publishedDealBodyTooThin(post.body)) {
      offenders.push(post.slug);
    }
  }
  assert.deepEqual(offenders, []);
});

test('every ALLOWLIST entry has a reason and a tracking reference', () => {
  for (const [slug, entry] of Object.entries(ALLOWLIST)) {
    assert.ok(entry.reason, `${slug} allowlist entry is missing a reason`);
    assert.ok(entry.check, `${slug} allowlist entry is missing a check name`);
    assert.ok(entry.trackedIn, `${slug} allowlist entry is missing a trackedIn reference`);
  }
});
