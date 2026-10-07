import { readFile } from 'node:fs/promises';

/**
 * Build-time list of article slugs, used only to populate the sitemap.
 *
 * Why this exists: /updates/[slug] used to be prerendered, and its
 * `getStaticPaths()` was what put the article URLs into sitemap-0.xml. That
 * made the pages stale — a post edited in WordPress kept serving the old copy
 * until someone ran a deploy, and a newly published post was worse than
 * stale: it appeared in the /updates listing (that page re-renders on a
 * timer) while its own URL returned 404. So the route now renders on demand,
 * which means nothing enumerates the articles for the sitemap any more.
 * This does.
 *
 * It deliberately does NOT import src/services/wordpress — that module reads
 * `astro:env/server`, which only exists inside the Astro runtime, not in the
 * config file. The fetch-and-fall-back-to-seed shape is the same, though, and
 * the `externalUrl` filter mirrors `getAllBlogSlugs()`: link-out posts have no
 * page of their own, so they must not appear in the sitemap.
 *
 * The sitemap is cosmetic next to the site rendering at all, so every failure
 * path falls back to the seed slugs rather than throwing and breaking the
 * build.
 */
const SEED = new URL('../src/content/seed/blog-posts.json', import.meta.url);

/** @param {unknown[]} posts @returns {string[]} */
const internalSlugs = (posts) =>
  posts
    .filter((post) => post && typeof post.slug === 'string' && post.slug && !post.externalUrl)
    .map((post) => post.slug);

/** @returns {Promise<string[]>} */
export async function articleSlugs() {
  /** @type {string[]} */
  let seedSlugs = [];
  try {
    const seed = JSON.parse(await readFile(SEED, 'utf8'));
    if (Array.isArray(seed)) seedSlugs = internalSlugs(seed);
  } catch {
    // A missing or malformed seed file is not worth failing the build over.
  }

  const base = process.env.WORDPRESS_API_URL?.replace(/\/+$/, '');
  if (!base) return seedSlugs;

  try {
    const res = await fetch(`${base}/wp/v2/posts?per_page=100`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return seedSlugs;
    const posts = await res.json();
    if (!Array.isArray(posts)) return seedSlugs;
    const slugs = internalSlugs(posts);
    // An empty list means the response did not look like posts; trust the
    // approved content instead of publishing a sitemap with no articles.
    return slugs.length > 0 ? slugs : seedSlugs;
  } catch {
    return seedSlugs;
  }
}
