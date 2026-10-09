import type { ScoreTier, CoreDocument } from '@/types/wordpress';
import tiersSeed from '@/content/seed/score-tiers.json';
import criteriaSeed from '@/content/seed/scoring-criteria.json';
import coreDocumentsSeed from '@/content/seed/core-documents.json';

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
  // Read from the seed, not WordPress. The redi/v1 route answers, but its
  // response is a frozen export of this repo that silently overrode newer
  // approved copy — see docs/WORDPRESS_INTEGRATION.md §6.2.1 for the evidence
  // and for how to hand this back to WordPress once it is genuinely editable.
  return tiersSeed as ScoreTier[];
}

/**
 * Scoring methodology breakdown (weighted criteria + eligibility list) shown
 * on the Approach page, alongside the gated "download scoring scale PDF"
 * form (`public/downloads/redi-scoring-scale.pdf`, revealed via the Monday
 * form in `CriteriaSection.astro`).
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
 * Fallback:  `src/content/seed/scoring-criteria.json`, deep-merged key by key, so a
 *            field WordPress has not caught up on yet falls back to the
 *            seed's value instead of rendering `undefined` (see `getPageCopy`).
 * Failure:   handled inside `wpFetch()` — never throws.
 *
 * TODO(backend): if `weights` is built as an ACF repeater, validate on the
 * WP side (or in a REST response filter) that `weightPercent` values sum to
 * 100 — the frontend renders whatever it's given without checking.
 */
export async function getScoringCriteria(): Promise<ScoringCriteriaData> {
  // Read from the seed, not WordPress. The redi/v1 route answers, but its
  // response is a frozen export of this repo that silently overrode newer
  // approved copy — see docs/WORDPRESS_INTEGRATION.md §6.2.1 for the evidence
  // and for how to hand this back to WordPress once it is genuinely editable.
  return criteriaSeed as ScoringCriteriaData;
}

/**
 * The "core documents" checklist shown on the Approach page — the specific
 * exhibits (survey, zoning map, utility will-serve letters, etc.) that most
 * affect a site's designation.
 *
 * Endpoint:  `GET /wp-json/redi/v1/core-documents`
 * Method:    GET
 * Auth:      none (public)
 * Namespace: **custom** — see docs/WORDPRESS_INTEGRATION.md.
 * Response:  `CoreDocument[]`.
 * Required fields per item: `area` (readiness category name), `submit`
 *   (what to submit for that category — plain text, may itself contain
 *   commas/semicolons, no markup).
 * Optional fields: none.
 * Fallback:  `src/content/seed/core-documents.json`.
 * Failure:   handled inside `wpFetch()` — never throws.
 */
export async function getCoreDocuments(): Promise<CoreDocument[]> {
  // Read from the seed, not WordPress. The redi/v1 route answers, but its
  // response is a frozen export of this repo that silently overrode newer
  // approved copy — see docs/WORDPRESS_INTEGRATION.md §6.2.1 for the evidence
  // and for how to hand this back to WordPress once it is genuinely editable.
  return coreDocumentsSeed as CoreDocument[];
}
