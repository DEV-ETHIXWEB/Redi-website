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

### 6.2 Custom `redi/v1` namespace — currently disconnected

> **The app calls no route in this namespace, and that is still true.** They
> are listed here as the contract that was never made editable. Everything in
> this namespace is read from `src/content/seed/` instead — see §6.2.1 for why.
>
> Page copy is the exception, and it did **not** come back through this
> namespace: it is editable as of 2026-11-04 through a separate
> `ethixweb/v1` namespace that overlays rather than replaces. See §6.2.2.
> `redi/v1/page-copy` still answers, still serves the 2026-09-04 export, and
> nothing reads it.

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
| `/wp-json/redi/v1/page-copy`        | GET    | `src/content/seed/pages.json`            | none — see §6.2.2      |

Recommended build order, if this namespace is ever implemented for real: the
five stock-REST CPTs first (§6.1), then the simpler `redi/v1` routes
(`advantages`, `score-tiers`, `scoring-criteria`, `legal`, `site-settings`).
Do not reimplement `page-copy` here — it is already editable via §6.2.2, and
two sources for the same copy is how the original bug happened.

#### 6.2.1 Why these routes are not called

The live WordPress does answer every route above, but **it is not a CMS for
them.** Its responses are a one-time export of this repo's seed files, taken
at some point in the past and never edited since. Proved on 2026-10-09 by
diffing each live response against every git revision of the matching seed
file; each one matches an old commit byte for byte:

| Route              | Matches seed at      | Dated      |
| ------------------ | -------------------- | ---------- |
| `page-copy`        | `4975991`            | 2026-09-04 |
| `advantages`       | `6c00dea` (initial)  | 2026-07-19 |
| `score-tiers`      | `6c00dea` (initial)  | 2026-07-19 |
| `site-settings`    | current seed         | —          |
| `scoring-criteria` | current seed         | —          |
| `legal`            | current seed         | —          |
| `core-documents`   | not registered (404) | —          |

Because the services merged with WordPress winning, that frozen export
silently overrode every content change made in this repo after those dates.
It is not a theoretical risk — it shipped these defects to production:

