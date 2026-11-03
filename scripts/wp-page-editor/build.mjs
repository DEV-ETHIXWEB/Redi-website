#!/usr/bin/env node
/**
 * Generates the REDI Page Editor WordPress plugin from the approved copy.
 *
 * Why generate it
 * ---------------
 * The plugin needs one ACF field definition per editable string on the site -
 * 125 of them. Kept by hand they would drift from the site the first time the
 * copy changed shape, and a field whose path no longer resolves fails silently:
 * the editor types, saves, and nothing happens. Deriving them from the same
 * file the site renders means the two cannot disagree, and regenerating is how
 * a new field gets added.
 *
 * Usage
 * -----
 *   node scripts/wp-page-editor/build.mjs          # write the plugin + report
 *   node scripts/wp-page-editor/build.mjs --check  # fail if it is out of date
 *   node scripts/wp-page-editor/build.mjs --zip    # also package for upload
 *
 * After changing src/content/seed/pages.json, run it without flags, commit the
 * result, then re-upload the plugin in wp-admin so the new field appears.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildManifest } from './manifest.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const SEED = path.join(root, 'src/content/seed/pages.json');
const TEMPLATE = path.join(root, 'scripts/wp-page-editor/plugin.template.php');
const OUT_DIR = path.join(root, 'wordpress-plugins/redi-page-editor');
const OUT = path.join(OUT_DIR, 'redi-page-editor.php');

/** Single-quoted PHP string literal. */
function phpStr(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function renderManifest(pages) {
  const lines = [];
  for (const [key, page] of Object.entries(pages)) {
    lines.push(`\t\t${phpStr(key)} => array(`);
    lines.push(`\t\t\t'label'  => ${phpStr(page.label)},`);
    lines.push(`\t\t\t'slug'   => ${phpStr(`redi-${key}`)},`);
    lines.push(`\t\t\t'fields' => array(`);
    for (const f of page.fields) {
      const def = f.type === 'list' ? f.value.join('\n\n') : f.value;
      lines.push(
        `\t\t\t\tarray( 'name' => ${phpStr(f.name)}, 'path' => ${phpStr(f.path)}, ` +
          `'type' => ${phpStr(f.type)}, 'label' => ${phpStr(f.label)}, 'default' => ${phpStr(def)} ),`,
      );
    }
    lines.push(`\t\t\t),`);
    lines.push(`\t\t),`);
  }
  return lines.join('\n');
}

const seed = JSON.parse(readFileSync(SEED, 'utf8'));
const pages = buildManifest(seed);
/** Human-readable plugin version, shown in wp-admin. Bump by hand for real releases. */
const VERSION = '2.0.1';

const manifestPhp = renderManifest(pages);
// Fingerprint the field list: any change to the editable copy changes the
// version, which is what makes the plugin re-check its pages after an in-place
// update. See REDI_PAGES_VERSION in the template.
const fingerprint = createHash('sha256').update(JSON.stringify(pages)).digest('hex').slice(0, 8);

const php = readFileSync(TEMPLATE, 'utf8')
  .replace('__MANIFEST__', () => manifestPhp)
  .replaceAll('__VERSION_FINGERPRINT__', `${VERSION}+${fingerprint}`)
  .replaceAll('__VERSION__', VERSION);

const total = Object.values(pages).reduce((n, p) => n + p.fields.length, 0);
const names = Object.values(pages).flatMap((p) => p.fields.map((f) => f.name));
const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
if (duplicates.length > 0) {
  // Two paths collapsing to one ACF name would make one field overwrite the
  // other, so this is fatal rather than a warning.
  console.error(`duplicate field names: ${[...new Set(duplicates)].join(', ')}`);
  process.exit(1);
}

if (process.argv.includes('--check')) {
  const current = (() => {
    try {
      return readFileSync(OUT, 'utf8');
    } catch {
      return null;
    }
  })();
  if (current !== php) {
    console.error(
      'wordpress-plugins/redi-page-editor is out of date with src/content/seed/pages.json.\n' +
        'Run: node scripts/wp-page-editor/build.mjs',
    );
    process.exit(1);
  }
  console.log(`up to date (${total} fields)`);
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, php);

console.log(`\nREDI Page Editor\n`);
console.log(`  ${Object.keys(pages).length} pages, ${total} editable fields`);
for (const page of Object.values(pages)) {
  const lists = page.fields.filter((f) => f.type === 'list').length;
  console.log(
    `    ${page.label.padEnd(9)} ${String(page.fields.length).padStart(3)} fields` +
      (lists ? `  (${lists} prose block${lists > 1 ? 's' : ''})` : ''),
  );
}
console.log(`\n  -> ${path.relative(root, OUT)}`);

if (process.argv.includes('--zip')) {
  const zip = path.join(root, 'wordpress-plugins/redi-page-editor.zip');
  execFileSync('zip', ['-qr', zip, 'redi-page-editor'], {
    cwd: path.join(root, 'wordpress-plugins'),
  });
  console.log(`  -> ${path.relative(root, zip)}  (upload this in wp-admin)`);
}
console.log('');
