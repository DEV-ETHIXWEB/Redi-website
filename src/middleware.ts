import { defineMiddleware } from 'astro:middleware';
import { SITE_PASSWORD } from 'astro:env/server';

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

/**
 * Pre-launch gate over the whole site, asked for by the client while the site
 * is finished. One shared password, sent as HTTP Basic auth so the browser
 * handles the prompt and remembers it for the session — no login page, no
 * accounts, nothing to clean up afterwards.
 *
 * If `SITE_PASSWORD` is unset the gate does nothing. That is deliberate and
 * matches `SSG_PORTAL_PASSWORD` on /members: an environment that has not been
 * configured keeps working exactly as before instead of locking everyone out,
 * which is the failure mode that actually hurts (a broken local dev setup, or
 * a deploy that 401s the client with no way in).
 *
 * The username is ignored; only the password is checked, so there is one
 * secret to share rather than two. Any username will do.
 *
 * SCOPE, and the honest limit of this approach: every HTML page goes through
 * here, because astro.config.mjs renders on demand while the gate exists. What
 * does NOT go through here is anything served straight off the CDN by path —
 * /images/*, /downloads/*, /_astro/*. Vercel matches `handle: filesystem`
 * before it reaches this function. Someone who already knows an exact asset
 * URL can still fetch it; nothing links to those URLs once the pages are
 * gated, and there is nothing confidential in them, but it is not a vault.
 * Covering assets too needs Vercel's own Password Protection, which is a paid
 * add-on on their plan.
 *
 * At launch: delete SITE_PASSWORD from the Vercel project, remove `output:
 * 'server'` from astro.config.mjs, and delete this block.
 */
// ASCII only: header values are Latin-1, and a non-ASCII character here makes
// constructing the 401 Response throw, which turns the gate into a 500.
const GATE_REALM = 'REDI Sites preview';

/**
 * Compare without leaking how much of the password matched through timing.
 * Overkill for a shared pre-launch password, but it costs nothing and stops
 * this being quietly copied into somewhere that does matter.
 */
function matches(candidate: string, expected: string): boolean {
  if (candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function isAuthorized(request: Request, expected: string): boolean {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    // A malformed header is a failed attempt, not a server error.
    return false;
  }
  // Only the password half is checked; the username is ignored on purpose.
  const separator = decoded.indexOf(':');
  const password = separator === -1 ? '' : decoded.slice(separator + 1);
  return matches(password, expected);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const gatePassword = SITE_PASSWORD;

  if (gatePassword && !isAuthorized(context.request, gatePassword)) {
    const response = new Response('Authentication required.', {
      status: 401,
      headers: {
        'WWW-Authenticate': `Basic realm="${GATE_REALM}", charset="UTF-8"`,
        'Content-Type': 'text/plain; charset=utf-8',
        // Nothing behind the gate should be cached by a proxy or indexed.
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
    for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(header, value);
    }
    return response;
  }

  const response = await next();
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(header)) response.headers.set(header, value);
  }
  // Keep the site out of the index for as long as it is gated, so a crawler
  // that reaches a page another way cannot list it.
  if (gatePassword) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
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
