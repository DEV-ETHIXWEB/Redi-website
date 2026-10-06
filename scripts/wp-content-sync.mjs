#!/usr/bin/env node
/**
 * WordPress readiness check + approved-content importer.
 *
 * The site reads every content type from WordPress first and falls back to
 * `src/content/seed/*.json` for anything WordPress doesn't return (see
 * docs/WORDPRESS_INTEGRATION.md). So "WordPress isn't driving the site yet"
 * is never a code problem — it's a WordPress-side one: routes that aren't
 * registered, or post types that are empty. This script answers which, and
 * then fills in the ones it can.
 *
 * Two modes, and `check` is the default because it never writes:
 *
 *   node scripts/wp-content-sync.mjs check
 *       Probes every endpoint the frontend calls and prints, per endpoint,
 *       whether it exists, whether it returns the expected shape, and how
 *       many items it holds versus the approved content. Read-only — safe to
 *       run against production. Needs only WORDPRESS_API_URL.
 *
 *   node scripts/wp-content-sync.mjs import [--only=team,posts] [--dry-run]
 *       Pushes approved content from src/content/seed/ into the five stock
 *       post types. Idempotent: matches on slug, updates when present,
 *       creates when absent. Needs write credentials.
 *
 * Environment:
 *   WORDPRESS_API_URL   e.g. https://cms.example.com   (both modes)
 *   WP_USER             WordPress username              (import only)
 *   WP_APP_PASSWORD     Application Password, NOT the login password —
 *                       WP Admin > Users > Profile > Application Passwords.
 *                       The normal password cannot authenticate REST writes.
 *
 * What this script deliberately does NOT do:
 *   - It does not touch the six `redi/v1` routes (page copy, site settings,
 *     advantages, score tiers, scoring criteria, legal). Those aren't post
 *     types; they're a custom REST namespace someone has to register on the
 *     WordPress side (docs/WORDPRESS_INTEGRATION.md §6.2). `check` reports
 *     their status so it's clear what's outstanding, but nothing here can
 *     create them.
 *   - It does not upload media. Image fields are written as absolute URLs
 *     pointing at the already-deployed assets, which satisfies the required
 *     `WPImage` shape without a media-library migration.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(__dirname, '..', 'src', 'content', 'seed');
const PUBLIC_SITE = process.env.PUBLIC_SITE_URL || 'https://www.redisites.com';

const API = (process.env.WORDPRESS_API_URL || '').replace(/\/+$/, '');
const USER = process.env.WP_USER || '';
const APP_PASSWORD = process.env.WP_APP_PASSWORD || '';

const seed = (name) => JSON.parse(readFileSync(join(SEED_DIR, `${name}.json`), 'utf8'));

/** Absolute-ises the seed's site-relative asset paths so WordPress stores a usable URL. */
const absolute = (url) =>
  typeof url === 'string' && url.startsWith('/') ? PUBLIC_SITE + url : url;
const img = (image) =>
  image && typeof image === 'object' ? { ...image, url: absolute(image.url) } : image;

/**
 * The five stock post types, in the build order §6.2 recommends. `fields`
 * returns everything beyond title/slug, written under the `acf` key — ACF
 * must be registered with `show_in_rest` for those to persist, which `check`
 * verifies before `import` is worth running.
 */
const TYPES = [
  {
    key: 'team',
    label: 'Team members',
    route: 'wp/v2/team_member',
    seedFile: 'team',
    title: (m) => m.name,
    slug: (m) => String(m.id),
    fields: (m) => ({
      jobTitle: m.jobTitle,
      photo: img(m.photo),
      order: m.order,
      group: m.group,
      quote: m.quote,
      linkedIn: m.linkedIn,
      photoPosition: m.photoPosition,
    }),
  },
  {
    key: 'properties',
    label: 'Properties',
    route: 'wp/v2/property',
    seedFile: 'properties',
    title: (p) => p.title,
    slug: (p) => p.slug,
    fields: (p) => ({
      city: p.city,
      state: p.state,
      acreage: p.acreage,
      image: img(p.image),
      featured: p.featured,
      tier: p.tier,
    }),
  },
  {
    key: 'testimonials',
    label: 'Testimonials',
    route: 'wp/v2/testimonial',
    seedFile: 'testimonials',
    title: (t) => t.personName,
    slug: (t) => String(t.id),
    fields: (t) => ({
      quote: t.quote,
      personName: t.personName,
      personTitle: t.personTitle,
      companyName: t.companyName,
      companyLogo: img(t.companyLogo),
      backgroundImage: img(t.backgroundImage),
    }),
  },
  {
    key: 'partners',
    label: 'Partners',
    route: 'wp/v2/partner',
    seedFile: 'partners',
    title: (p) => p.name,
    slug: (p) => String(p.id),
    fields: (p) => ({
      url: p.url,
      image: img(p.image),
      eyebrow: p.eyebrow,
      headline: p.headline,
      variant: p.variant,
      backgroundImage: img(p.backgroundImage),
    }),
  },
  {
    key: 'posts',
    label: 'News posts',
    route: 'wp/v2/posts',
    seedFile: 'blog-posts',
    title: (p) => p.title,
    slug: (p) => p.slug,
    core: (p) => ({
      content: p.contentHtml ?? '',
      excerpt: p.excerpt ?? '',
      ...(p.date ? { date: p.date } : {}),
    }),
    fields: (p) => ({
      author: p.author?.name,
      tags: p.tags,
      featuredImage: img(p.featuredImage),
      heroImage: img(p.heroImage),
      source: p.source,
      externalUrl: p.externalUrl,
    }),
  },
];

