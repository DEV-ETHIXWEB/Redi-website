import type { ScoreTier } from '@/types/wordpress';
import tiersSeed from '@/content/seed/score-tiers.json';
import criteriaSeed from '@/content/seed/scoring-criteria.json';
import { wpFetch } from './client';

/**
 * Shape returned by `/wp-json/redi/v1/scoring-criteria` and consumed by
 * `getScoringCriteria()`. Kept local to this file (rather than in
 * `src/types/wordpress.ts`) because it's only ever used here — if another
 * module needs it, move it to the shared types file first.
 */
interface ScoringCriteriaData {
  /** Weighted scoring-category breakdown, e.g. shown as a donut/bar chart on `/approach`. */
  weights: { id: string; label: string; weightPercent: number; color: string }[];
  /** Bullet list of the primary factors REDI scores against. */
  primaryCriteria: string[];
  /** Bullet list of minimum eligibility requirements to be scored at all. */
  eligibility: string[];
}

/**
 * REDI score badge tiers (Platinum/Gold/Silver/Bronze/Emerging) shown on the
 * Approach page and as property card badges.
 *
 * Endpoint:  `GET /wp-json/redi/v1/score-tiers`
 * Method:    GET
 * Auth:      none (public)
 * Namespace: **custom** — see docs/WORDPRESS_INTEGRATION.md.
 * Response:  `ScoreTier[]`.
 * Required fields per item: `id`, `tier` (must be a `BadgeTier` literal:
 *   `'platinum' | 'gold' | 'silver' | 'bronze' | 'emerging'` — this value is
 *   also used elsewhere as `Property.tier`, so the two must stay in sync),
 *   `label`, `range` (display string, e.g. `"90–100"`), `badgeImage`
 *   (`WPImage`), `description`.
 * Optional fields: none.
 * Fallback:  `src/content/seed/score-tiers.json`.
 * Failure:   handled inside `wpFetch()` — never throws.
 */
export async function getScoreTiers(): Promise<ScoreTier[]> {
  const remote = await wpFetch<ScoreTier[]>('/wp-json/redi/v1/score-tiers');
  return remote ?? (tiersSeed as ScoreTier[]);
}

/**
 * Scoring methodology breakdown (weighted criteria + eligibility list) shown
 * on the Approach page, alongside the "download scoring scale PDF" link
 * (`public/downloads/redi-scoring-scale.pdf` — currently a placeholder stub,
 * see docs/WORDPRESS_INTEGRATION.md known-limitations section).
 *
 * Endpoint:  `GET /wp-json/redi/v1/scoring-criteria`
 * Method:    GET
 * Auth:      none (public)
 * Namespace: **custom** — see docs/WORDPRESS_INTEGRATION.md.
 * Response:  single `ScoringCriteriaData` object (NOT an array).
 * Required fields: `weights[]` (each: `id`, `label`, `weightPercent` —
 *   number, expected to sum to 100 across all items but this is NOT
 *   validated client-side, `color` — any valid CSS color string),
 *   `primaryCriteria` (`string[]`), `eligibility` (`string[]`).
 * Optional fields: none.
 * Fallback:  `src/content/seed/scoring-criteria.json`.
 * Failure:   handled inside `wpFetch()` — never throws.
 *
 * TODO(backend): if `weights` is built as an ACF repeater, validate on the
 * WP side (or in a REST response filter) that `weightPercent` values sum to
 * 100 — the frontend renders whatever it's given without checking.
 */
export async function getScoringCriteria(): Promise<ScoringCriteriaData> {
  const remote = await wpFetch<ScoringCriteriaData>('/wp-json/redi/v1/scoring-criteria');
  return remote ?? (criteriaSeed as ScoringCriteriaData);
}
