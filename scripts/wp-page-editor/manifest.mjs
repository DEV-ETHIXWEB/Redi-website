/**
 * Derives the editable-field manifest from the approved copy.
 *
 * Pure: no file IO, no output. `build.mjs` turns this into the plugin;
 * `verify.mjs` checks every field it produces against the seed. Keeping it
 * importable is what lets the verification run without regenerating anything.
 */

/**
 * Keys that are never shown to an editor.
 *
 * Links and assets, because handing a copy editor a URL or an icon name
 * invites a broken page and none of it is text they were asked to write; and
 * machine keys (`id`, `tier`, `color`, `slug`), because components look values
 * up by them - `iconMap[advantage.icon]`, the badge image per tier - and a
 * typo there removes an icon or a badge with no warning.
 */
const SKIP_KEYS = new Set(['href', 'url', 'image', 'icon', 'alt', 'id', 'tier', 'color', 'slug']);

/**
 * Copy that sits in the seed but is not rendered by anything.
 *
 * Verified 2026-11-04: each key below appears nowhere in src/ outside the seed
 * itself. `SitesBrowser` takes no props and hardcodes its own map-toolbar
 * labels, and no component reads a results-label template.
 *
 * These are excluded because a field that silently does nothing is worse than
 * no field at all: the client types into it, saves, sees "Updated", and the
 * page does not change - which looks exactly like a broken CMS. If a component
 * starts rendering one of these, delete the line and regenerate.
 *
 * scripts/wp-page-editor/verify.mjs re-checks this list on every run, so a key
 * that becomes live again is reported rather than quietly left out.
 */
const SKIP_PATHS = new Set([
  'sites.resultsLabelTemplate',
  'sites.favorites',
  'sites.toolbar',
  'updates.resultsLabelTemplate',
  // The stats bar ($2.5B+, 150+, 45, 95%) the client had removed from the home
  // page on 2026-10-16. The figures stay in the seed so the bar can be put back
  // in one line, but nothing renders them today - see src/pages/index.astro.
  'siteSettings.stats',
]);

/**
 * Lists whose LENGTH is structure rather than copy, so rows cannot be added or
 * removed from wp-admin. Their text is still fully editable.
 *
 *  - the five scoring weights are the national standard and must total 100%;
 *  - the five designation levels are the programme itself, and each carries a
 *    badge image that only exists for those five;
 *  - the legal sections are fixed documents, and /legal#terms-of-use style
 *    anchors point at them;
 *  - nav and footer links need an href, which editors are not given, so a new
 *    row could only ever point at the wrong page.
 */
const FIXED_LENGTH = new Set([
  'scoringCriteria.weights',
  'scoreTiers',
  'legalSections',
  'siteSettings.primaryNav',
  'siteSettings.footer.sitemap',
]);

/**
 * One wp-admin screen per entry.
 *
 * `source` is the seed file; `root` picks a sub-tree out of it (pages.json
 * holds all seven marketing pages). `key` is both the ACF field-name prefix
 * and the top-level key in the REST response, which is why the legal sections
 * are `legalSections` rather than `legal` - `legal` is already the Legal page.
 */
const SCREENS = [
  { key: 'home', label: 'Home', source: 'pages.json', root: 'home' },
  { key: 'about', label: 'About', source: 'pages.json', root: 'about' },
  { key: 'approach', label: 'Approach', source: 'pages.json', root: 'approach' },
  { key: 'contact', label: 'Contact', source: 'pages.json', root: 'contact' },
  { key: 'sites', label: 'Sites', source: 'pages.json', root: 'sites' },
  { key: 'updates', label: 'Updates', source: 'pages.json', root: 'updates' },
  { key: 'legal', label: 'Legal', source: 'pages.json', root: 'legal' },
  { key: 'advantages', label: 'Why Choose Cards', source: 'advantages.json' },
  { key: 'legalSections', label: 'Legal Sections', source: 'legal.json' },
  { key: 'scoreTiers', label: 'REDI Score Tiers', source: 'score-tiers.json' },
  { key: 'coreDocuments', label: 'Core Documents', source: 'core-documents.json' },
  { key: 'scoringCriteria', label: 'Scoring Criteria', source: 'scoring-criteria.json' },
  { key: 'siteSettings', label: 'Site Settings', source: 'site-settings.json' },
];

/** `ctaPrimary` -> `CTA Primary`, `items[0]` -> `Items 1` (editors count from 1). */
const WORD_FIXES = { cta: 'CTA', redi: 'REDI', url: 'URL', doesnt: "Doesn't", isnt: "Isn't" };
const MINOR_WORDS = new Set(['of', 'the', 'and', 'a', 'an', 'to', 'for', 'in', 'on']);

