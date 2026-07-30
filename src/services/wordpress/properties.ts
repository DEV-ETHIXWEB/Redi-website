import type { Property } from '@/types/wordpress';
import seed from '@/content/seed/properties.json';
import { wpFetch } from './client';

/**
 * Certified-site listings shown on `/sites` and the homepage "featured
 * properties" rail.
 *
 * NOTE: `/sites` itself is now a LocationOne iframe embed
 * (`src/components/sections/SitesBrowser.astro`), not this data — LocationOne
 * is a separate vendor system with no API integration in this codebase (it's
 * a plain `<iframe>`). `getProperties()` and friends are still real and used
 * for the homepage's featured-properties section and card components; if the
 * client ever wants a REDI-native (non-LocationOne) property listing again,
 * this is the data layer for it.
 *
 * Endpoint:  `GET /wp-json/wp/v2/property?_embed`
 * Method:    GET
 * Auth:      none (public CPT)
 * CPT:       `property` — a stock custom post type, no custom plugin needed
 *            beyond registering it with `show_in_rest: true` and ACF fields
 *            for the non-title data below.
 * Response:  `Property[]` (src/types/wordpress.ts) — array even for one item.
 * Required fields per item: `id`, `slug`, `title`, `city`, `state`,
 *   `acreage` (number), `image` (`WPImage`: `url` + `alt` required),
 *   `featured` (boolean).
 * Optional fields: `tier` (`'platinum' | 'gold' | 'silver' | 'bronze' |
 *   'emerging'`, matches `BadgeTier` — omit if a property hasn't been scored).
 * Fallback:  `src/content/seed/properties.json` if WordPress is unset,
 *            unreachable, or the CPT/route doesn't exist yet (404).
 * Failure:   handled inside `wpFetch()` — never throws, returns seed data.
 *
 * TODO(backend): confirm whether `_embed` alone is sufficient to resolve
 * `image` to a full `WPImage` shape, or whether a REST field callback
 * (`register_rest_field`) is needed to flatten the ACF image field + featured
 * media into the exact `{ url, alt, width?, height? }` shape the frontend
 * expects — WordPress's native `_embedded['wp:featuredmedia']` shape does
 * NOT match this 1:1 out of the box.
 */
export async function getProperties(): Promise<Property[]> {
  const remote = await wpFetch<Property[]>('/wp-json/wp/v2/property?_embed');
  return remote ?? (seed as Property[]);
}

/**
 * The subset of `getProperties()` flagged `featured: true`, capped at
 * `limit`. Pure client-side filter — WordPress does not need a separate
 * "featured properties" endpoint; the `featured` boolean on each `property`
 * post is enough.
 *
 * @param limit - Max items returned. Defaults to 6 (matches the homepage
 *   featured-properties grid).
 */
export async function getFeaturedProperties(limit = 6): Promise<Property[]> {
  const all = await getProperties();
  return all.filter((p) => p.featured).slice(0, limit);
}

/**
 * Looks up a single property by its URL slug (used by any future
 * property-detail route). Returns `undefined` — not `null` — when no match
 * is found, matching `Array.prototype.find` semantics; callers should treat
 * `undefined` as "render a 404", not as an error state.
 */
export async function getPropertyBySlug(slug: string): Promise<Property | undefined> {
  const all = await getProperties();
  return all.find((p) => p.slug === slug);
}
