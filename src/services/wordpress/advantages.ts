import type { AdvantageItem } from '@/types/wordpress';
import seed from '@/content/seed/advantages.json';
import { wpFetch } from './client';

/**
 * "Why Choose REDI" icon/title/description cards (homepage).
 *
 * Endpoint:  `GET /wp-json/redi/v1/advantages`
 * Method:    GET
 * Auth:      none (public)
 * Namespace: **custom** — not stock WP. Simplest implementation is an ACF
 *            Options Page with a repeater field, exposed via
 *            `register_rest_route()` — see docs/WORDPRESS_INTEGRATION.md.
 * Response:  `AdvantageItem[]`.
 * Required fields per item: `id`, `icon` (must be one of the literal union
 *   `'map-pin' | 'trending-up' | 'shield-check'` — these are Lucide icon
 *   names hardcoded into the frontend's icon-rendering switch, NOT free
 *   text), `title`, `description`.
 * Optional fields: none.
 * Fallback:  `src/content/seed/advantages.json`.
 * Failure:   handled inside `wpFetch()` — never throws.
 *
 * TODO(backend): constrain the WP-side `icon` field to a select/radio with
 * exactly these three options. If a new icon is ever needed, the frontend's
 * icon switch (wherever `AdvantageItem.icon` is consumed) must be updated
 * FIRST and deployed before WordPress can safely start returning the new
 * value — an unrecognized `icon` string has no defined fallback rendering
 * today.
 */
export async function getAdvantages(): Promise<AdvantageItem[]> {
  const remote = await wpFetch<AdvantageItem[]>('/wp-json/redi/v1/advantages');
  return remote ?? (seed as AdvantageItem[]);
}
