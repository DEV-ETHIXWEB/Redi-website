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
      // Shared password gating /sites (see src/pages/sites.astro). Unset ->
      // the gate is a no-op and /sites stays public, so every environment
      // that hasn't configured this keeps working exactly as before.
      SITES_GATE_PASSWORD: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },

  adapter: isVercel ? vercel() : node({ mode: 'standalone' }),
});
