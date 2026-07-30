# REDI Sites

**Client:** Site Selectors Guild (parent company: Strata Platforms)

## What this project is

REDI Sites (Readiness Evaluation for Development and Investment) is the marketing website for a national site-readiness rating program administered by the Site Selectors Guild. It presents the REDI Score methodology, a searchable database of certified commercial development sites, the Guild's mission and team, and lead-generation flows (contact, site registration, member sign-in) for investors, developers, and site selectors.

## Tech stack

| Concern         | Choice                                                               |
| --------------- | -------------------------------------------------------------------- |
| Framework       | Astro 7 (static-first, React islands for interactive components)     |
| Language        | TypeScript (strict)                                                  |
| Styling         | Tailwind CSS v4 (`@theme` design tokens in `src/styles/global.css`)  |
| CMS             | Headless WordPress (REST + ACF shapes) with local seed-JSON fallback |
| Forms           | React Hook Form + Zod (auth); LocationOne + Monday.com iframe embeds |
| Animation       | Framer Motion (islands), CSS transitions elsewhere                   |
| Icons           | lucide (static SVG in Astro, `lucide-react` in islands)              |
| Fonts           | Bevan, Oswald Variable, Nunito Variable via Fontsource               |
| Package manager | pnpm                                                                 |
| Deployment      | Vercel (`@astrojs/vercel`); Node adapter used for local builds       |
| Quality         | ESLint, Prettier, Husky, lint-staged, commitlint, `astro check`      |

## How to set it up locally

1. Install Node.js `>=22.12.0` and [pnpm](https://pnpm.io/installation).
2. Clone the repo and install dependencies:
   ```bash
   pnpm install
   ```
3. Copy the environment template and fill in any values you have access to:
   ```bash
   cp .env.example .env
   ```
   Every variable is optional — with none set, the site renders fully from the local seed content in `src/content/seed/`.
4. Start the dev server:
   ```bash
   pnpm dev
   ```
   The site runs at `http://localhost:4321`.
5. Before committing, run:
   ```bash
   pnpm lint
   pnpm format
   pnpm build   # runs `astro check` + a production build
   ```

## Environment variables needed

Defined in `.env.example` (copy to `.env`, never commit real values). Full
detail — including exact fallback/failure behavior and the API contract each
service expects — is in [`docs/WORDPRESS_INTEGRATION.md`](docs/WORDPRESS_INTEGRATION.md).

| Variable            | Required? | Purpose                                                                                                                       |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `WORDPRESS_API_URL` | Optional  | Headless WordPress origin. Unset (the default today) → every page renders from the local seed content in `src/content/seed/`. |

There are no other environment variables in this project today. (A previous
`PUBLIC_GOOGLE_MAPS_API_KEY` variable was removed during the pre-handoff
cleanup — it was declared but never consumed by any component; the Sites
page uses a LocationOne iframe embed, not Google Maps.)

## Deployment notes

- Deploys to **Vercel** via `@astrojs/vercel`. Environment variables above must be set in the Vercel project's dashboard (Settings → Environment Variables) — they are not read from `.env` in production.
- Windows local dev/build quirk: the Vercel adapter's packaging step needs symlink permissions Windows typically lacks, so `astro.config.mjs` automatically falls back to the Node adapter for local builds unless `process.env.VERCEL` is set (Vercel's own build environment sets this, so production builds are unaffected).
- `astro check` requires TypeScript 5.x — TypeScript 7 breaks it; keep the pinned `typescript` version in `package.json` until that's verified compatible.
- No other manual deploy steps — pushing to `main` is picked up by Vercel's Git integration.

## Key contacts

| Role            | Name  | Contact                                       |
| --------------- | ----- | --------------------------------------------- |
| Project manager | Amar  | [amar@ethixweb.com](mailto:amar@ethixweb.com) |
| Lead dev        | Akash |                                               |
| Developer       | Yash  |                                               |

## Content layer

Components never import seed JSON directly; they call typed services in `src/services/wordpress/`. Each service tries the WordPress REST API (`WORDPRESS_API_URL`) first and falls back to `src/content/seed/*.json`, which mirrors the exact WP/ACF response shapes (custom post types: `property`, `team_member`, `testimonial`, `partner`; options endpoints under `/wp-json/redi/v1/*`). Pointing at a live WP instance is a config change, not a code change.

## Design source

The Figma file for this project could not be shared with API access, so the build was produced from full-page design exports — colors were pixel-sampled from those exports and the type was matched to the closest Google Fonts (Bevan / Oswald / Nunito). Image assets were extracted from the exports; text, logos, and UI chrome were rebuilt as real HTML/CSS. When Figma access becomes available, tokens in `src/styles/global.css` + `src/lib/tokens/` are the single place to reconcile any drift.

The raw exports themselves (full-page PNGs, plus a larger internal reference set that included unbuilt member-dashboard mockups) live in `design-assets/` locally — that folder is gitignored on purpose, since these are large internal references, not site assets. They are **not** required to build or run the site; nothing in `src/` reads from `design-assets/`.

## Structure

```
src/
  components/
    layout/       BaseLayout, Seo
    navigation/   Navbar
    footer/       Footer
    sections/     Page sections (heroes, carousels, browsers, CTAs)
    cards/        PropertyCard, TeamCard, BlogCard, ScoreTierCard, AdvantageCard
    forms/        MondayContactForm (embed), SetPasswordForm (React island)
    ui/           Button, Badge, Icon, Logo, SectionHeading + cva variants
  services/wordpress/   Typed CMS client + per-type services
  content/seed/         WP-shaped fallback content
  lib/                  tokens, utils, validation/ (reserved — see src/lib/validation/_README.md)
  pages/                Routes (+ rss.xml), api/ (reserved for future auth endpoints)
  styles/               global.css (Tailwind v4 theme = design tokens)
  types/                wordpress.ts domain types
```

## Routes

`/` · `/about` · `/approach` · `/sites` · `/updates` (SSR: search/sort) · `/updates/[slug]` · `/contact` · `/legal` · `/set-password` · `/sign-in` · `/register` · `/rss.xml` · `/404` · sitemap
