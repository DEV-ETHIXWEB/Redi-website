// @ts-check
import { defineConfig, envField } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';
import node from '@astrojs/node';

// The Vercel adapter's packaging step requires symlink permissions that
// Windows dev machines typically lack; use the Node adapter for local builds.
const isVercel = Boolean(process.env.VERCEL);

// https://astro.build/config
export default defineConfig({
  site: 'https://www.redisites.com',

  // TEMPORARY, FOR THE PRE-LAUNCH PASSWORD GATE. Remove this line at launch.
  //
  // The gate lives in src/middleware.ts, and Astro middleware only runs for
  // routes that are rendered on demand. Verified against the generated Vercel
  // output: `handle: filesystem` is matched before the middleware function, so
  // with the default static output every prerendered page (home, about,
  // approach, contact, legal, register, the article pages) is served straight
  // off the CDN and never reaches the gate. Rendering on demand is what puts
  // every page behind it.
  //
  // Vercel's own Password Protection would cover static assets too, but on
  // their Pro plan it is a $150/month add-on, so this is the no-cost route.
  //
  // Reverting is this one line: delete it and the site goes back to being
  // fully static, exactly as it was. `getStaticPaths()` in
  // src/pages/updates/[slug].astro is deliberately left in place for that
  // reason — it is ignored (with a build warning) while this is set, and the
  // route falls back to looking the post up from `Astro.params.slug`, which it
  // already did.
  // DISABLED 2026-10-19 after a production incident: with this set, /legal and
  // every /updates/[slug] article returned 500 on Vercel while the rest of the
  // site rendered fine. Same two route groups, and the same signature, as the
  // ISR attempt that was reverted in ec33bdf and never root-caused.
  //
  // The password gate in src/middleware.ts needs this to cover static pages, so
  // the gate is currently inert for them. Do not re-enable it to switch the
  // gate on until the 500 is understood: it takes /legal and the articles down
  // with it. Diagnosis needs the Vercel function logs for the failing
  // deployment, which is the same thing the ISR investigation was blocked on.
  // output: 'server',
  trailingSlash: 'never',
  integrations: [
    react(),
    sitemap({
      // Exclude the auth-shell routes: each already sets `noindex` in its
      // <BaseLayout> meta tags (see src/pages/{sign-in,register,forgot-password,set-password}.astro),
      // so listing them in the sitemap sent a contradictory signal to
      // search engines. Keep this filter's route list in sync with the
      // `noindex` prop on those pages if either changes.
      filter: (page) =>
        !['sign-in', 'register', 'forgot-password', 'set-password'].some((route) =>
          page.endsWith(`/${route}`),
        ),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  image: {
    remotePatterns: [{ protocol: 'https' }],
  },

  env: {
    schema: {
      // Headless WordPress origin. Unset -> every src/services/wordpress/*
      // service falls back to src/content/seed/*.json. See .env.example and
      // docs/WORDPRESS_INTEGRATION.md for the full contract.
      WORDPRESS_API_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Shared password gating /members (see src/pages/members.astro) — the
      // Site Selectors Guild-only LOIS map. Unset -> the gate is a no-op and
      // /members stays public, so every environment that hasn't configured
      // this keeps working exactly as before rather than silently locking
      // everyone out.
      SSG_PORTAL_PASSWORD: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      // Pre-launch gate over the WHOLE site (see src/middleware.ts). Unset ->
      // no gate at all, so local dev and any environment that has not set it
      // behave exactly as before rather than locking everyone out. Set it on
      // the client's Vercel project to turn the gate on; delete it at launch.
      SITE_PASSWORD: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },

  adapter: isVercel ? vercel() : node({ mode: 'standalone' }),
});
