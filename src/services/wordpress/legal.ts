import type { LegalSection } from '@/types/wordpress';
import seed from '@/content/seed/legal.json';
import { wpFetch } from './client';

/**
 * Terms / privacy / branding-guidelines sections rendered on `/legal`, in
 * the order returned.
 *
 * Endpoint:  `GET /wp-json/redi/v1/legal`
 * Method:    GET
 * Auth:      none (public)
 * Namespace: **custom** — see docs/WORDPRESS_INTEGRATION.md. An ACF
 *            repeater on an Options Page is the simplest fit, since these
 *            are ordered rich-text sections, not standalone posts.
 * Response:  `LegalSection[]`.
 * Required fields per item: `id`, `eyebrow` (small heading label above
 *   `heading`), `heading`, `bodyHtml` (raw HTML string, rendered with
 *   `set:html` — see security note below).
 * Optional fields: none.
 * Fallback:  `src/content/seed/legal.json`.
 * Failure:   handled inside `wpFetch()` — never throws.
 *
 * SECURITY NOTE: `bodyHtml` is trusted, unsanitized HTML injected directly
 * into the page. This is safe today because content only ever comes from
 * the seed JSON (developer-controlled) or, once connected, from WP's post
 * editor (assumed to be trusted internal staff, not public user input). If
 * this endpoint — or any endpoint returning an `*Html` field
 * (`bodyHtml`/`contentHtml`) — is ever fed by anything other than trusted
 * CMS editors, add server-side HTML sanitization before it reaches the
 * frontend.
 */
export async function getLegalSections(): Promise<LegalSection[]> {
  const remote = await wpFetch<LegalSection[]>('/wp-json/redi/v1/legal');
  return remote ?? (seed as LegalSection[]);
}
