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
 * PREREQUISITE — ACF must be exposed to the REST API. Their field groups
 * supply nearly every meaningful field (jobTitle, group and order on a team
 * member; externalUrl, source and heroImage on a post), and WordPress only
 * accepts writes to fields whose group has "Show in REST API" enabled. With
 * it off, `acf` is accepted as a parameter but declares zero properties, so
 * every write is rejected as `Invalid parameter(s): acf`. A post created
 * anyway would be missing externalUrl, which silently turns an outbound link
 * into a dead internal article — so `import` refuses to run rather than
 * publish content that looks imported but is wrong. `check` reports the flag
 * per post type. Turn it on in WP Admin > ACF > Field Groups > (group) >
 * Settings > Show in REST API.
 *
 * What this script deliberately does NOT do:
 *   - It does not touch the six `redi/v1` routes (page copy, site settings,
 *     advantages, score tiers, scoring criteria, legal). Those aren't post
 *     types; they're a custom REST namespace someone has to register on the
 *     WordPress side (docs/WORDPRESS_INTEGRATION.md §6.2). `check` reports
 *     their status so it's clear what's outstanding, but nothing here can
 *     create them.
 *   - It does not touch anything it did not create. Matching is by slug, so
 *     re-running updates its own rows and leaves hand-authored ones alone.
 */

