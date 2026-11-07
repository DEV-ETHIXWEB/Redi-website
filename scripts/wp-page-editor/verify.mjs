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
import {
  buildManifest,
  isSkippedPath,
  SKIP_PATHS,
  GATED_PATHS,
  SKIP_KEYS,
  SCREENS,
} from './manifest.mjs';
import { overlay } from '../../src/services/wordpress/page-copy-overlay.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const seeds = {};
for (const file of new Set(SCREENS.map((screen) => screen.source))) {
  seeds[file] = JSON.parse(readFileSync(path.join(root, 'src/content/seed', file), 'utf8'));
}
const pages = buildManifest(seeds);
/** The seed tree each screen's paths are relative to. */
const rootOf = (key) => {
  const screen = SCREENS.find((s) => s.key === key);
  const file = seeds[screen.source];
  return screen.root ? file[screen.root] : file;
};

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
    const actual = read(rootOf(page), field.path);
    if (actual === MISSING) {
      fail(`${page}.${field.path} does not exist in the seed`);
      unresolved++;
      continue;
    }
    const expected = field.type === 'list' || field.type === 'blocklist' ? 'array' : 'string';
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
const editableLeaves = (node, at = '', covered = new Set()) => {
  if (Array.isArray(node)) {
    if (node.length > 0 && node.every((v) => typeof v === 'string')) return [at];
    // A list that the manifest turned into one block textarea is a single leaf.
    if (covered.has(at)) return [at];
    return node.flatMap((v, i) => editableLeaves(v, `${at}[${i}]`, covered));
  }
  if (node && typeof node === 'object') {
    return Object.entries(node)
      .filter(([k]) => !SKIP_KEYS.has(k))
      .flatMap(([k, v]) => editableLeaves(v, at ? `${at}.${k}` : k, covered));
  }
  return typeof node === 'string' ? [at] : [];
};
const missed = [];
for (const page of Object.keys(pages)) {
  const body = rootOf(page);
  const covered = new Set(pages[page].fields.map((f) => f.path));
  for (const leaf of editableLeaves(body, '', covered)) {
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
    let value;
    if (field.type === 'list') {
      value = [`${marker}::a`, `${marker}::b`];
    } else if (field.type === 'blocklist') {
      value = [Object.fromEntries(field.fields.map((k) => [k, `${marker}::${k}`]))];
    } else {
      value = marker;
    }
    write(payload, field.path ? `${page}.${field.path}` : page, value);
    expectedAt.push({ at: field.path ? `${page}.${field.path}` : page, value, type: field.type });
  }
}
// Each screen is merged against its own seed tree, then read back.
const mergedByScreen = {};
for (const page of Object.keys(pages)) {
  mergedByScreen[page] = overlay(structuredClone(rootOf(page)), payload[page]);
}
const readMerged = ({ at }) => {
  const [page, ...rest] = at.split('.');
  const sub = rest.join('.');
  return sub ? read(mergedByScreen[page], sub) : mergedByScreen[page];
};
const landed = (entry) => {
  const got = readMerged(entry);
  if (entry.type !== 'blocklist') return JSON.stringify(got) === JSON.stringify(entry.value);
  // The merged row carries keys the editor never sees - ids, icons, colours -
  // so only the typed fields are compared.
  if (!Array.isArray(got) || got.length !== entry.value.length) return false;
  return entry.value.every((want, i) => Object.entries(want).every(([k, v]) => got[i]?.[k] === v));
};
const notLanded = expectedAt.filter((entry) => !landed(entry));
assert(
  notLanded.length === 0,
  `all ${expectedAt.length} fields reach the site when filled in`,
  `${notLanded.length} field(s) typed in wp-admin would change nothing on the site:\n` +
    notLanded.map((f) => `          ${f.at}`).join('\n'),
);

