#!/usr/bin/env node --experimental-strip-types --no-warnings
/**
 * Proves every field the plugin shows an editor actually reaches the site.
 *
 * The failure this guards against is silent and nasty: a field whose `path`
 * no longer resolves against the copy tree still renders fine in wp-admin.
 * The client types into it, saves, sees "Updated", and the site does not
 * change. Nothing errors, nothing logs, and the bug looks like "the CMS is
 * broken" weeks later.
 *
 * So rather than trusting that the generator and the overlay agree, this
 * fills in every field with a unique marker and checks each one comes out
 * the far end at the right place.
 *
 * Run: node scripts/wp-page-editor/verify.mjs
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildManifest, isSkippedPath, SKIP_PATHS, SKIP_KEYS } from './manifest.mjs';
import { overlay } from '../../src/services/wordpress/page-copy-overlay.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const seed = JSON.parse(readFileSync(path.join(root, 'src/content/seed/pages.json'), 'utf8'));
const pages = buildManifest(seed);

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL  ${msg}`);
};
const ok = (msg) => console.log(`  ok    ${msg}`);
/** Reports `good` when the condition holds, `bad` when it does not. */
const assert = (condition, good, bad) => (condition ? ok(good) : fail(bad));

/** Reads `a.b[0].c` out of a tree. Returns the sentinel if any step is missing. */
const MISSING = Symbol('missing');
function read(tree, dotted) {
  let node = tree;
  for (const segment of dotted.split('.')) {
    for (const [, name, index] of segment.matchAll(/([^[]+)|\[(\d+)\]/g)) {
      const key = name ?? Number(index);
      if (node === null || typeof node !== 'object' || !(key in node)) return MISSING;
      node = node[key];
    }
  }
  return node;
}

/** Writes `a.b[0].c`, mirroring redi_pages_set_path() in the plugin. */
function write(tree, dotted, value) {
  const segments = [];
  for (const segment of dotted.split('.')) {
    for (const [, name, index] of segment.matchAll(/([^[]+)|\[(\d+)\]/g)) {
      segments.push(name ?? Number(index));
    }
  }
  const last = segments.pop();
  let node = tree;
  for (const segment of segments) {
    if (typeof node[segment] !== 'object' || node[segment] === null) node[segment] = {};
    node = node[segment];
  }
  node[last] = value;
}

console.log('\nREDI Page Editor - field coverage\n');

/* ---- 1. Every field points at copy that exists ------------------------- */
const total = Object.values(pages).reduce((n, p) => n + p.fields.length, 0);
let unresolved = 0;
let mistyped = 0;
for (const [page, body] of Object.entries(pages)) {
  for (const field of body.fields) {
    const actual = read(seed[page], field.path);
    if (actual === MISSING) {
      fail(`${page}.${field.path} does not exist in the seed`);
      unresolved++;
      continue;
    }
    const expected = field.type === 'list' ? 'array' : 'string';
    const got = Array.isArray(actual) ? 'array' : typeof actual;
    if (got !== expected) {
      fail(`${page}.${field.path} is ${got} in the seed, field is declared ${field.type}`);
      mistyped++;
    }
  }
}
if (!unresolved) ok(`all ${total} field paths resolve against the seed`);
if (!mistyped) ok('every field type matches the copy it points at');

/* ---- 2. Nothing editable is left out ----------------------------------- */
const editableLeaves = (node, at = '') => {
  if (Array.isArray(node)) {
    if (node.length > 0 && node.every((v) => typeof v === 'string')) return [at];
    return node.flatMap((v, i) => editableLeaves(v, `${at}[${i}]`));
  }
  if (node && typeof node === 'object') {
    return Object.entries(node)
      .filter(([k]) => !SKIP_KEYS.has(k))
      .flatMap(([k, v]) => editableLeaves(v, at ? `${at}.${k}` : k));
  }
  return typeof node === 'string' ? [at] : [];
};
const missed = [];
for (const [page, body] of Object.entries(seed)) {
  if (!pages[page]) continue;
  const covered = new Set(pages[page].fields.map((f) => f.path));
  for (const leaf of editableLeaves(body)) {
    if (covered.has(leaf) || isSkippedPath(page, leaf)) continue;
    missed.push(`${page}.${leaf}`);
  }
}
if (missed.length === 0) ok('no editable copy is missing a field');
else fail(`copy with no field in wp-admin: ${missed.join(', ')}`);

/* ---- 3. Field names are unique and legal ACF names --------------------- */
const names = Object.values(pages).flatMap((p) => p.fields.map((f) => f.name));
const dupes = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
assert(
  dupes.length === 0,
  `all ${names.length} field names unique`,
  `duplicate field names (one would overwrite the other): ${dupes.join(', ')}`,
);
const illegal = names.filter((n) => !/^[a-z][a-z0-9_]*$/.test(n));
assert(
  illegal.length === 0,
  'all field names are valid ACF meta keys',
  `invalid field names: ${illegal.join(', ')}`,
);

/* ---- 4. Fill in everything; every marker must reach the site ----------- */
const payload = {};
const expectedAt = [];
for (const [page, body] of Object.entries(pages)) {
  for (const field of body.fields) {
    const marker = `EDITED::${field.name}`;
    const value = field.type === 'list' ? [`${marker}::a`, `${marker}::b`] : marker;
    write(payload, `${page}.${field.path}`, value);
    expectedAt.push({ at: `${page}.${field.path}`, value });
  }
}
const merged = overlay(JSON.parse(JSON.stringify(seed)), payload);
const notLanded = expectedAt.filter(
  ({ at, value }) => JSON.stringify(read(merged, at)) !== JSON.stringify(value),
);
assert(
  notLanded.length === 0,
  `all ${expectedAt.length} fields reach the site when filled in`,
  `${notLanded.length} field(s) typed in wp-admin would change nothing on the site:\n` +
    notLanded.map((f) => `          ${f.at}`).join('\n'),
);

// Editing everything must not change the SHAPE of the tree, only the words.
// A block of prose is the one exception: how many paragraphs it has is the
// editor's decision, so a string list's length is not part of the shape.
const shape = (node) => {
  if (Array.isArray(node)) {
    return node.every((v) => typeof v === 'string') ? '[prose]' : `[${node.map(shape).join(',')}]`;
  }
  if (node && typeof node === 'object') {
    return `{${Object.keys(node)
      .sort()
      .map((k) => `${k}:${shape(node[k])}`)
      .join(',')}}`;
  }
  return typeof node;
};
assert(
  shape(merged) === shape(seed),
  'editing every field leaves the page structure identical',
  'editing every field changed the structure of the copy tree',
);

// setPassword is deliberately not editable; it must survive untouched.
assert(
  JSON.stringify(merged.setPassword) === JSON.stringify(seed.setPassword),
  'setPassword flow untouched (deliberately not editable)',
  'setPassword was modified',
);

/* ---- 5. Deliberately excluded copy must still be dead ------------------- */
// If a component starts rendering one of these, the client has no way to edit
// it and nobody would notice, so the exclusion is re-checked here rather than
// trusted. Name-level, which is enough: a key nothing mentions is unreachable.
const { readdirSync, statSync } = await import('node:fs');
const sources = [];
const collect = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collect(full);
    else if (/\.(astro|ts|tsx|mjs)$/.test(entry)) sources.push(full);
  }
};
collect(path.join(root, 'src'));
const codeBlob = sources
  .filter((f) => !f.endsWith(path.join('seed', 'pages.json')))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

