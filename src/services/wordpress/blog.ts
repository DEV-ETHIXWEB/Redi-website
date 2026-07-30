import type { BlogPost } from '@/types/wordpress';
import seed from '@/content/seed/blog-posts.json';
import { wpFetch } from './client';

/**
 * Query params accepted by `getBlogPosts()` — mirrors the `?q=&tag=&sort=&page=`
 * URL search params read by `src/pages/updates/index.astro` (the one SSR
 * route in this app; see that file for how these are parsed from `Astro.url`).
 */
export interface BlogQuery {
  /** Case-insensitive substring match against `title` and `excerpt`. */
  search?: string;
  /** Exact match against one entry in `BlogPost.tags`. */
  tag?: string;
  /** `'recent'` = newest `date` first (default). `'oldest'` = reverse. */
  sort?: 'recent' | 'oldest';
  /** 1-indexed page number. Defaults to 1. */
  page?: number;
  /** Items per page. Defaults to 6. */
  perPage?: number;
}

/**
 * Fetches every blog post, unfiltered. Not exported — always go through
 * `getBlogPosts()` / `getAllBlogTags()` / `getBlogPostBySlug()` /
 * `getAllBlogSlugs()`, which all call this internally so there's exactly one
 * fetch-and-fallback path for blog content.
 *
 * Endpoint:  `GET /wp-json/wp/v2/posts?_embed`
 * Method:    GET
 * Auth:      none (public — only published posts should be returned; WP's
 *            default REST behavior for `/posts` already excludes drafts for
 *            unauthenticated requests, so no extra filtering should be
 *            needed here).
 * Post type: native WordPress `post` — no custom CPT needed for blog
 *            content, unlike properties/team/testimonials/partners.
 * Response:  `BlogPost[]`.
 * Required fields per item: `id`, `slug`, `title`, `excerpt`, `contentHtml`
 *   (raw HTML — see the sanitization note in `./legal.ts`, same caveat
 *   applies here), `date` (ISO 8601 string), `author.name`, `tags`
 *   (`string[]`), `featuredImage` (`WPImage`).
 * Optional fields: `heroImage` (`WPImage` — wider crop for the article-page
 *   banner; falls back to `featuredImage` if omitted — that fallback is the
 *   CONSUMING component's job, not this service's), `source` (`{ name, url
 *   }` — renders an outbound "originally published by…" link; only present
 *   on posts that are summaries of external press coverage).
 * Fallback:  `src/content/seed/blog-posts.json`.
 * Failure:   handled inside `wpFetch()` — never throws.
 *
 * TODO(backend): native WP posts don't have `excerpt`/`contentHtml` as flat
 * strings by default — `excerpt.rendered` and `content.rendered` are nested
 * under WP's standard REST shape and include surrounding `<p>` wrapper divs
 * / share buttons depending on theme. A REST response filter
 * (`register_rest_field` or a `rest_prepare_post` hook) is needed to flatten
 * these into the flat shape this frontend expects, and to compute/attach
 * `tags` (as string labels, not term IDs — `_embed` returns term objects
 * under `_embedded['wp:term']`, which still needs mapping to plain strings).
 */
async function getAllPosts(): Promise<BlogPost[]> {
  const remote = await wpFetch<BlogPost[]>('/wp-json/wp/v2/posts?_embed');
  return remote ?? (seed as BlogPost[]);
}

/**
 * Search + filter + sort + paginate blog posts for the `/updates` index.
 * All filtering/sorting/pagination happens **in this function, in-memory**
 * — WordPress does not need to support `?search=`/`?tag=`/`?orderby=`/
 * `?page=` query params itself; `getAllPosts()` always fetches the full
 * collection and this function slices it locally.
 *
 * This is fine at the current content volume (a marketing blog, low tens of
 * posts) but does not scale indefinitely — if the post count grows large,
 * consider pushing search/pagination down to the WP REST API's native
 * `search`/`per_page`/`page`/`tags` query params instead of fetching
 * everything on every request.
 *
 * @returns `{ items, total, page, perPage, totalPages }` — `items` is the
 *   current page's posts, `total` is the filtered (not unfiltered) count,
 *   `totalPages` is always at least 1 even when `total` is 0.
 */
export async function getBlogPosts(query: BlogQuery = {}) {
  const { search = '', tag, sort = 'recent', page = 1, perPage = 6 } = query;
  let posts = await getAllPosts();

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    posts = posts.filter(
      (p) => p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q),
    );
  }

  if (tag) {
    posts = posts.filter((p) => p.tags.includes(tag));
  }

  posts = [...posts].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return sort === 'recent' ? -diff : diff;
  });

  const total = posts.length;
  const start = (page - 1) * perPage;
  const items = posts.slice(start, start + perPage);

  return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

/** Every distinct tag across all posts, alphabetically sorted — powers the `/updates` tag filter UI. */
export async function getAllBlogTags(): Promise<string[]> {
  const posts = await getAllPosts();
  return [...new Set(posts.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b));
}

/**
 * Looks up a single post by slug, for `src/pages/updates/[slug].astro`.
 * Returns `undefined` (not `null`) on no match — treat as "render a 404".
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const posts = await getAllPosts();
  return posts.find((p) => p.slug === slug);
}

/** Every post slug, for `getStaticPaths()` in the `[slug].astro` route (build-time SSG). */
export async function getAllBlogSlugs(): Promise<string[]> {
  const posts = await getAllPosts();
  return posts.map((p) => p.slug);
}
