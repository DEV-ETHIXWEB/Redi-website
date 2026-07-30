import type { Partner } from '@/types/wordpress';
import seed from '@/content/seed/partners.json';
import { wpFetch } from './client';

/**
 * Partner/sponsor logos and banners shown across the site.
 *
 * Endpoint:  `GET /wp-json/wp/v2/partner?_embed`
 * Method:    GET
 * Auth:      none (public CPT)
 * CPT:       `partner` — stock custom post type + ACF fields.
 * Response:  `Partner[]`.
 * Required fields per item: `id`, `name`, `url`, `image` (`WPImage`),
 *   `variant` (`'photo' | 'wordmark'` — controls layout: `photo` partners
 *   render as a hero-style banner card, `wordmark` partners render as a
 *   plain logo in the partner strip).
 * Optional fields: `eyebrow`, `headline` (only used for `photo` variant
 *   cards), `backgroundImage` (`WPImage` — REQUIRED in practice for
 *   `variant: 'wordmark'` partners that also appear in a banner context,
 *   since their plain logo image can't double as banner art; see the type
 *   comment in `src/types/wordpress.ts`).
 * Fallback:  `src/content/seed/partners.json`.
 * Failure:   handled inside `wpFetch()` — never throws.
 *
 * TODO(backend): `variant` should be a WP select/radio ACF field constrained
 * to exactly `photo` or `wordmark` (not free text) — the frontend does not
 * validate this value, so an unexpected string here would silently fall
 * through to whatever the consuming component's default/`else` branch does.
 */
export async function getPartners(): Promise<Partner[]> {
  const remote = await wpFetch<Partner[]>('/wp-json/wp/v2/partner?_embed');
  return remote ?? (seed as Partner[]);
}
