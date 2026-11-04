import { wpFetch } from './client';

/**
 * The editor overrides for everything that is not a WordPress post type.
 *
 * One request, shared by every service that needs it. Each service then takes
 * its own top-level key and lays it over its seed - see ./page-copy-overlay.ts
 * for why it is an overlay and never a replacement.
 *
 * Endpoint:  `GET /wp-json/ethixweb/v1/page-copy`
 * Auth:      none (public) - it returns the same copy the pages already show
 * Served by: the REDI Page Editor plugin, generated from the seed files by
 *            scripts/wp-page-editor/build.mjs. See
 *            docs/WORDPRESS_INTEGRATION.md section 6.2.2.
 *
 * The response is PARTIAL: it carries only the fields an editor has actually
 * typed into, and an absent key means "no change". Nothing in it is required.
 *
 * Keys correspond to the wp-admin screens:
 *   home, about, approach, contact, sites, updates, legal   (marketing pages)
 *   advantages, legalSections, scoreTiers, coreDocuments,
 *   scoringCriteria, siteSettings                           (everything else)
 */
export type ContentOverrides = Record<string, unknown>;

/**
 * Per-module-instance memoization, so seven services asking for this during one
 * render make one request rather than seven. On Vercel each invocation gets a
 * fresh module scope, so this does not persist across requests in production.
 *
 * The promise is cached, not the result: concurrent callers share one fetch
 * instead of racing. `wpFetch` never throws, so this promise never rejects.
 */
let pending: Promise<ContentOverrides | null> | null = null;

export function getContentOverrides(): Promise<ContentOverrides | null> {
  pending ??= wpFetch<ContentOverrides>('/wp-json/ethixweb/v1/page-copy');
  return pending;
}

/** The slice for one wp-admin screen, or null when there is nothing to apply. */
export async function getOverride(key: string): Promise<unknown> {
  const all = await getContentOverrides();
  if (!all || typeof all !== 'object') return null;
  return all[key] ?? null;
}
