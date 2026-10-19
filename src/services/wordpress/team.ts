import type { TeamMember } from '@/types/wordpress';
import seed from '@/content/seed/team.json';
import { wpFetch } from './client';
import * as normalize from './normalize';

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
/**
 * Details this repo holds that the WordPress CPT cannot supply, merged onto
 * the live roster by `id` (WordPress returns the same slugs this seed uses).
 *
 * Without this, two things asked for on 2026-10-16 would have been silently
 * discarded the moment WordPress answered, because `normalize.list` takes a
 * non-empty remote collection wholesale:
 *
 *   - `email` / `phone`: the CPT has no field for either (checked: 0 of 8
 *     members return them), so Nicki's and Stevie's contact details would
 *     simply not render. These fill in only when WordPress has nothing, so
 *     the moment someone adds the ACF fields, WordPress wins and this stops
 *     applying on its own.
 *
 *   - `photoPosition`: the CPT does have this field, but it holds the values
 *     exported from this repo months ago, and the client asked for the card
 *     framing to be corrected (Darin's chin was being cropped). This one is
 *     deliberately repo-wins: it is a CSS crop offset tuned against the real
 *     card, not editorial content, and an editor has no way to judge it.
 */
const REPO_CONTACT_FIELDS = ['email', 'phone'] as const;

function withRepoDetails(members: TeamMember[]): TeamMember[] {
  const bySlug = new Map((seed as TeamMember[]).map((m) => [m.id, m]));
  return members.map((member) => {
    const local = bySlug.get(member.id);
    if (!local) return member;

    const merged: TeamMember = { ...member };
    for (const field of REPO_CONTACT_FIELDS) {
      if (!merged[field] && local[field]) merged[field] = local[field];
    }
    if (local.photoPosition) merged.photoPosition = local.photoPosition;
    return merged;
  });
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const remote = await wpFetch<TeamMember[]>('/wp-json/wp/v2/team_member?_embed');
  const members = normalize.list(remote, seed as TeamMember[], normalize.teamMember);
  return [...withRepoDetails(members)].sort((a, b) => a.order - b.order);
}
