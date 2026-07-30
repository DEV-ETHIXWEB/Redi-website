import seed from '@/content/seed/pages.json';
import { wpFetch } from './client';

/**
 * Shape of the page-copy payload. Inferred directly from the seed JSON
 * (`typeof seed`) rather than hand-written in `src/types/wordpress.ts` —
 * this is intentional: `pages.json` is a large, deeply nested tree of
 * hero/section copy for every page, and keeping the type derived from the
 * seed file guarantees they can never drift out of sync. **If the shape of
 * `src/content/seed/pages.json` changes, this type updates automatically —
 * you do not need to (and should not) hand-maintain a parallel interface.**
 */
export type PageCopy = typeof seed;

/**
 * Per-server-instance memoization — once fetched (or fallen back to seed),
 * the same object is returned for the lifetime of the process, since this
 * data doesn't change within a single build/request lifecycle. On Vercel's
 * serverless model each invocation gets a fresh module scope, so this cache
 * does NOT persist across requests in production — it only avoids redundant
 * fetches within a single page render that calls `getPageCopy()` more than
 * once.
 */
let cache: PageCopy | null = null;

/**
 * Static rich-copy blocks for every page (hero headlines, section body
 * copy, CTA labels), keyed by page name — effectively an ACF flexible-
 * content / options-page export. This is the single largest and most
 * complex content endpoint in the app.
 *
 * Endpoint:  `GET /wp-json/redi/v1/page-copy`
 * Method:    GET
 * Auth:      none (public)
 * Namespace: **custom** — see docs/WORDPRESS_INTEGRATION.md. This is the
 *            hardest of the six custom `redi/v1` routes to build faithfully,
 *            because the response shape must match `src/content/seed/pages.json`
 *            EXACTLY, key-for-key, nested object for nested object — there
 *            is no partial/optional structure here. Recommend building this
 *            one last, after the simpler CPT-backed endpoints, and diffing
 *            the WP response against `pages.json` directly before wiring it
 *            up (`WORDPRESS_API_URL` unset vs. set is the easiest way to
 *            A/B the two side by side locally).
 * Response:  a single large object — see `src/content/seed/pages.json` for
 *            the exact required shape (every key present there is required).
 * Optional fields: none — treat every key in `pages.json` as required.
 * Fallback:  `src/content/seed/pages.json`.
 * Failure:   handled inside `wpFetch()` — never throws.
 *
 * TODO(backend): consider whether this monolithic endpoint should eventually
 * be split per-page (e.g. `/wp-json/redi/v1/page-copy/home`,
 * `/wp-json/redi/v1/page-copy/about`, …) once real editorial workflows are
 * in place — a single giant options page can become an unwieldy WP-admin
 * editing experience for content editors. Not required for launch; noted
 * here so the decision is made deliberately, not by default.
 */
export async function getPageCopy(): Promise<PageCopy> {
  if (cache) return cache;
  const remote = await wpFetch<PageCopy>('/wp-json/redi/v1/page-copy');
  cache = remote ?? (seed as PageCopy);
  return cache;
}
