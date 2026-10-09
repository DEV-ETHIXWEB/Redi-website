/**
 * Attribution for the site-search map provider, in one place because it is
 * rendered twice: under the LocationOne embed on /sites and /members
 * (`SitesBrowser.astro`) and under the illustrated hero map on the homepage
 * (`HomeHero.astro`).
 *
 * LocationOne is the product; Strata Platforms is the company behind it, and
 * the client asked for the credit to read "Powered by Strata Platforms",
 * linking to the company. Only the visible credit changed — the embed itself
 * is still served from app.locationone.com (see `EMBED_ORIGIN`), so the
 * frame-src entries in vercel.json and src/middleware.ts stay as they are.
 *
 * This deliberately does NOT come from the CMS. The credit carries a
 * hyperlink, and `redi/v1/page-copy` can only return a flat string (its
 * `home.hero.mapCaption` key used to supply the text, which is why the link
 * could not be added there). A vendor credit is also not editorial copy —
 * it changes when the vendor's branding changes, not when the client is
 * rewriting page content.
 */

/** Company credited under both maps. */
export const MAP_PROVIDER_NAME = 'Strata Platforms';

/** Target of the credit link. */
export const MAP_PROVIDER_URL = 'https://strataplatforms.com';

/**
 * Origin that actually serves the embedded search. Still LocationOne — the
 * rebrand is a credit change, not a vendor change. Kept here next to the
 * credit so the two cannot silently drift apart.
 */
export const EMBED_ORIGIN = 'https://app.locationone.com';
