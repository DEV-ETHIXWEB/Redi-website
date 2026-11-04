import type { AdvantageItem } from '@/types/wordpress';
import seed from '@/content/seed/advantages.json';
import { overlay } from './page-copy-overlay';
import { getOverride } from './content-overrides';

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
 * Source:    `src/content/seed/advantages.json` — this repo, not WordPress. The
 *            `redi/v1/advantages` route is a frozen export that silently overrode
 *            newer approved copy; see docs/WORDPRESS_INTEGRATION.md 6.2.1.
 * Failure:   not applicable; nothing is fetched.
 *
 * TODO(backend): constrain the WP-side `icon` field to a select/radio with
 * exactly these three options. If a new icon is ever needed, the frontend's
 * icon switch (wherever `AdvantageItem.icon` is consumed) must be updated
 * FIRST and deployed before WordPress can safely start returning the new
 * value — an unrecognized `icon` string has no defined fallback rendering
 * today.
 */
export async function getAdvantages(): Promise<AdvantageItem[]> {
  // Read from the seed, not WordPress. The redi/v1 route answers, but its
  // response is a frozen export of this repo that silently overrode newer
  // approved copy — see docs/WORDPRESS_INTEGRATION.md §6.2.1 for the evidence
  // and for how to hand this back to WordPress once it is genuinely editable.
  // WordPress is now genuinely editable for this content (REDI Page Editor,
  // docs/WORDPRESS_INTEGRATION.md section 6.2.2), so the seed is overlaid with
  // whatever an editor has typed. Still NOT the redi/v1 route: that one answers
  // too, but serves a frozen export of this repo that silently overrode newer
  // approved copy for a month - see section 6.2.1.
  return overlay(seed as AdvantageItem[], await getOverride('advantages'));
}
