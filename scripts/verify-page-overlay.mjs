#!/usr/bin/env node --experimental-strip-types --no-warnings
/**
 * Proves the WordPress page overlay cannot lose approved copy.
 *
 * Why this script exists
 * ----------------------
 * `redi/v1/page-copy` was merged with WordPress winning outright. It served a
 * frozen export, so for over a month every copy change made in this repo was
 * silently discarded at render time and nobody noticed, because the page still
 * rendered - just with older words (docs/WORDPRESS_INTEGRATION.md 6.2.1).
 *
 * The replacement overlays instead of replacing, which turns that failure into
 * a no-op. These assertions are the guard rail on that rule. The one that
 * matters most is BLANK: an editor who opens a page in wp-admin and saves it
 * without typing anything must not blank a single word on the site.
 *
 * Run: node scripts/verify-page-overlay.mjs
 */

import { overlay } from '../src/services/wordpress/page-copy-overlay.ts';
import { readFileSync } from 'node:fs';

const seed = JSON.parse(readFileSync(new URL('../src/content/seed/pages.json', import.meta.url)));

let failures = 0;
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${name}`);
  if (!ok) {
    console.log(`          expected ${e}`);
    console.log(`          actual   ${a}`);
  }
};

const clone = (v) => JSON.parse(JSON.stringify(v));

console.log('\nREDI page overlay\n');

/* ---- 1. Nothing from WordPress leaves the site exactly as approved ------- */
console.log('route absent or WordPress unreachable');
for (const remote of [null, undefined, {}, '', 0, [], 'not an object']) {
  check(`wpFetch -> ${JSON.stringify(remote) ?? 'undefined'}`, overlay(clone(seed), remote), seed);
}

/* ---- 2. A blank save must change nothing --------------------------------- */
console.log('\nan editor saves a page without typing anything');
// What the plugin itself sends: it drops empty fields server-side.
check('plugin omits empty fields', overlay(clone(seed), { home: {} }), seed);
// And if it ever stopped doing that, the client side still has to hold.
const blanked = {
  home: {
    hero: { headline: '', paragraphs: [], ctaPrimary: { label: '   ' } },
    statementOfValue: { heading: null, paragraphs: ['', '  '] },
  },
  about: { hero: { headline: '' } },
};
check('empty strings, blank lists and nulls all ignored', overlay(clone(seed), blanked), seed);

/* ---- 3. Real edits do come through -------------------------------------- */
console.log('\nan editor changes copy');
const edited = overlay(clone(seed), {
  home: {
    hero: { headline: 'A New Headline', paragraphs: ['One.', 'Two.'] },
    ctaInvest: { ctaLabel: 'Start Now' },
  },
  legal: { hero: { heading: 'Legal Notices' } },
});
check('home headline', edited.home.hero.headline, 'A New Headline');
check('home hero paragraphs replaced whole', edited.home.hero.paragraphs, ['One.', 'Two.']);
check('home CTA label', edited.home.ctaInvest.ctaLabel, 'Start Now');
check('a second page edits independently', edited.legal.hero.heading, 'Legal Notices');
check(
  'untouched sibling keeps approved copy',
  edited.home.statementOfValue,
  seed.home.statementOfValue,
);
check('untouched page keeps approved copy', edited.about, seed.about);
check('non-copy keys survive', edited.home.hero.ctaPrimary.href, seed.home.hero.ctaPrimary.href);

/* ---- 4. Lists of objects keep their length ------------------------------ */
console.log('\nstructured lists (process steps, value comparison)');
const objectList = (() => {
  for (const [section, value] of Object.entries(seed.approach)) {
    if (!value || typeof value !== 'object') continue;
    for (const [key, items] of Object.entries(value)) {
      if (Array.isArray(items) && items.length > 1 && items[0] && typeof items[0] === 'object') {
        // Read the field name off the seed rather than assuming one. Asserting
        // an invented key like `title` would fail here for the right reason -
        // the overlay refuses keys the seed does not have - and that is a
        // confusing way to find out the shape changed.
        const field = Object.keys(items[0]).find((k) => typeof items[0][k] === 'string');
        if (field) return { section, key, field, items };
      }
    }
  }
  return null;
})();

if (!objectList) {
  failures++;
  console.log('  FAIL  no list of objects found under approach - check the seed shape');
} else {
  const { section, key, field, items: before } = objectList;
  console.log(`        (using approach.${section}.${key}[].${field})`);

  // Editing ONE row without touching the others is the sparse form: PHP sends
  // an object keyed by index when only some rows were filled in. A real array
  // means "here is the whole list", which may add or remove rows - see 4b.
  const one = overlay(clone(seed), {
    approach: { [section]: { [key]: { 0: { [field]: 'Edited Item One' } } } },
  }).approach[section][key];
  check('item 0 edited', one[0][field], 'Edited Item One');
  check('length unchanged', one.length, before.length);
  check('later items untouched', one.slice(1), before.slice(1));
  check(
    'other keys of item 0 untouched',
    { ...one[0], [field]: null },
    {
      ...before[0],
      [field]: null,
    },
  );

  // PHP json_encodes a sparse array as an object with numeric string keys,
  // which is what arrives when an editor fills item 2 and not item 1.
  const sparse = overlay(clone(seed), {
    approach: { [section]: { [key]: { 1: { [field]: 'Only The Second' } } } },
  }).approach[section][key];
  check('sparse object form: item 1 edited', sparse[1][field], 'Only The Second');
  check('sparse object form: item 0 untouched', sparse[0], before[0]);
  check('sparse object form: length unchanged', sparse.length, before.length);

  // An editor cannot add rows: the count is layout, not copy.
  const extra = overlay(clone(seed), {
    approach: { [section]: { [key]: { 99: { [field]: 'Smuggled Row' } } } },
  }).approach[section][key];
  check('an out-of-range item is not appended', extra.length, before.length);
  check('and its text appears nowhere', JSON.stringify(extra).includes('Smuggled Row'), false);
}

/* ---- 4b. Editors can now add and remove rows ---------------------------- */
console.log('\nadding and removing rows (the whole list typed in one box)');
if (objectList) {
  const { section, key, field, items: before } = objectList;
  const asList = (rows) =>
    overlay(clone(seed), { approach: { [section]: { [key]: rows } } }).approach[section][key];

  // Fewer rows than the seed: the list shrinks.
  const shrunk = asList([{ [field]: 'Only Row' }]);
  check('a shorter list removes rows', shrunk.length, 1);
  check('the surviving row keeps the edit', shrunk[0][field], 'Only Row');

  // More rows than the seed: the list grows, and the extra rows still carry
  // every key the components dereference.
  const grown = asList(
    before.map((r) => ({ [field]: r[field] })).concat([{ [field]: 'Brand New Row' }]),
  );
  check('a longer list adds rows', grown.length, before.length + 1);
  check('the new row carries the edit', grown[grown.length - 1][field], 'Brand New Row');
  check(
    'the new row has every key the seed items have',
    Object.keys(grown[grown.length - 1]).sort(),
    Object.keys(before[0]).sort(),
  );
  check(
    'no key on a new row is null or undefined',
    Object.values(grown[grown.length - 1]).filter((v) => v === null || v === undefined).length,
    0,
  );

  // An empty list is still "no change", never "wipe the section".
  check('an empty list changes nothing', asList([]), before);
  check('a list of junk changes nothing', asList(['nope', 42, null]), before);
}

/* ---- 5. A malformed payload can never reshape the site ------------------ */
console.log('\nmalformed or hostile payload');
const junk = overlay(clone(seed), {
  home: {
    hero: {
      headline: { nope: 1 }, // wrong type for a string
      paragraphs: 'not a list',
      invented: 'should never appear',
    },
    invented: 'should never appear',
  },
  invented: 'should never appear',
});
check('wrong type for a string ignored', junk.home.hero.headline, seed.home.hero.headline);
check('wrong type for a list ignored', junk.home.hero.paragraphs, seed.home.hero.paragraphs);
check('invented keys not added', JSON.stringify(junk).includes('should never appear'), false);
check('shape identical to the seed', Object.keys(junk).sort(), Object.keys(seed).sort());
check('every page still present', Object.keys(junk.home).sort(), Object.keys(seed.home).sort());

/* ---- 6. The result is always renderable --------------------------------- */
console.log('\nno page can render undefined');
const leaves = (node, path = '') => {
  if (node === null || node === undefined) return [path];
  if (Array.isArray(node)) return node.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (typeof node === 'object')
    return Object.entries(node).flatMap(([k, v]) => leaves(v, `${path}.${k}`));
  return [];
};
check('no null/undefined leaves after a partial merge', leaves(edited), []);

console.log(`\n${failures === 0 ? 'PASS' : `FAIL (${failures})`}\n`);
process.exit(failures === 0 ? 0 : 1);
