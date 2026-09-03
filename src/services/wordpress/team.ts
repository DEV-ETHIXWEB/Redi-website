import type { TeamMember } from '@/types/wordpress';
import seed from '@/content/seed/team.json';
import { wpFetch } from './client';

/**
 * Team roster shown on the About page.
 *
 * Endpoint:  `GET /wp-json/wp/v2/team_member?_embed`
 * Method:    GET
 * Auth:      none (public CPT)
 * CPT:       `team_member` — stock custom post type (`show_in_rest: true`)
 *            + ACF fields for job title, photo, and sort order.
 * Response:  `TeamMember[]`.
 * Required fields per item: `id`, `name`, `jobTitle`, `photo` (`WPImage`),
 *   `order` (number — display sort order, ascending; does not have to be
 *   contiguous, just comparable), `group` (`'staff' | 'board'` — the About
 *   page renders these as two separate grids).
 * Optional fields: `quote` (board members often supply a pull-quote about
 *   REDI Sites), `linkedIn` (profile URL).
 * Fallback:  `src/content/seed/team.json`.
 * Failure:   handled inside `wpFetch()` — never throws.
 *
 * Sorting happens client-side (in this function) by `order` ascending, so
 * the WP endpoint does not need to pre-sort its response — but it DOES need
 * to return a numeric `order` field per item, since sort falls back to
 * whatever order two items with equal/undefined `order` happened to arrive
 * in otherwise.
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const remote = await wpFetch<TeamMember[]>('/wp-json/wp/v2/team_member?_embed');
  const members = remote ?? (seed as TeamMember[]);
  return [...members].sort((a, b) => a.order - b.order);
}
