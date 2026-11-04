import seed from '@/content/seed/pages.json';
import { overlay } from './page-copy-overlay';
import { getContentOverrides } from './content-overrides';

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
 * Static rich-copy blocks for every page (hero headlines, section body copy,
 * CTA labels), keyed by page name. This is the largest content tree in the app.
 *
 * Endpoint:  `GET /wp-json/ethixweb/v1/page-copy`
 * Method:    GET
 * Auth:      none (public) - it returns the same copy the pages already show
 * Namespace: **ethixweb/v1**, served by the REDI Page Editor plugin. NOT
 *            `redi/v1/page-copy`, which still exists and returns this whole
 *            tree, but is a frozen export: nothing in wp-admin writes to it,
 *            its response still matches this repo as committed on 2026-09-04,
 *            and for over a month it silently overrode newer approved copy on
 *            the live site (docs/WORDPRESS_INTEGRATION.md section 6.2.1).
 *            Nothing here reads it.
 * Response:  a PARTIAL tree in the shape of `src/content/seed/pages.json`,
 *            carrying only the fields an editor has filled in. Unlike the old
 *            route, no key is required: an absent key means "no change".
 * Source:    the approved copy is `src/content/seed/pages.json` in this repo.
 *            WordPress contributes an overlay on top of it, never a
 *            replacement - see ./page-copy-overlay.ts.
 * Failure:   `wpFetch` returns null on any failure (route absent, plugin
 *            deactivated, WordPress down, WORDPRESS_API_URL unset), which
 *            leaves every page rendering the approved copy.
 */
export async function getPageCopy(): Promise<PageCopy> {
  if (cache) return cache;

  /*
    The seed is the base for every page. WordPress contributes an overlay
    through the REDI Page Editor plugin - see ./page-copy-overlay.ts for why it is
    layered rather than swapped in.

    Note the namespace: `ethixweb/v1`, not `redi/v1`. The latter belongs to
    REDI Headless CMS and still serves the frozen export; nothing here reads
    it. The fetch is shared with every other service that reads this route
    (./content-overrides.ts) and never throws, so a failure lands on the
    approved copy.
  */
  const remote = await getContentOverrides();
  cache = overlay(seed as PageCopy, remote);
  return cache;
}
