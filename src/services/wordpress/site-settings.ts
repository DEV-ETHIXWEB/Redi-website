import type { SiteSettings } from '@/types/wordpress';
import seed from '@/content/seed/site-settings.json';
import { overlay } from './page-copy-overlay';
import { getOverride } from './content-overrides';

/**
 * Global site chrome: logos, primary nav, sign-in/register CTA links, footer
 * (blurb, sitemap links, contact info, copyright), and the homepage stats
 * bar. Called once per page render by `BaseLayout.astro`, `Navbar.astro`,
 * and `Footer.astro`.
 *
 * Endpoint:  `GET /wp-json/redi/v1/site-settings`
 * Method:    GET
 * Auth:      none (public)
 * Namespace: **custom** — not stock WP or ACF-to-REST. Must be hand-built
 *            (e.g. an ACF Options Page + a `register_rest_route()` callback
 *            that serializes it) — see docs/WORDPRESS_INTEGRATION.md.
 * Response:  single `SiteSettings` object (NOT an array) —
 *            src/types/wordpress.ts.
 * Required fields: `siteName`, `tagline`, `logo.{light,dark,mark}` (each a
 *   `WPImage`), `primaryNav` (`WPLink[]`), `ctaNav.{signIn,register}`
 *   (`WPLink`), `footer.{blurb,sitemap,contact,copyright}`, `stats`
 *   (`{ value, label }[]`).
 * Optional fields: none — every field is treated as required by the type;
 *   omit at your own risk, since no component null-checks these.
 * Source of truth: **this repo**, not WordPress — see the block below.
 * Failure:   not applicable; nothing is fetched.
 *
 * Post-fetch behavior: `{year}` inside `footer.copyright` is replaced with
 * the current year at request time, regardless of source (WordPress or
 * seed) — so the CMS value should literally contain the token `{year}`
 * (e.g. `"© {year} REDI Sites"`), not a hardcoded year.
 *
 * TODO(backend): decide where `ctaNav.signIn` / `ctaNav.register` should
 * point once real authentication exists (§ Authentication Preparation in
 * docs/WORDPRESS_INTEGRATION.md) — today these are just `WPLink`s to the
 * static `/sign-in` and `/register` pages.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  /*
    These settings are read from the seed file and WordPress is not consulted.

    `redi/v1/site-settings` is not an editable screen in WordPress — it is a
    one-time export of this repo's seed, served back by a plugin. As of
    2026-10-09 its response is byte-for-byte identical to the version of
    site-settings.json committed on 2026-07-19, so nobody has ever changed a
    value there, and nobody can.

    That made it a trap rather than a CMS: it answered every request with
    whatever this file said months ago, and because the response was merged
    over the seed with WordPress winning, any edit made here was overwritten
    at render time by the stale copy. The client's LinkedIn URL change is
    exactly that case — updating the seed alone would have changed nothing on
    the live site.

    WordPress now has a real settings screen — Site Settings (REDI), served by
    the REDI Page Editor plugin on `ethixweb/v1/page-copy`
    (docs/WORDPRESS_INTEGRATION.md §6.2.2) — so the seed is overlaid with
    whatever an editor has typed. It is still not `redi/v1/site-settings`, and
    it is an overlay rather than a merge-with-WordPress-winning, which is the
    difference that makes it safe: a blank field keeps the approved value.

    Links are deliberately not editable (nav `href`s, logo URLs), so the
    client's LinkedIn URL and the nav targets stay code-owned.
  */
  const settings = overlay(seed as SiteSettings, await getOverride('siteSettings'));
  return {
    ...settings,
    footer: {
      ...settings.footer,
      copyright: settings.footer.copyright.replace('{year}', String(new Date().getFullYear())),
    },
  };
}