import { readFileSync, existsSync } from 'node:fs';
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
    images: { photo: (m) => m.photo },
    fields: (m) => ({
      jobTitle: m.jobTitle,
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
    images: { image: (p) => p.image },
    fields: (p) => ({
      city: p.city,
      state: p.state,
      acreage: p.acreage,
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
    images: { companyLogo: (t) => t.companyLogo, backgroundImage: (t) => t.backgroundImage },
    fields: (t) => ({
      quote: t.quote,
      personName: t.personName,
      personTitle: t.personTitle,
      companyName: t.companyName,
    }),
  },
  {
    key: 'partners',
    label: 'Partners',
    route: 'wp/v2/partner',
    seedFile: 'partners',
    title: (p) => p.name,
    slug: (p) => String(p.id),
    images: { image: (p) => p.image, backgroundImage: (p) => p.backgroundImage },
    fields: (p) => ({
      url: p.url,
      eyebrow: p.eyebrow,
      headline: p.headline,
      variant: p.variant,
    }),
  },
  {
    key: 'posts',
    label: 'News posts',
    route: 'wp/v2/posts',
    seedFile: 'blog-posts',
    featuredMedia: (p) => p.featuredImage,
    title: (p) => p.title,
    slug: (p) => p.slug,
    core: (p) => ({
      content: p.contentHtml ?? '',
      excerpt: p.excerpt ?? '',
      // The seed stores a bare date; WordPress rejects anything that isn't a
      // full ISO 8601 datetime with `Invalid parameter(s): date`.
      ...(p.date ? { date: `${p.date}T00:00:00` } : {}),
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

/**
 * WordPress's own `id` is overwritten by their REST filter with the frontend's
 * string id (a slug), so the numeric id needed for updates only survives in
 * the self link.
 */
function numericId(item) {
  const href = item?._links?.self?.[0]?.href;
  return href ? href.replace(/\/+$/, '').split('/').pop() : null;
}

/** Field names a post type's ACF group exposes to REST — empty means writes will be rejected. */
async function acfFields(route) {
  const res = await fetch(`${API}/wp-json/${route}`, {
    method: 'OPTIONS',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const schema = await res.json().catch(() => null);
  const post = (schema?.endpoints ?? []).find((e) => (e.methods ?? []).includes('POST'));
  return Object.keys(post?.args?.acf?.properties ?? {});
}

/** Uploads an image once per source path and returns its attachment id. */
const mediaCache = new Map();
async function uploadMedia(image) {
  const rel = image?.url;
  if (typeof rel !== 'string' || !rel.startsWith('/')) return null;
  if (mediaCache.has(rel)) return mediaCache.get(rel);

  const file = join(__dirname, '..', 'public', rel.replace(/^\//, ''));
  if (!existsSync(file)) {
    console.log(`      (no local file for ${rel} — skipping image)`);
    return null;
  }
  const name = rel.split('/').pop();
  const base = name.replace(/\.[^.]+$/, '');

  // WordPress never overwrites an upload — it appends -1, -2 and so on — so
  // without this an idempotent re-import would add a fresh copy of every image
  // to the media library on every run.
  //
  // The match is on the stored filename, not the slug: attachments share the
  // post_name namespace with posts, so uploading `nicki-dallison.jpg` for a
  // team member already slugged `nicki-dallison` yields the slug
  // `nicki-dallison-1` on the very first upload. `media_details.file` keeps the
  // real filename and is the only field that stays equal to the source.
  const existing = await call(`wp/v2/media?search=${encodeURIComponent(base)}&per_page=100`, {
    auth: true,
  });
  // A large upload is downsized and stored as `<name>-scaled.<ext>`, with the
  // untouched filename kept in `original_image`, so both have to be checked.
  const already = (Array.isArray(existing.payload) ? existing.payload : []).find((m) => {
    const stored = (m.media_details?.file ?? '').split('/').pop();
    return stored === name || m.media_details?.original_image === name;
  });
  if (already) {
    mediaCache.set(rel, already.id);
    return already.id;
  }

  const ext = (name.split('.').pop() || '').toLowerCase();
  const mime = {
    webp: 'image/webp',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
  }[ext];

  const res = await fetch(`${API}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Disposition': `attachment; filename=${name}`,
      ...(mime ? { 'Content-Type': mime } : {}),
    },
    body: readFileSync(file),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    console.log(`      media upload failed for ${rel}: ${payload?.message ?? res.status}`);
    return null;
  }
  // alt text rides on the attachment, and their filter reads it into WPImage.alt.
  if (image.alt) {
    await fetch(`${API}/wp-json/wp/v2/media/${payload.id}`, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ alt_text: image.alt }),
    });
  }
  mediaCache.set(rel, payload.id);
  return payload.id;
}

/** Resolves tag names to term ids, creating any that don't exist yet. */
const tagCache = new Map();
async function tagIds(names) {
  const ids = [];
  for (const name of names ?? []) {
    if (tagCache.has(name)) {
      ids.push(tagCache.get(name));
      continue;
    }
    const found = await call(`wp/v2/tags?search=${encodeURIComponent(name)}`);
    const match = Array.isArray(found.payload)
      ? found.payload.find((t) => t.name.toLowerCase() === name.toLowerCase())
      : null;
    let id = match?.id;
    if (!id) {
      const made = await call('wp/v2/tags', { method: 'POST', body: { name }, auth: true });
      id = made.payload?.id;
    }
    if (id) {
      tagCache.set(name, id);
      ids.push(id);
    }
  }
  return ids;
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
  const blockedByAcf = [];
  for (const type of TYPES) {
    const approved = seed(type.seedFile).length;
    const res = await call(`${type.route}?per_page=1`);
    if (!res.ok) {
      console.log(
        `    ${type.label.padEnd(14)} MISSING   HTTP ${res.status} — post type not registered or not show_in_rest`,
      );
      continue;
    }
    const fields = await acfFields(type.route);
    if (fields.length === 0) blockedByAcf.push(type.label);
    else importable++;
    const live = Array.isArray(res.payload) ? res.payload.length : 0;
    console.log(
      `    ${type.label.padEnd(14)} ${fields.length ? 'ok      ' : 'BLOCKED '}  live: ${live > 0 ? 'has content' : 'empty'}, approved: ${approved}, ACF fields writable: ${fields.length || 'none'}`,
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

  console.log(`\n  Summary: ${importable}/${TYPES.length} post types ready to import.`);
  if (blockedByAcf.length > 0) {
    console.log(
      `\n  BLOCKED: ${blockedByAcf.join(', ')} — the ACF field group for each is not\n` +
        `  exposed to the REST API, so jobTitle/group/order/externalUrl and the rest\n` +
        `  cannot be written. Importing without them would publish content that looks\n` +
        `  complete but is wrong (an external-link post becomes a dead internal page),\n` +
        `  so import refuses to run. Fix: WP Admin > ACF > Field Groups > open each\n` +
        `  group > Settings > Show in REST API > Yes.`,
    );
  }
  console.log(
    `\n  Anything marked MISSING is WordPress-side work — see docs/WORDPRESS_INTEGRATION.md §6.\n`,
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

  // Refuse up front rather than publishing content that looks imported but is
  // missing the fields that decide how it renders. See the ACF note up top.
  const blocked = [];
  for (const type of selected) {
    if ((await acfFields(type.route)).length === 0) blocked.push(type);
  }
  if (blocked.length > 0 && !dryRun) {
    console.error(
      `  Refusing to import — ACF is not exposed to REST for: ${blocked.map((t) => t.label).join(', ')}.`,
    );
    console.error('  Those writes would be rejected, or worse, silently drop fields like');
    console.error('  externalUrl and turn an outbound link into a dead internal page.');
    console.error(
      '  Fix: WP Admin > ACF > Field Groups > each group > Settings > Show in REST API.',
    );
    console.error('  Then re-run. Use `check` to confirm.\n');
    process.exit(1);
  }

  for (const type of selected) {
    const items = seed(type.seedFile);
    console.log(`  ${type.label} (${items.length})`);

    const existing = await call(`${type.route}?per_page=100`);
    if (!existing.ok) {
      console.log(`    skipped — ${type.route} returned HTTP ${existing.status}\n`);
      failed += items.length;
      continue;
    }
    // Their REST filter replaces the response with the frontend's shape, which
    // carries `id` (already the slug) and usually drops `slug` entirely. Keying
    // on `slug` alone therefore matched nothing and every re-run would have
    // created a second copy of every row, so both keys are indexed.
    const bySlug = new Map();
    for (const row of Array.isArray(existing.payload) ? existing.payload : []) {
      const id = numericId(row);
      if (!id) continue;
      if (row.slug !== undefined && row.slug !== null) bySlug.set(String(row.slug), id);
      if (row.id !== undefined && row.id !== null) bySlug.set(String(row.id), id);
    }

    for (const item of items) {
      const slug = type.slug(item);
      const id = bySlug.get(slug);
      const verb = id ? 'update' : 'create';

      if (dryRun) {
        console.log(`    would ${verb}: ${type.title(item)}`);
        if (id) updated++;
        else created++;
        continue;
      }

      // ACF image fields hold an attachment id, not a URL, so each image is
      // uploaded to the media library first and the id written in its place.
      const acf = { ...type.fields(item) };
      for (const [field, pick] of Object.entries(type.images ?? {})) {
        const id = await uploadMedia(pick(item));
        if (id) acf[field] = id;
      }

      const body = {
        title: type.title(item),
        slug,
        status: 'publish',
        ...(type.core ? type.core(item) : {}),
        acf,
      };
      // Posts carry their image as the WordPress featured image instead.
      if (type.featuredMedia) {
        const featured = await uploadMedia(type.featuredMedia(item));
        if (featured) body.featured_media = featured;
      }
      if (type.key === 'posts') body.tags = await tagIds(item.tags);

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