function humanise(segment) {
  return segment
    .replace(/\[(\d+)\]/g, (_, n) => ` ${Number(n) + 1}`)
    .replace(/(?!^)(?=[A-Z])/g, ' ')
    .replace(/_/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (WORD_FIXES[lower]) return WORD_FIXES[lower];
      if (i > 0 && MINOR_WORDS.has(lower)) return lower;
      return lower.replace(/^./, (c) => c.toUpperCase());
    })
    .join(' ');
}

/** True when a path is excluded outright, or sits under an excluded section. */
export function isSkippedPath(screenKey, leafPath) {
  const full = leafPath ? `${screenKey}.${leafPath}` : screenKey;
  for (const skip of SKIP_PATHS) {
    if (full === skip || full.startsWith(`${skip}.`) || full.startsWith(`${skip}[`)) return true;
  }
  return false;
}

/** The editable string keys of an object, in seed order. */
function editableKeys(item) {
  return Object.entries(item)
    .filter(([k, v]) => !SKIP_KEYS.has(k) && typeof v === 'string')
    .map(([k]) => k);
}

/**
 * A list of objects becomes ONE textarea - a block per row, blank line between
 * rows - when every row has the same one or two editable text fields and the
 * length is not structural. That is the only way to let an editor add or
 * remove rows: ACF here is the free edition, which has no Repeater field.
 *
 * Three or more fields per row would make the block format ambiguous to read
 * back, so those stay as one field per value with a fixed row count.
 */
function blockListFields(items, fullPath) {
  if (FIXED_LENGTH.has(fullPath)) return null;
  if (items.length === 0 || !items.every((i) => i && typeof i === 'object' && !Array.isArray(i))) {
    return null;
  }
  const keys = editableKeys(items[0]);
  if (keys.length < 1 || keys.length > 2) return null;
  const sameShape = items.every((i) => {
    const k = editableKeys(i);
    return k.length === keys.length && k.every((x, n) => x === keys[n]);
  });
  return sameShape ? keys : null;
}

/** Collects every editable leaf, recording the path back into the copy tree. */
function walk(node, pathSoFar, out, screenKey) {
  if (Array.isArray(node)) {
    if (node.length > 0 && node.every((v) => typeof v === 'string')) {
      // A block of prose, or a plain list. One textarea, split on blank lines,
      // because how many items there are is the editor's call.
      out.push({ path: pathSoFar, type: 'list', value: node });
      return;
    }
    const full = pathSoFar ? `${screenKey}.${pathSoFar}` : screenKey;
    const blockKeys = blockListFields(node, full);
    if (blockKeys) {
      out.push({ path: pathSoFar, type: 'blocklist', value: node, fields: blockKeys });
      return;
    }
    // Fixed-length list of objects: one field per value, rows cannot change.
    node.forEach((item, i) => walk(item, `${pathSoFar}[${i}]`, out, screenKey));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (SKIP_KEYS.has(key)) continue;
      walk(value, pathSoFar ? `${pathSoFar}.${key}` : key, out, screenKey);
    }
    return;
  }
  if (typeof node === 'string') {
    out.push({ path: pathSoFar, type: node.length > 120 ? 'textarea' : 'text', value: node });
  }
  // Numbers and booleans are deliberately not editable: the scoring weights are
  // the only ones, they must total 100%, and that is a programme decision.
}

/**
 * Builds the manifest.
 *
 * `seeds` maps a seed filename to its parsed contents, so this stays pure and
 * the verification can feed it the same files the site renders.
 */
export function buildManifest(seeds) {
  const screens = {};
  for (const screen of SCREENS) {
    const file = seeds[screen.source];
    if (file === undefined) throw new Error(`manifest: missing seed ${screen.source}`);
    const root = screen.root ? file[screen.root] : file;
    if (root === undefined) throw new Error(`manifest: ${screen.source} has no "${screen.root}"`);

    const found = [];
    walk(root, '', found, screen.key);
    const fields = found.filter((f) => !isSkippedPath(screen.key, f.path));

    for (const field of fields) {
      field.name = `${screen.key}${field.path ? `.${field.path}` : ''}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      field.label = field.path
        ? field.path.split('.').map(humanise).join(' / ')
        : humanise(screen.key);
    }
    // Kebab-case slug (redi-legal-sections, not redi-legalSections), and a
    // title that reads properly for the screens that are not marketing pages.
    const slug = 'redi-' + screen.key.replace(/(?!^)(?=[A-Z])/g, '-').toLowerCase();
    const isMarketingPage = screen.source === 'pages.json';
    screens[screen.key] = {
      label: screen.label,
      slug,
      title: `${screen.label}${isMarketingPage ? ' Page' : ''} (REDI)`,
      fields,
    };
  }
  return screens;
}

export { SKIP_PATHS, SKIP_KEYS, FIXED_LENGTH, SCREENS };
