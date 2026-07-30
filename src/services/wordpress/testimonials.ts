import type { Testimonial } from '@/types/wordpress';
import seed from '@/content/seed/testimonials.json';
import { wpFetch } from './client';

/**
 * Client testimonials shown in `TestimonialCarousel.tsx` (homepage).
 *
 * Endpoint:  `GET /wp-json/wp/v2/testimonial?_embed`
 * Method:    GET
 * Auth:      none (public CPT)
 * CPT:       `testimonial` — stock custom post type + ACF fields for quote,
 *            person, company, and background image.
 * Response:  `Testimonial[]`.
 * Required fields per item: `id`, `quote`, `personName`, `personTitle`,
 *   `companyName`, `companyLogo` (`WPImage`), `backgroundImage` (`WPImage`).
 * Optional fields: none.
 * Fallback:  `src/content/seed/testimonials.json`.
 * Failure:   handled inside `wpFetch()` — never throws.
 *
 * Order returned by WordPress = display order in the carousel (no
 * client-side sort is applied here, unlike `getTeamMembers()`) — sort by
 * `menu_order` or an ACF field on the WP side if a specific sequence matters.
 */
export async function getTestimonials(): Promise<Testimonial[]> {
  const remote = await wpFetch<Testimonial[]>('/wp-json/wp/v2/testimonial?_embed');
  return remote ?? (seed as Testimonial[]);
}
