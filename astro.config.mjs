// @ts-check
import { defineConfig, envField } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { articleSlugs } from './scripts/article-slugs.mjs';

import vercel from '@astrojs/vercel';
import node from '@astrojs/node';

// The Vercel adapter's packaging step requires symlink permissions that
// Windows dev machines typically lack; use the Node adapter for local builds.
const isVercel = Boolean(process.env.VERCEL);

// https://astro.build/config
// Article URLs for the sitemap. /updates/[slug] renders on demand now, so
// nothing else enumerates them — see scripts/article-slugs.mjs.
const articlePages = (await articleSlugs()).map(
  (slug) => `https://www.redisites.com/updates/${slug}`,
);

export default defineConfig({
  site: 'https://www.redisites.com',
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
      // /updates/[slug] is rendered on demand, so the integration cannot see
      // the article URLs by crawling build output. Without this the sitemap
      // would silently lose every article.
      customPages: articlePages,
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
    },
  },

  adapter: isVercel
    ? vercel({
        // Incremental Static Regeneration. The marketing pages opt out of
        // prerendering (see `export const prerender = false` in each) so that
        // editing content in WordPress shows up without anyone running a
        // deploy. Vercel still serves them from its cache — they are only
        // re-rendered once the cached copy is older than `expiration`, so the
        // common request is a cache hit, not a WordPress round trip.
        //
        // The article pages under /updates/[slug] render on demand too, so an
        // edited post is never stale and a newly published one does not 404.
        // Their sitemap entries come from `customPages` above instead of from
        // `getStaticPaths()`.
        isr: { expiration: 600 },
      })
    : node({ mode: 'standalone' }),
});
