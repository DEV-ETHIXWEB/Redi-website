import type { LegalSection } from '@/types/wordpress';
import seed from '@/content/seed/legal.json';

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
 * Source:    `src/content/seed/legal.json` — this repo, not WordPress. The
 *            `redi/v1/legal` route is a frozen export that silently overrode
 *            newer approved copy; see docs/WORDPRESS_INTEGRATION.md 6.2.1.
 * Failure:   not applicable; nothing is fetched.
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
  // Read from the seed, not WordPress. The redi/v1 route answers, but its
  // response is a frozen export of this repo that silently overrode newer
  // approved copy — see docs/WORDPRESS_INTEGRATION.md §6.2.1 for the evidence
  // and for how to hand this back to WordPress once it is genuinely editable.
  return seed as LegalSection[];
}