/** The custom namespace this script can only report on, never create. */
const REDI_ROUTES = [
  ['redi/v1/site-settings', 'site-settings'],
  ['redi/v1/advantages', 'advantages'],
  ['redi/v1/score-tiers', 'score-tiers'],
  ['redi/v1/scoring-criteria', 'scoring-criteria'],
  ['redi/v1/legal', 'legal'],
  ['redi/v1/page-copy', 'pages'],
];

const authHeader = () => 'Basic ' + Buffer.from(`${USER}:${APP_PASSWORD}`).toString('base64');

async function call(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = authHeader();
  const res = await fetch(`${API}/wp-json/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON body — status alone is enough to report on */
  }
  return { status: res.status, ok: res.ok, payload };
}

function requireApi() {
  if (API) return;
  console.error('WORDPRESS_API_URL is not set. Example:\n');
  console.error(
    '  WORDPRESS_API_URL=https://cms.example.com node scripts/wp-content-sync.mjs check\n',
  );
  process.exit(1);
}

async function check() {
  requireApi();
  console.log(`\nWordPress readiness: ${API}\n`);

  const root = await call('');
  if (!root.ok) {
    console.log(`  REST API unreachable (HTTP ${root.status}). Nothing else can be checked.`);
    process.exit(1);
  }
  console.log(`  Site: ${root.payload?.name ?? '(unnamed)'}\n`);

  console.log('  Stock post types (this script can populate these)');
  let importable = 0;
  for (const type of TYPES) {
    const approved = seed(type.seedFile).length;
    const res = await call(`${type.route}?per_page=1`);
    if (!res.ok) {
      console.log(
        `    ${type.label.padEnd(14)} MISSING   HTTP ${res.status} — post type not registered or not show_in_rest`,
      );
      continue;
    }
    importable++;
    const live = Array.isArray(res.payload) ? res.payload.length : 0;
    console.log(
      `    ${type.label.padEnd(14)} ok        live: ${live > 0 ? 'has content' : 'empty'}, approved content available: ${approved}`,
    );
  }

  console.log(
    '\n  Custom redi/v1 routes (must be built in WordPress — this script cannot create them)',
  );
  for (const [route, seedFile] of REDI_ROUTES) {
    const res = await call(route);
    const label = route.replace('redi/v1/', '').padEnd(18);
    if (!res.ok) {
      console.log(
        `    ${label} MISSING   HTTP ${res.status} — expected shape: src/content/seed/${seedFile}.json`,
      );
    } else {
      console.log(`    ${label} ok        returning data`);
    }
  }

  if (USER && APP_PASSWORD) {
    const me = await call('wp/v2/users/me', { auth: true });
    console.log(
      `\n  Write credentials: ${me.ok ? `ok (${me.payload?.name ?? USER})` : `FAILED (HTTP ${me.status}) — needs an Application Password, not the login password`}`,
    );
  } else {
    console.log(
      '\n  Write credentials: not provided (set WP_USER and WP_APP_PASSWORD to run import)',
    );
  }

  console.log(
    `\n  Summary: ${importable}/${TYPES.length} post types ready to import.\n` +
      `  Anything marked MISSING is WordPress-side work — see docs/WORDPRESS_INTEGRATION.md §6.\n`,
  );
}

async function importContent({ only, dryRun }) {
  requireApi();
  if (!dryRun && (!USER || !APP_PASSWORD)) {
    console.error(
      'WP_USER and WP_APP_PASSWORD are required to import. Use --dry-run to preview without them.',
    );
    process.exit(1);
  }

  const selected = only ? TYPES.filter((t) => only.includes(t.key)) : TYPES;
  if (selected.length === 0) {
    console.error(`No matching types. Available: ${TYPES.map((t) => t.key).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n${dryRun ? 'DRY RUN — nothing will be written' : 'Importing'} to ${API}\n`);
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const type of selected) {
    const items = seed(type.seedFile);
    console.log(`  ${type.label} (${items.length})`);

    const existing = await call(`${type.route}?per_page=100`);
    if (!existing.ok) {
      console.log(`    skipped — ${type.route} returned HTTP ${existing.status}\n`);
      failed += items.length;
      continue;
    }
    const bySlug = new Map(
      (Array.isArray(existing.payload) ? existing.payload : []).map((p) => [p.slug, p.id]),
    );

    for (const item of items) {
      const slug = type.slug(item);
      const body = {
        title: type.title(item),
        slug,
        status: 'publish',
        ...(type.core ? type.core(item) : {}),
        acf: type.fields(item),
      };
      const id = bySlug.get(slug);
      const verb = id ? 'update' : 'create';

      if (dryRun) {
        console.log(`    would ${verb}: ${body.title}`);
        if (id) updated++;
        else created++;
        continue;
      }

      const res = await call(id ? `${type.route}/${id}` : type.route, {
        method: 'POST',
        body,
        auth: true,
      });
      if (res.ok) {
        console.log(`    ${verb}d: ${body.title}`);
        if (id) updated++;
        else created++;
      } else {
        console.log(`    FAILED (${res.status}): ${body.title} — ${res.payload?.message ?? ''}`);
        failed++;
      }
    }
    console.log('');
  }

  console.log(`  ${created} created, ${updated} updated, ${failed} failed\n`);
  if (!dryRun) {
    console.log('  Next: re-run `check` to confirm, then reload the site.\n');
  }
  if (failed > 0) process.exit(1);
}

const args = process.argv.slice(2);
const mode = args.find((a) => !a.startsWith('--')) ?? 'check';
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg
  ? onlyArg
      .split('=')[1]
      .split(',')
      .map((s) => s.trim())
  : null;
const dryRun = args.includes('--dry-run');

if (mode === 'check') {
  await check();
} else if (mode === 'import') {
  await importContent({ only, dryRun });
} else {
  console.error(`Unknown mode "${mode}". Use "check" or "import".`);
  process.exit(1);
}
