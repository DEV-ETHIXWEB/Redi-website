# WordPress Integration Guide

This is the technical reference for connecting this Astro frontend to a
real headless WordPress backend, and for working in this codebase day to
day. It's written for the engineering team continuing this project — it
assumes no prior context beyond general Astro/WordPress/REST familiarity.

For the project-manager-facing risk/status report (what's done, what's
pending, deployment/infra state as of handoff), see
[`HANDOFF.md`](../HANDOFF.md) in the repo root. This document is narrower
and more durable: it's the API contract and integration how-to, meant to
stay accurate as the project moves forward, not a point-in-time snapshot.

## Table of contents

1. [Project architecture](#1-project-architecture)
2. [Folder structure](#2-folder-structure)
3. [Frontend flow](#3-frontend-flow)
4. [Content flow](#4-content-flow)
5. [Environment variables](#5-environment-variables)
6. [API contracts](#6-api-contracts) — the backend team's spec
7. [How to switch from seed JSON to WordPress](#7-how-to-switch-from-seed-json-to-wordpress)
8. [How to add a new page](#8-how-to-add-a-new-page)
9. [How to add new content to an existing type](#9-how-to-add-new-content-to-an-existing-type)
10. [How to add a new custom post type / content domain](#10-how-to-add-a-new-custom-post-type--content-domain)
11. [Authentication preparation](#11-authentication-preparation)
12. [Deployment flow](#12-deployment-flow)
13. [Required WordPress plugins](#13-required-wordpress-plugins)
14. [How to debug](#14-how-to-debug)
15. [Common issues](#15-common-issues)
16. [Known limitations](#16-known-limitations)

---

## 1. Project architecture

```
                    ┌─────────────────────────┐
                    │         Vercel            │
                    │  git push -> main deploys  │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │   Astro 7 application       │
                    │   (this repo)                 │
                    │                                │
   ┌──────────────┐ │  ┌───────────┐  ┌─────────┐   │
   │ LocationOne   │◄┤  │  Pages     │  │ React    │   │
   │ (iframe embed)│ │  │ (13 SSG +  │  │ islands  │   │
   └──────────────┘ │  │  1 SSR)    │  │          │   │
                    │  └─────┬──────┘  └─────────┘   │
   ┌──────────────┐ │        │                         │
   │ Monday.com    │◄┤        ▼                         │
   │ (iframe embed)│ │  ┌─────────────────────────┐    │
   └──────────────┘ │  │ src/services/wordpress/  │    │
                    │  │  (this doc's subject)     │    │
                    │  └─────────┬─────────────────┘    │
                    │            │ wpFetch()              │
                    │     ┌──────┴───────┐                │
                    │     │ WORDPRESS_    │  unset/failed  │
                    │     │ API_URL set?  │───────┐        │
                    │     └──────┬───────┘        │        │
                    │            │ yes              │ no    │
                    └────────────┼──────────────────┼───────┘
                                 │                  │
                    ┌────────────▼──┐    ┌──────────▼───────────┐
                    │ Headless        │    │ src/content/seed/     │
                    │ WordPress        │    │ *.json                │
                    │ (WP Engine)      │    │ (current live source) │
                    └──────────────────┘    └──────────────────────┘
```

Key architectural facts:

- **This app never renders WordPress templates.** WordPress's only job is to
  serve JSON over REST. All HTML rendering happens in Astro.
- **Every content fetch is server-side**, not browser-side (see
  `src/services/wordpress/client.ts` — imports `WORDPRESS_API_URL` from
  `astro:env/server`). This means WordPress does not need CORS configured
  for this integration, and the WordPress origin/URL is never exposed to
  client-side JS.
- **Every fetch has a same-shaped local JSON fallback.** The site is
  designed to always render — even with no backend, a broken backend, or a
  backend mid-migration — by falling back to `src/content/seed/*.json`.
  Components never import seed JSON directly; only the service layer does.
- **Most routes are static (SSG).** 13 of 14 routes are prerendered to
  static HTML at build time. Only `/updates` (the blog index, for its
  search/sort/tag/pagination query params) is server-rendered per request
  (`export const prerender = false` in `src/pages/updates/index.astro`).
  This has a direct consequence for content freshness — see
  [§16 Known limitations](#16-known-limitations).
- **LocationOne and Monday.com are not API integrations.** Both are plain
  `<iframe>` embeds of third-party vendor apps
  (`src/components/sections/SitesBrowser.astro`,
  `src/components/forms/MondayContactForm.astro`). No REST calls, no
  webhooks, no shared data model with this app. Their allowed origins are
  whitelisted in the CSP `frame-src` directive in both `vercel.json` and
  `src/middleware.ts` — if either vendor's embed URL ever changes, both
  files need updating together.
- **There is no authentication system today.** See
  [§11 Authentication preparation](#11-authentication-preparation).

---

## 2. Folder structure

```
src/
  components/
    layout/       BaseLayout (page shell, SEO/meta, JSON-LD), Seo
    navigation/    Navbar
    footer/        Footer
    sections/      Page sections (heroes, carousels, browsers, CTAs)
    cards/         PropertyCard, TeamCard, BlogCard, ScoreTierCard, AdvantageCard
    forms/         MondayContactForm (embed), SetPasswordForm (React island)
    ui/            Button, Badge, Icon, Logo, SectionHeading + cva variants
  services/wordpress/   <-- THE INTEGRATION LAYER. See §6 below.
    client.ts       wpFetch() — the only place that calls fetch() against WP
    index.ts        Barrel export — import from '@/services/wordpress', not
                     from individual files
    site-settings.ts, properties.ts, team.ts, testimonials.ts, partners.ts,
    scores.ts, advantages.ts, blog.ts, legal.ts, pages.ts
                     One file per content domain, each following the same
                     fetch-then-fallback pattern
  content/seed/    WP-shaped fallback content (JSON). One file per domain,
                   named to match the service that consumes it.
  lib/
    tokens/        Design tokens (colors, spacing, typography, animations,
                   the hero-map's geo data)
    validation/    Reserved for shared Zod schemas — see
                   src/lib/validation/_README.md and §11 below
    utils.ts       `cn()` class-merging helper, etc.
  pages/           File-based routes. api/ is reserved for future auth
                   endpoints — see src/pages/api/_README.md and §11.
  styles/          global.css — Tailwind v4 `@theme` tokens = design system
  types/
    wordpress.ts   Every domain type. THIS is the frontend's data contract
                   — read it alongside §6 below when building WP-side fields.
```

---

## 3. Frontend flow

Every `.astro` page follows the same shape:

```astro
---
import BaseLayout from '@/components/layout/BaseLayout.astro';
import { getSiteSettings, getPageCopy /* , ... */ } from '@/services/wordpress';

const settings = await getSiteSettings();
const copy = (await getPageCopy()).someSectionKey;
---

<BaseLayout title="..." description="...">
  <!-- sections, fed by `copy` / other service calls -->
</BaseLayout>
```

`BaseLayout.astro` owns the `<head>`: title/description, canonical URL,
Open Graph + Twitter cards, JSON-LD (`Organization` on every page, plus
page-specific schema like `BlogPosting`/`BreadcrumbList`), and the
`noindex` meta tag for pages that opt in via a `noindex` prop (currently the
four auth-shell pages).

Interactive pieces (carousels, the set-password form, the animated hero
map) are React islands, hydrated selectively with `client:load` or
`client:visible` directives — everything else ships zero client-side JS.

---

## 4. Content flow

```
Astro page (.astro)
   │
   ▼
src/services/wordpress/<domain>.ts   (getProperties, getTeamMembers, getPageCopy, ...)
   │
   ▼
wpFetch(path)  ──────────────►  WORDPRESS_API_URL + path   (only if env var set)
   │  returns null if unset/failed/non-2xx
   ▼
src/content/seed/<domain>.json      (typed to match src/types/wordpress.ts exactly)
```

Every service function follows this exact pattern:

```ts
export async function getX(): Promise<X[]> {
  const remote = await wpFetch<X[]>('/wp-json/...');
  return remote ?? (seed as X[]);
}
```

`wpFetch()` never throws — it returns `null` on any failure (unset URL,
network error, non-2xx status, invalid JSON) and logs a `console.error`.
Callers never need additional error handling; the `?? seed` fallback is the
entire error-handling strategy, by design, so the site can never fail to
render because of a WordPress outage.

---

## 5. Environment variables

Full reference: [`.env.example`](../.env.example) (the file itself is
heavily commented — read it directly for the authoritative, up-to-date
list). Summary:

| Variable            | Context        | Required? | Effect if unset                                                                        |
| ------------------- | -------------- | --------- | -------------------------------------------------------------------------------------- |
| `WORDPRESS_API_URL` | server, secret | Optional  | Every page renders from `src/content/seed/*.json` (current state of every environment) |

There are no other environment variables. Set `WORDPRESS_API_URL` in the
Vercel project dashboard (Settings → Environment Variables) for
production/preview — it is never read from a committed file in deployed
environments.

---

## 6. API contracts

This is the spec for the backend team: exactly what each frontend service
function expects. Nothing here exists on the WordPress side yet — this is
derived entirely from what the frontend already calls and the exact shapes
in `src/types/wordpress.ts`. The same information also lives as JSDoc
directly above each function in `src/services/wordpress/*.ts` — that's the
canonical, always-in-sync copy; this table is a scannable summary of it.

### 6.1 Stock WordPress REST (standard CPTs, `_embed` for media)

| Content      | Endpoint                                | Method | CPT slug      | Service function                                                                 |
| ------------ | --------------------------------------- | ------ | ------------- | -------------------------------------------------------------------------------- |
| Properties   | `GET /wp-json/wp/v2/property?_embed`    | GET    | `property`    | `getProperties()`, `getFeaturedProperties()`, `getPropertyBySlug()`              |
| Team members | `GET /wp-json/wp/v2/team_member?_embed` | GET    | `team_member` | `getTeamMembers()`                                                               |
| Testimonials | `GET /wp-json/wp/v2/testimonial?_embed` | GET    | `testimonial` | `getTestimonials()`                                                              |
| Partners     | `GET /wp-json/wp/v2/partner?_embed`     | GET    | `partner`     | `getPartners()`                                                                  |
| Blog posts   | `GET /wp-json/wp/v2/posts?_embed`       | GET    | native `post` | `getBlogPosts()`, `getAllBlogTags()`, `getBlogPostBySlug()`, `getAllBlogSlugs()` |

All five require **public read access with no auth header** — `wpFetch()`
sends no credentials. All require `show_in_rest: true` on the CPT
registration. All expect draft/unpublished content excluded from the
response for unauthenticated requests (WordPress's default behavior).

### 6.2 Custom `redi/v1` namespace — must be hand-built

None of these exist in stock WordPress or via ACF-to-REST-API alone.
Someone needs to register a custom REST namespace — typically a small
must-use plugin or a `functions.php`/custom-plugin file using
`register_rest_route('redi/v1', '/route', [...])` — returning JSON shaped
exactly like the corresponding seed file.

| Endpoint                            | Method | Backing seed file (exact shape to match) | Service function       |
| ----------------------------------- | ------ | ---------------------------------------- | ---------------------- |
| `/wp-json/redi/v1/site-settings`    | GET    | `src/content/seed/site-settings.json`    | `getSiteSettings()`    |
| `/wp-json/redi/v1/advantages`       | GET    | `src/content/seed/advantages.json`       | `getAdvantages()`      |
| `/wp-json/redi/v1/score-tiers`      | GET    | `src/content/seed/score-tiers.json`      | `getScoreTiers()`      |
| `/wp-json/redi/v1/scoring-criteria` | GET    | `src/content/seed/scoring-criteria.json` | `getScoringCriteria()` |
| `/wp-json/redi/v1/legal`            | GET    | `src/content/seed/legal.json`            | `getLegalSections()`   |
| `/wp-json/redi/v1/page-copy`        | GET    | `src/content/seed/pages.json`            | `getPageCopy()`        |

Recommended build order: the five stock-REST CPTs first (§6.1), then the
simpler `redi/v1` routes (`advantages`, `score-tiers`, `scoring-criteria`,
`legal`, `site-settings`), and `page-copy` last — it's the largest and most
structurally rigid payload (see the JSDoc in `src/services/wordpress/pages.ts`
for why).

### 6.3 Required fields, per type

Full field-level detail (required vs. optional, exact literal unions like
`BadgeTier`, HTML-safety notes) is documented per-function in
`src/services/wordpress/*.ts` and per-shape in `src/types/wordpress.ts`.
Highlights worth calling out explicitly:

- **`WPImage`** (`{ url, alt, width?, height? }`) is the shape every image
  field must resolve to — `url` and `alt` are required. Native WP
  `_embedded['wp:featuredmedia']` does NOT match this shape out of the box;
  a REST response filter is needed to flatten it (see the TODO in
  `src/services/wordpress/properties.ts`).
- **Literal-union fields are not validated by the frontend** — WordPress
  must constrain them at the source (ACF select/radio fields), since an
  unexpected string has no defined fallback rendering:
  - `Property.tier` / `ScoreTier.tier`: `'platinum' | 'gold' | 'silver' | 'bronze' | 'emerging'`
  - `Partner.variant`: `'photo' | 'wordmark'`
  - `AdvantageItem.icon`: `'map-pin' | 'trending-up' | 'shield-check'`
- **`*Html` fields are rendered as raw, unsanitized HTML`** (`bodyHtml`on`LegalSection`, `contentHtml`on`BlogPost`) via Astro's `set:html`. Safe
  today because content is developer- or trusted-editor-controlled; if that
  trust boundary ever changes, sanitize server-side before this reaches the
  frontend.

### 6.4 Fallback and failure behavior (applies to every endpoint above)

| Scenario                              | Behavior                                                                                                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `WORDPRESS_API_URL` unset             | Falls back to seed JSON. No request is attempted.                                                                                                                                                                                                            |
| Network error / timeout / DNS failure | Falls back to seed JSON. Logged: `[wordpress] failed to fetch <url> <error>`                                                                                                                                                                                 |
| Non-2xx response (404, 500, 403, ...) | Falls back to seed JSON. Logged: `[wordpress] <url> responded <status>`                                                                                                                                                                                      |
| Response body isn't valid JSON        | Falls back to seed JSON (caught as a fetch/parse error).                                                                                                                                                                                                     |
| 2xx response with the wrong shape     | **Not caught.** `wpFetch<T>()` trusts the response matches `T` — a malformed-but-200 response will pass through and can cause a runtime error wherever the frontend reads a missing field. Backend team: match the seed JSON shape exactly, field-for-field. |

There is currently no retry, no caching layer beyond `getPageCopy()`'s
in-process memoization (per request lifecycle only — see that file's
JSDoc), and no circuit breaker. Every request is a fresh fetch on every
page render that needs it.

---

## 7. How to switch from seed JSON to WordPress

1. Stand up WordPress with the CPTs/routes in §6 built and returning data
   shaped exactly like the corresponding `src/content/seed/*.json` file.
2. Set `WORDPRESS_API_URL` (e.g. `https://cms.redisites.com`) — locally in
   `.env`, or in the Vercel dashboard for deployed environments.
3. That's it — no code changes. Every service function tries WordPress
   first automatically. Verify with `isWordPressConnected` (exported from
   `src/services/wordpress/client.ts`) if you need a runtime check/debug
   banner.
4. Recommended rollout order: connect one domain at a time by testing
   against a WP instance that only has _some_ of the routes built —
   `wpFetch()`'s per-call fallback means unbuilt routes will silently keep
   using seed data while built ones go live, so you don't need everything
   finished simultaneously to start integrating.

---

## 8. How to add a new page

1. Create `src/pages/your-route.astro`.
2. Import `BaseLayout` and any content services you need from
   `@/services/wordpress`.
3. If the page needs rich copy blocks, add a new top-level key to
   `src/content/seed/pages.json` and read it via `(await getPageCopy()).yourKey`
   — remember `PageCopy` is inferred from this JSON file
   (`src/services/wordpress/pages.ts`), so adding a key there is enough;
   no type file to update by hand.
4. The route is automatically included in the sitemap unless it matches the
   `noindex`-route filter in `astro.config.mjs` (`sitemap({ filter: ... })`)
   — update that filter if the new page should also be excluded (e.g.
   another auth-shell-style page).
5. Add it to `public/robots.txt` if it should be disallowed from crawling
   entirely (stronger than `noindex` — see the asymmetry note in
   [§16 Known limitations](#16-known-limitations)).

---

## 9. How to add new content to an existing type

- **Seed data (no WordPress yet):** edit the relevant
  `src/content/seed/*.json` file directly, matching the existing shape.
  Changes are picked up on the next dev-server reload / build.
- **Once WordPress is connected:** add the content via the WP admin (new
  `property` post, new `testimonial` post, etc.) — no frontend changes
  needed, since the service layer just fetches whatever WordPress returns.

---

## 10. How to add a new custom post type / content domain

1. Add the shape to `src/types/wordpress.ts`.
2. Create `src/content/seed/your-domain.json` with representative sample
   data matching that shape.
3. Create `src/services/wordpress/your-domain.ts`, following the exact
   pattern used by every other file in that directory:
   ```ts
   import type { YourType } from '@/types/wordpress';
   import seed from '@/content/seed/your-domain.json';
   import { wpFetch } from './client';

   /**
    * <one-paragraph description>
    *
    * Endpoint:  GET /wp-json/wp/v2/your_cpt?_embed  (or /wp-json/redi/v1/your-route
    *            if it's not a simple CPT — see §6.2 above for when a custom
    *            route is needed instead of a stock CPT)
    * ... (full JSDoc block — copy the structure from any existing service file)
    */
   export async function getYourDomain(): Promise<YourType[]> {
     const remote = await wpFetch<YourType[]>('/wp-json/wp/v2/your_cpt?_embed');
     return remote ?? (seed as YourType[]);
   }
   ```
4. Add `export * from './your-domain';` to `src/services/wordpress/index.ts`.
5. Document the new endpoint in §6 of this file, so the backend team's
   contract stays a single source of truth.
6. Build the corresponding WordPress CPT/route per §6.2's guidance.

---

## 11. Authentication preparation

**There is no authentication system in this codebase.** Sign In, Register,
Forgot Password, and Set Password are UI shells only — see each page for a
`TODO(auth)` comment block documenting exactly what needs to be built and
where:

| File                                       | What's there today                        | What the TODO covers                                                             |
| ------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------- |
| `src/pages/sign-in.astro`                  | Form submits `GET /contact`               | Login API request/response contract, session vs. token strategy, error states    |
| `src/pages/register.astro`                 | No form — static "contact us" card        | Register API contract, role assignment, verification flow                        |
| `src/pages/forgot-password.astro`          | Form submits `GET /contact`               | Forgot-password API contract, user-enumeration safety, rate limiting             |
| `src/pages/set-password.astro`             | Renders the form below, no token handling | Reading a reset token from the URL                                               |
| `src/components/forms/SetPasswordForm.tsx` | Simulates success after a 900ms delay     | Reset-password API call, server-error mapping, password-validation strategy      |
| `src/middleware.ts`                        | Security headers only                     | Session/token validation, protected-route gating, refresh-token rotation, logout |
| `src/components/navigation/Navbar.astro`   | Always renders logged-out CTAs            | Where a logged-in state would branch the UI                                      |
| `src/pages/api/_README.md`                 | Directory is empty                        | Expected route list + an example Astro API route handler                         |
| `src/lib/validation/_README.md`            | Directory is empty                        | Where to extract shared password-validation Zod schemas                          |

Read every `TODO(auth)` block before starting auth work — they're written
as a connected spec, not isolated notes (e.g. the token read in
`set-password.astro` feeds the API call documented in
`SetPasswordForm.tsx`).

Recommended sequencing: decide the session strategy (httpOnly cookie vs.
bearer token) and the WordPress-side auth mechanism (JWT plugin,
Application Passwords, or a custom `redi/v1` auth route mirroring §6.2's
pattern) FIRST — every TODO above depends on that decision.

---

## 12. Deployment flow

- **Frontend:** Vercel, via `@astrojs/vercel`. Pushing to `main` is picked
  up by Vercel's Git integration automatically. A GitHub Actions workflow
  (`.github/workflows/ci.yml`) runs lint, format-check, and a full
  typecheck+build on every push/PR against `main` as a pre-merge gate — it
  does not block Vercel's own deploy (Vercel deploys independently of GitHub
  check status unless branch protection is configured on the GitHub side).
  Env vars are set in the Vercel dashboard, not read from a committed file.
- **Local/Windows builds:** `astro.config.mjs` auto-switches to the Node
  adapter (`@astrojs/node`, `mode: 'standalone'`) unless `process.env.VERCEL`
  is set, because the Vercel adapter's packaging step needs symlink
  permissions Windows dev machines typically lack. Vercel's own build
  environment sets `VERCEL=1`, so production builds always use the Vercel
  adapter regardless of what OS triggered the push.
- **Backend:** not part of this repository. WordPress hosting (WP Engine or
  otherwise) is entirely separate infrastructure this repo has no code for
  — see `HANDOFF.md` for what's known/unknown about that environment.
- **Content-freshness model:** see [§16](#16-known-limitations) — most
  routes are static, so WordPress content edits don't appear on the live
  site until the next deploy, unless a revalidation/webhook mechanism is
  added later.

Build commands:

```bash
pnpm install
pnpm build     # runs `astro check` (typecheck) then `astro build`
```

---

## 13. Required WordPress plugins

Nothing is confirmed installed anywhere — this is a requirements list
derived from what the frontend needs, for whoever provisions WordPress:

- **ACF (Advanced Custom Fields)**, likely **ACF Pro** — needed for Options
  Pages (`site-settings`, `advantages`, `score-tiers`, `scoring-criteria`,
  `legal`, `page-copy` all look like options-page/repeater data, not
  per-post content) and flexible-content fields (`page-copy` especially).
- **A way to register custom REST routes** — either a small custom/must-use
  plugin, or theme `functions.php`, implementing `register_rest_route()`
  for the six `redi/v1` endpoints in §6.2. Not a stock plugin; someone
  writes this.
- **A way to register the four custom post types** (`property`,
  `team_member`, `testimonial`, `partner`) with `show_in_rest: true` — via
  code (`register_post_type()`) or a CPT-UI-style plugin, either works as
  long as REST exposure is on.
- **An auth plugin**, if/when WordPress-backed member authentication is
  built (§11) — e.g. a JWT auth plugin, or Application Passwords (built
  into core since WP 5.6) — decision not made yet.
- Pretty permalinks (`/%postname%/` or similar) enabled in Settings →
  Permalinks, so CPT slugs route cleanly.

---

## 14. How to debug

- **"The site shows different content than I expect from WordPress"** —
  check `isWordPressConnected` (from `src/services/wordpress/client.ts`) and
  server logs for `[wordpress]` — every fetch failure logs there with the
  exact URL and status/error. A silent fallback to seed data is the
  default behavior, not a bug, so check logs before assuming WordPress data
  isn't being used.
- **Local dev:** per `CLAUDE.md`, start the dev server in background mode
  (`astro dev --background`; manage with `astro dev stop` / `status` /
  `logs`).
- **Typecheck:** `pnpm typecheck` (`astro check`) — requires TypeScript 5.x
  compatibility; the pinned `typescript` version in `package.json` should
  not be bumped past what `@astrojs/check` supports without verifying.
- **Lint:** `pnpm lint` / `pnpm lint:fix`.
- **A11y:** `node scripts/a11y-audit.mjs` (see `ACCESSIBILITY.md`) runs
  axe-core via Playwright across all routes/viewports against a running dev
  server.

---

## 15. Common issues

| Symptom                                                              | Likely cause                                                                                                                                                                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WordPress data never appears, even with `WORDPRESS_API_URL` set      | Check server logs for `[wordpress] <url> responded <status>` — most commonly a 404 because the CPT/route isn't registered with `show_in_rest: true` yet, or isn't publicly readable                              |
| A field renders as `undefined`/blank                                 | The WP REST response has a 2xx status but the wrong shape — `wpFetch()` does NOT validate response shape (see §6.4), so this fails silently at the point the frontend reads the missing field, not at fetch time |
| An icon/badge/variant doesn't render (falls to a default or nothing) | A literal-union field (§6.3) has an unexpected string value — check the WP-side field is constrained to the exact allowed values                                                                                 |
| Windows local build fails on symlinks                                | Expected — `astro.config.mjs` should already route local builds to the Node adapter; confirm `process.env.VERCEL` isn't accidentally set locally                                                                 |
| `astro check` fails after a TypeScript upgrade                       | See `README.md` — TypeScript 7 is known to break `astro check`; keep the pinned version until compatibility is verified                                                                                          |

---

## 16. Known limitations

These are real, current, repository-verifiable gaps — not speculation:

- **Content-freshness gap.** 13 of 14 routes are static HTML generated at
  build time. Editing content in WordPress will not appear on those routes
  until the next Vercel deploy, unless someone adds on-demand
  revalidation/ISR (not configured today) or a WP-webhook-triggered
  redeploy. This is an open architectural decision, not something already
  solved here.
- **`wpFetch()` doesn't validate response shape.** A 2xx response with a
  missing/wrong-typed field will pass through uncaught (§6.4) — the
  TypeScript types are a contract for the frontend to code against, not a
  runtime guarantee about what WordPress actually returns.
- **No authentication system exists** — see §11. All four auth pages are
  UI shells.
- ~~`robots.txt` and `noindex` meta inconsistent across the four auth-shell
  pages~~ — **resolved.** `/sign-in` and `/set-password` used to also be
  `Disallow`'d in `public/robots.txt`, which is a minor SEO anti-pattern
  when combined with `noindex` (a disallowed page's crawler never fetches
  it, so it never sees the `noindex` tag, and can still get indexed via
  external links with no snippet). All four auth-shell pages now rely
  solely on their `noindex` meta tag (`public/robots.txt` no longer
  disallows any of them) and are already excluded from the sitemap (see the
  `filter` in `astro.config.mjs`).
- **No caching/retry layer** beyond `getPageCopy()`'s per-request-lifecycle
  memoization. Every other service call is a fresh fetch on every render
  that needs it.