const revived = [];
for (const skip of SKIP_PATHS) {
  const leaf = skip.split('.').pop();
  if (new RegExp(`\\b${leaf}\\b`).test(codeBlob)) revived.push(skip);
}
assert(
  revived.length === 0,
  `${SKIP_PATHS.size} excluded path(s) confirmed still unrendered`,
  'copy excluded as unrendered is now referenced in src - it needs a field again:\n' +
    revived.map((r) => `          ${r}`).join('\n'),
);

/* ---- 6. The plugin's own PHP must expand paths the same way ------------- */
const phpBin = (() => {
  try {
    execFileSync('php', ['--version'], { stdio: 'ignore' });
    return 'php';
  } catch {
    return null;
  }
})();

if (!phpBin) {
  console.log('  skip  PHP not installed - cannot cross-check redi_pages_set_path()');
} else {
  const harness = `<?php
define('ABSPATH', __DIR__);
function add_action(){} function add_filter(){} function register_activation_hook(){}
function get_option($k,$d=false){return $d;} function update_option(){}
function get_post(){return null;} function get_page_by_path(){return null;}
function wp_insert_post(){return 0;} function is_wp_error(){return false;}
function rest_ensure_response($r){return $r;} function register_rest_route(){}
function __return_true(){return true;}
require $argv[1];
$out = array();
foreach (redi_pages_manifest() as $key => $page) {
  foreach ($page['fields'] as $f) {
    $marker = 'EDITED::' . $f['name'];
    $value = ('list' === $f['type']) ? array($marker . '::a', $marker . '::b') : $marker;
    redi_pages_set_path($out, $key . '.' . $f['path'], $value);
  }
}
echo json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
`;
  const harnessPath = path.join(
    process.env.TMPDIR ?? '/tmp',
    `redi-page-editor-harness-${process.pid}.php`,
  );
  const { writeFileSync, unlinkSync } = await import('node:fs');
  writeFileSync(harnessPath, harness);
  try {
    const fromPhp = JSON.parse(
      execFileSync(phpBin, [
        harnessPath,
        path.join(root, 'wordpress-plugins/redi-page-editor/redi-page-editor.php'),
      ]).toString(),
    );
    const phpMerged = overlay(JSON.parse(JSON.stringify(seed)), fromPhp);
    assert(
      JSON.stringify(phpMerged) === JSON.stringify(merged),
      `the plugin's PHP expands all ${total} paths identically to this check`,
      "the plugin's PHP produces a different tree than this check expects",
    );
  } finally {
    unlinkSync(harnessPath);
  }
}

console.log(`\n${failures === 0 ? 'PASS' : `FAIL (${failures})`}\n`);
process.exit(failures === 0 ? 0 : 1);
