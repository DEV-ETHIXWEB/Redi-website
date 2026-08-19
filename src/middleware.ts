import { defineMiddleware } from 'astro:middleware';

/**
 * Security headers for SSR responses (updates listing, contact API, and any
 * future dynamic route). Prerendered pages served by Vercel's CDN get the
 * same headers from vercel.json — keep the two lists in sync.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  // 'unsafe-inline' script-src is required by Astro's island hydration
  // scripts and inline JSON-LD.
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    'frame-src https://app.locationone.com https://forms.monday.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
};

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(header)) response.headers.set(header, value);
  }
  return response;
});

// TODO(auth): this middleware currently only sets security headers. Once a
// real member auth system exists (see docs/WORDPRESS_INTEGRATION.md §
// Authentication Preparation), this is also the place to add:
//
//   1. Session/token validation — read the session cookie (or Authorization
//      header, depending on the chosen strategy) via `context.cookies` /
//      `context.request.headers`, and attach the resolved user (or `null`)
//      to `context.locals` so pages/components can read it without each one
//      re-implementing the lookup.
//   2. Protected-route gating — e.g. a future `/dashboard/*` route group
//      would redirect unauthenticated requests to `/sign-in`. There are NO
//      protected routes in this build today; every existing page is public.
//   3. Refresh-token rotation — if using short-lived access tokens, this is
//      a reasonable place to silently refresh an expiring session before it
//      reaches a page handler, rather than making every page handle it.
//   4. Logout is typically just clearing the session cookie / revoking the
//      token server-side; doesn't need middleware, just an
//      `src/pages/api/auth/logout.ts` route — see src/pages/api/_README.md.
//
// Keep this middleware's existing security-header behavior intact when
// adding any of the above — it runs on every request/route today and
// should continue to.