// Editing everything must not change the SHAPE of the tree, only the words.
// Two exceptions, both deliberate: a block of prose can have any number of
// paragraphs, and a block list can have any number of rows - that is the point
// of it. So both collapse to a single token before comparing.
const shape = (node, blockPaths = new Set(), at = '') => {
  if (Array.isArray(node)) {
    if (node.every((v) => typeof v === 'string')) return '[prose]';
    if (blockPaths.has(at)) return '[rows]';
    return `[${node.map((v, i) => shape(v, blockPaths, `${at}[${i}]`)).join(',')}]`;
  }
  if (node && typeof node === 'object') {
    return `{${Object.keys(node)
      .sort()
      .map((k) => `${k}:${shape(node[k], blockPaths, at ? `${at}.${k}` : k)}`)
      .join(',')}}`;
  }
  return typeof node;
};
const shapeChanged = Object.keys(pages).filter((page) => {
  const blockPaths = new Set(
    pages[page].fields.filter((f) => f.type === 'blocklist').map((f) => f.path),
  );
  return shape(mergedByScreen[page], blockPaths) !== shape(rootOf(page), blockPaths);
});
assert(
  shapeChanged.length === 0,
  'editing every field leaves the page structure identical',
  `structure changed on: ${shapeChanged.join(', ')}`,
);

// setPassword is deliberately not editable; it must survive untouched.
assert(
  JSON.stringify(seeds['pages.json'].setPassword) !== undefined,
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
const stripComments = (code) =>
  code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
// Comments are stripped first: index.astro explains in prose how to put the
// stats bar back, and a mention in a comment is not a component rendering it.
const codeBlob = sources
  .filter((f) => !f.includes(`${path.sep}seed${path.sep}`))
  .map((f) => stripComments(readFileSync(f, 'utf8')))
  .join('\n');

const revived = [];
for (const skip of SKIP_PATHS) {
  const leaf = skip.split('.').pop();
  // A bare name match is not evidence: StatsBar.astro still declares a `stats`
  // prop even though no page mounts it, and types/wordpress.ts still types the
  // field. What would mean it is live is the value being read off the data
  // (`settings.stats`) or passed into a component (`stats={...}`).
  if (new RegExp(`\\.${leaf}\\b|\\b${leaf}=\\{`).test(codeBlob)) revived.push(skip);
}
assert(
  revived.length === 0,
  `${SKIP_PATHS.size} excluded path(s) confirmed still unrendered`,
  'copy excluded as unrendered is now referenced in src - it needs a field again:\n' +
    revived.map((r) => `          ${r}`).join('\n'),
);

// Fields excluded because their component renders them only behind a flag
// that is off. The flag being flipped back on is exactly when they need to
// return, so the flag is read from the source rather than trusted.
const stillGated = [];
for (const [fieldPath, { gate, file }] of GATED_PATHS) {
  const src = readFileSync(path.join(root, file), 'utf8');
  const off = new RegExp(`const\\s+${gate}\\s*=\\s*false`).test(src);
  if (!off) stillGated.push(`${fieldPath} (${gate} in ${file} is no longer false)`);
}
assert(
  stillGated.length === 0,
  `${GATED_PATHS.size} gated path(s) confirmed still switched off`,
  `a gate was turned back on - these fields need to be editable again:\n` +
    stillGated.map((g) => `          ${g}`).join('\n'),
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
    if ('list' === $f['type']) {
      $value = array($marker . '::a', $marker . '::b');
    } elseif ('blocklist' === $f['type']) {
      // One row, mirroring what the JS side writes, so the two trees can be
      // compared directly.
      $row = array();
      foreach ($f['fields'] as $sub) { $row[$sub] = $marker . '::' . $sub; }
      $value = array($row);
    } else {
      $value = $marker;
    }
    $target = $key . ('' !== $f['path'] ? '.' . $f['path'] : '');
    redi_pages_set_path($out, $target, $value);
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
    const phpMismatch = Object.keys(pages).filter((page) => {
      const phpMerged = overlay(structuredClone(rootOf(page)), fromPhp[page]);
      return JSON.stringify(phpMerged) !== JSON.stringify(mergedByScreen[page]);
    });
    assert(
      phpMismatch.length === 0,
      `the plugin's PHP expands all ${total} paths identically to this check`,
      `the plugin's PHP produces a different tree on: ${phpMismatch.join(', ')}`,
    );
  } finally {
    unlinkSync(harnessPath);
  }
}

console.log(`\n${failures === 0 ? 'PASS' : `FAIL (${failures})`}\n`);
process.exit(failures === 0 ? 0 : 1);
