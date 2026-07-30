import type { SiteSettings } from '@/types/wordpress';
import seed from '@/content/seed/site-settings.json';
import { wpFetch } from './client';

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
 * Fallback:  `src/content/seed/site-settings.json`.
 * Failure:   handled inside `wpFetch()` — never throws, returns seed data.
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
  const remote = await wpFetch<SiteSettings>('/wp-json/redi/v1/site-settings');
  const settings = remote ?? (seed as SiteSettings);
  return {
    ...settings,
    footer: {
      ...settings.footer,
      copyright: settings.footer.copyright.replace('{year}', String(new Date().getFullYear())),
    },
  };
}
