/**
 * Derives the editable-field manifest from the approved copy.
 *
 * Pure: no file IO, no output. `build.mjs` turns this into the plugin;
 * `verify.mjs` checks every field it produces against the seed. Keeping it
 * importable is what lets the verification run without regenerating anything.
 */

/** Internal auth flow, not marketing copy. */
const SKIP_PAGES = new Set(['setPassword']);
/** Links and assets. Exposing a URL or an icon name to a copy editor invites a
 *  broken page, and neither is text they are being asked to write. */
const SKIP_KEYS = new Set(['href', 'url', 'image', 'icon', 'alt']);

/**
 * Copy that sits in pages.json but is not rendered by anything.
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
]);

/** True when a path is excluded outright, or sits under an excluded section. */
export function isSkippedPath(page, leafPath) {
  const full = `${page}.${leafPath}`;
  for (const skip of SKIP_PATHS) {
    if (full === skip || full.startsWith(`${skip}.`) || full.startsWith(`${skip}[`)) return true;
  }
  return false;
}

export { SKIP_PATHS, SKIP_KEYS };

const PAGE_LABELS = {
  home: 'Home',
  about: 'About',
  approach: 'Approach',
  contact: 'Contact',
  sites: 'Sites',
  updates: 'Updates',
  legal: 'Legal',
};

/**
 * Words that camelCase splitting gets wrong. These labels are what the client
 * reads in wp-admin, so `Redi Score` and `Cta Invest` are worth fixing.
 */
const WORD_FIXES = {
  cta: 'CTA',
  redi: 'REDI',
  url: 'URL',
  doesnt: "Doesn't",
  isnt: "Isn't",
};
/** Lowercased mid-label, the way a title normally is. */
const MINOR_WORDS = new Set(['of', 'the', 'and', 'a', 'an', 'to', 'for', 'in', 'on']);

/** `ctaPrimary` -> `CTA Primary`, `items[0]` -> `Items 1` (editors count from 1). */
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

/** Collects every editable leaf, recording the path back into the copy tree. */
function walk(node, pathSoFar, out) {
  if (Array.isArray(node)) {
    if (node.length > 0 && node.every((v) => typeof v === 'string')) {
      // A block of prose. One textarea, split on blank lines, because the
      // number of paragraphs is the editor's call.
      out.push({ path: pathSoFar, type: 'list', value: node });
      return;
    }
    // A list of objects: the count is layout (five readiness categories, two
    // comparison columns), so each item's fields are exposed individually and
    // the list cannot be grown or shrunk from wp-admin.
    node.forEach((item, i) => walk(item, `${pathSoFar}[${i}]`, out));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (SKIP_KEYS.has(key)) continue;
      walk(value, pathSoFar ? `${pathSoFar}.${key}` : key, out);
    }
    return;
  }
  if (typeof node === 'string') {
    out.push({ path: pathSoFar, type: node.length > 120 ? 'textarea' : 'text', value: node });
  }
}

export function buildManifest(seed) {
  const pages = {};
  for (const [page, body] of Object.entries(seed)) {
    if (SKIP_PAGES.has(page)) continue;
    const found = [];
    walk(body, '', found);
    const fields = found.filter((f) => !isSkippedPath(page, f.path));
    for (const field of fields) {
      field.name = `${page}.${field.path}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      field.label = field.path.split('.').map(humanise).join(' / ');
    }
    pages[page] = { label: PAGE_LABELS[page] ?? page, fields };
  }
  return pages;
}