- The homepage ran the pre-September hero ("Prime Sites" / "Strategic
  Investments" / "Search Sites") and the old Why Choose copy.
- `/approach` ran entirely superseded copy.
- Why Choose showed 3 placeholder advantages ("Prime Locations", "Expert
  Analysis", "Proven Returns") instead of the 7 real ones, all rendering the
  same icon because the stale `icon` values (`map-pin`, `trending-up`) are not
  in `ADVANTAGE_ICONS` and get coerced to `badge-check`.
- The REDI score tiers were listed Platinum-first and **two tiers shared the
  same 6.0 - 6.9 range and the same description**.

Nothing failed or logged while this was happening — a copy change could be
committed, built and deployed and still be invisible. `scripts/wp-content-sync.mjs`
cannot write these routes either, so it could not be fixed from the CMS side.

**The split now is:** site settings, advantages, score tiers, scoring
criteria, legal and core documents are owned by this repo. Page copy is
owned by this repo _and_ overlaid by WordPress (§6.2.2) — the repo holds the
approved wording, WordPress can change it, and a blank field changes nothing. The five
stock CPTs in §6.1 (`post`, `property`, `team_member`, `testimonial`,
`partner`) are owned by WordPress and are unaffected — the client edits those
daily and they publish automatically via the deploy hook.

**To hand any of these back to WordPress:** build a real editable screen for
it, then restore the `wpFetch` call and the `deepMerge(seed, remote)` (or
`normalize.list(remote, seed, …)`) line in that route's service function, and
delete its "read from the seed" comment. Do not restore the call before the
WordPress side is genuinely editable, or the same silent-override bug comes
straight back.

#### 6.2.2 The `ethixweb/v1` namespace — page copy, editable for real

Added 2026-11-04, after the client asked for the marketing pages to be
editable, then extended the same day to cover everything else the repo owned.
Served by the **REDI Page Editor** plugin (built in this repo, see below), not
by REDI Headless CMS.

**Thirteen wp-admin screens, 153 fields.** The seven marketing pages, plus the
six content domains that §6.2.1 had left repo-owned:

| Screen                                                | Overlays                | Rows                            |
| ----------------------------------------------------- | ----------------------- | ------------------------------- |
| Home, About, Approach, Contact, Sites, Updates, Legal | `pages.json`            | mixed                           |
| Why Choose Cards                                      | `advantages.json`       | add/remove                      |
| Legal Sections                                        | `legal.json`            | fixed                           |
| REDI Score Tiers                                      | `score-tiers.json`      | fixed                           |
| Core Documents                                        | `core-documents.json`   | add/remove                      |
| Scoring Criteria                                      | `scoring-criteria.json` | weights fixed, lists add/remove |
| Site Settings                                         | `site-settings.json`    | fixed                           |

Every service reads the **same** request — `getContentOverrides()` in
`src/services/wordpress/content-overrides.ts` memoizes it per module instance,
so seven services asking during one render make one call, not seven.

| Endpoint                         | Method | Auth | Service function |
| -------------------------------- | ------ | ---- | ---------------- |
| `/wp-json/ethixweb/v1/page-copy` | GET    | none | `getPageCopy()`  |

**It returns a partial tree, and that is the whole design.** The response is
shaped like `src/content/seed/pages.json` but contains only the fields an
editor has actually typed into. Nothing is required. An absent key means "no
change".

`getPageCopy()` then _overlays_ it onto the seed
(`src/services/wordpress/page-copy-overlay.ts`), walking the **seed's** shape
and asking WordPress for a replacement at each leaf. The consequences are
worth stating explicitly, because they are the difference between this and the
route it replaces:

- a field left blank keeps the copy already on the site;
- a key WordPress invents is never read;
- a value of the wrong type is ignored rather than rendered;
- the result always has exactly the seed's shape, so no page can render
  `undefined` because WordPress omitted a section.

So the worst case is "the CMS changed nothing", not "the CMS wiped the page".
A half-filled screen in wp-admin cannot blank a section. Compare §6.2.1,
where WordPress won outright and a stale export silently overrode a month of
approved copy with nothing failing or logging.

**Where the plugin comes from.** `wordpress-plugins/redi-page-editor/` is
generated, not hand-written:

```
pnpm wp:pages          # regenerate + package wordpress-plugins/redi-page-editor.zip
pnpm wp:pages:check    # fail if the plugin is out of date with pages.json
pnpm verify:page-copy   # prove every field reaches the site, and blanks do not blank it
```

The plugin needs one ACF field per editable string — 120 of them. Kept by hand
they would drift from the site the first time the copy changed shape, and **a
field whose path no longer resolves fails silently**: the client types, saves,
sees "Updated", and the site does not change. So the field list is derived from
the same file the site renders, and `pnpm verify:page-copy` fills in all 120
with unique markers and checks each one comes out at the right place — plus
cross-checks that the plugin's own PHP expands those paths identically.

**After editing `src/content/seed/pages.json`**, run `pnpm wp:pages`, commit
the regenerated plugin, and re-upload the zip in wp-admin so the new field
appears. `pnpm wp:pages:check` is there to catch the commit that forgets.

Re-uploading a zip over an active plugin does **not** fire WordPress's
activation hook, so the plugin re-checks its own pages on `admin_init` when its
version changes. The version carries a hash of the field list
(`REDI_PAGES_VERSION`), so any copy change bumps it automatically — otherwise a
regenerated plugin that adds a page would register fields for a page that was
never created, and the editor would just not see it. The re-check reuses any
page that already has the slug and only writes defaults into pages it creates,
so nothing already typed is overwritten.

**What is deliberately not editable:**

- **Links, images, icons, alt text and machine keys** (`href`, `url`, `image`,
  `icon`, `alt`, `id`, `tier`, `color`, `slug`). Handing a copy editor a URL or
  an icon name invites a broken page, and components look values up by the
  machine keys — `iconMap[advantage.icon]`, the badge image per tier — so a typo
  there removes an icon or a badge with no warning.
- **Numbers.** The only ones are the five scoring weights, which must total
  100%; changing one is a programme decision, not copy.
- **The length of a list whose count is structure, not copy.** The five
  scoring weights are the national standard and must total 100%; the five
  designation levels are the programme itself and each carries a badge image
  that exists only for those five; the legal sections are fixed documents with
  anchors pointing at them; nav and footer rows need an `href`, which editors
  are not given, so a new row could only point at the wrong page. Their text is
  still fully editable.

  Everywhere else, **rows can be added and removed**: the core documents table,
  the process steps, the methodology benefits, the value-comparison rows, the
  Why Choose cards, and the primary-criteria and eligibility lists. ACF free
  has no Repeater, so those lists are one textarea with a block per row and a
  blank line between — the first line of a block is the first field, the rest is
  the second. Removing a block removes the row.

  A row the editor adds is laid over the corresponding seed row, or over the
  first one if it is past the end, so keys they never see — ids, icons,
  colours, badge images — always arrive with working values rather than
  `undefined`.

- **Copy that nothing renders.** `sites.resultsLabelTemplate`,
  `sites.favorites`, `sites.toolbar`, `updates.resultsLabelTemplate` and
  `siteSettings.stats` (the stats bar removed on 2026-10-16) sit in the seed but
  are rendered nowhere — `SitesBrowser` takes no props and
  hardcodes its own map-toolbar labels. They are excluded rather than shown,
  because a field that silently does nothing looks exactly like a broken CMS.
  `pnpm verify:page-copy` re-checks that they are still unrendered, so one
  becoming live is reported rather than quietly left out.
- **`setPassword`** — part of the auth flow, not marketing copy.

**Blank means "no change" in both directions**, which is the one deliberate
asymmetry: an editor cannot empty a heading or a CTA label by clearing the
field, because for a field that carries layout, restoring the approved wording
is the safe direction. Copy that should disappear is a code change.

**Supersedes REDI Home Editor 1.x.** That plugin served
`ethixweb/v1/home-copy` for the home page only; nothing reads that route now.
It must be **deactivated** — left active it registers a competing field group
on the same `redi-home` page. Its page is reused on activation, so the page
itself survives; its field _values_ do not carry over, because the field names
changed.

#### 6.2.3 WP Engine caches every one of these routes for 10 minutes

Not a quirk worth filing away — it silently broke publishing until 2026-11-04.

Every REST route this app reads comes back cached, the five CPT collections in
§6.1 as well as `ethixweb/v1/page-copy`:

```
x-cacheable: SHORT
cache-control: max-age=600, must-revalidate
x-cache: HIT: 3
```

The Vercel Deploy Hook (§12) fires the moment an editor saves, the build starts
within a minute, and it then fetches a response that can be ten minutes old. So
**the edit that triggers a deploy is routinely missing from the deploy it
triggered.** The editor sees "Updated", the site does not change, and a later
unrelated deploy quietly picks it up. Nothing errors or logs, so it reads as
flaky rather than broken.

`wpFetch()` therefore sends `Cache-Control: no-cache` on every request. Do not
remove it to "reduce load on WordPress" — the load is one uncached round trip
per serverless instance, since each service memoizes its result for the life of
the module, and the alternative is content that publishes whenever it feels
like it.

**When testing this WordPress by hand, a plain `curl` of a REST route shows
stale data.** Send `-H 'Cache-Control: no-cache'`, or you will conclude a save
did not work when it did. Demonstrated on 2026-11-04: the same URL in the same
second returned `Legalities` plain and `Legalities Test` with the header.

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
  - `AdvantageItem.icon`: `'eye' | 'globe' | 'shield-check' | 'badge-check' | 'route' | 'megaphone' | 'zap'`
- **`*Html` fields are rendered as raw, unsanitized HTML`** (`bodyHtml`on`LegalSection`, `contentHtml`on`BlogPost`) via Astro's `set:html`. Safe
  today because content is developer- or trusted-editor-controlled; if that
  trust boundary ever changes, sanitize server-side before this reaches the
  frontend.

### 6.4 Fallback and failure behavior (applies to every endpoint above)

| Scenario                              | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `WORDPRESS_API_URL` unset             | Falls back to seed JSON. No request is attempted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Network error / timeout / DNS failure | Falls back to seed JSON. Logged: `[wordpress] failed to fetch <url> <error>`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Non-2xx response (404, 500, 403, ...) | Falls back to seed JSON. Logged: `[wordpress] <url> responded <status>`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Response body isn't valid JSON        | Falls back to seed JSON (caught as a fetch/parse error).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2xx response with the wrong shape     | **Reconciled against the seed, not trusted.** Object endpoints are deep-merged onto their seed (`getPageCopy()`), so a field WordPress omits falls back instead of rendering `undefined`; collection endpoints coerce each item to the type contract (`src/services/wordpress/normalize.ts`), and a non-array body falls back to seed. This exists because a malformed-but-200 response used to crash the prerender and fail the whole build. Backend team: still match the seed shape field-for-field — the frontend no longer breaks, but whatever WordPress omits silently shows seed content instead of yours. |

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

**Confirmed installed and in use** on the client's WordPress:

- **ACF (Advanced Custom Fields), free edition.** Not Pro. This is a
  constraint, not a preference — no Options Pages, no Repeater, no Flexible
  Content. It is why page copy lives on real WordPress pages rather than an
  options screen, why prose blocks are one textarea split on blank lines, and
  why list items cannot be added or removed in wp-admin (§6.2.2, §16).
- **REDI Headless CMS** — registers the four CPTs and the `redi/v1`
  namespace. Its `redi/v1` routes serve a frozen export and nothing reads
  them (§6.2.1).
- **REDI Page Editor** (Ethixweb, generated from this repo) — makes the
  marketing page copy editable and serves `ethixweb/v1/page-copy` (§6.2.2).
  Source: `wordpress-plugins/redi-page-editor/`. **Supersedes REDI Home
  Editor, which must be deactivated.**
- **REDI Auto Deploy** (Ethixweb) — pings the Vercel deploy hook when content
  is saved, so publishing does not need a developer (§12). REDI Page Editor
  calls into it on save, since it watches the CPTs rather than pages.
- **REDI Post Fields** / **REDI Admin Fix** (Ethixweb) — restore the core REST
  keys that were making the wp-admin editor unusable for all five CPTs.

Still only a requirement, not confirmed:

- **A way to register custom REST routes** for the remaining `redi/v1`
  endpoints in §6.2, if they are ever made editable. Not a stock plugin;
  someone writes this. Note that `page-copy` is already handled (§6.2.2) and
  should not be reimplemented there.
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
- **ACF free edition caps what page copy can do.** Editors can change the
  text of any item in a structured list (the five readiness categories, the
  process steps, the two comparison columns) but cannot add or remove items,
  because ACF free has no Repeater field. Prose blocks are the exception —
  those are one textarea split on blank lines, so paragraph count is free.
  Adding or removing a _row_ is still a code change to
  `src/content/seed/pages.json` plus `pnpm wp:pages`. ACF Pro would lift this.
- **The page-editor plugin has to be re-uploaded when the copy shape changes.**
  Its field list is generated from `pages.json` (§6.2.2), so adding a new
  heading in the repo means running `pnpm wp:pages` and uploading the zip
  again before the client can edit it. `pnpm wp:pages:check` catches the
  commit that forgets; nothing catches the upload that is never done.
