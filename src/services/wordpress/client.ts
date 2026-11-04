import { WORDPRESS_API_URL } from 'astro:env/server';

/**
 * Core HTTP client for the headless WordPress content layer.
 *
 * Every function in `src/services/wordpress/*.ts` calls `wpFetch()` instead
 * of `fetch()` directly. This is the ONLY place that talks to WordPress —
 * centralizing it here means the "point at a real WP instance" step (once
 * the backend exists) is a single env var, not a code change anywhere else.
 *
 * Full API contract for every domain endpoint (expected shapes, required
 * plugins, custom routes to build) lives in `docs/WORDPRESS_INTEGRATION.md`.
 * That document is the source of truth for the backend team; the JSDoc on
 * each service function below is the source of truth for frontend devs.
 */

/**
 * Fetches JSON from the configured WordPress REST API and returns it typed
 * as `T`, or `null` if WordPress isn't reachable/configured for any reason.
 *
 * Runs server-side only (imported via `astro:env/server`), so browser CORS
 * does not apply to these requests — see docs/WORDPRESS_INTEGRATION.md §CORS.
 *
 * **Request**
 * - `path` — a full REST path starting with `/wp-json/...`
 *   (e.g. `/wp-json/wp/v2/property?_embed` or `/wp-json/redi/v1/site-settings`).
 *   Joined onto `WORDPRESS_API_URL` with duplicate slashes collapsed.
 * - `init` — standard `RequestInit`, merged with a default
 *   `Accept: application/json` and `Cache-Control: no-cache` headers, plus a
 *   `_redi=<timestamp>` cache-busting parameter — see the comment in the body
 *   for why the parameter, not the header, is what defeats WP Engine's cache.
 *   No auth header is sent — every
 *   endpoint this app calls is expected to be publicly readable (see
 *   docs/WORDPRESS_INTEGRATION.md §Authentication for why, and what would
 *   need to change if a route ever requires auth).
 *
 * **Returns `null` (never throws) when:**
 * 1. `WORDPRESS_API_URL` is unset — WordPress is not configured at all. This
 *    is the current, expected state of every environment today.
 * 2. The HTTP response status is not `2xx` — e.g. `404` (route/CPT doesn't
 *    exist yet — very likely during initial WP setup), `500` (WP-side PHP
 *    error), `403` (route exists but isn't publicly readable). Logged as
 *    `[wordpress] <url> responded <status>`.
 * 3. The request throws — DNS failure, connection refused, timeout, or the
 *    response body isn't valid JSON. Logged as
 *    `[wordpress] failed to fetch <url> <error>`.
 *
 * **A `null` return is not the only thing callers must handle.** `wpFetch()`
 * guarantees "valid JSON or null" — it does NOT guarantee that the JSON
 * matches `T`. WordPress happily returns `200` with a half-filled CPT (ACF
 * fields an editor hasn't completed come back `undefined`) or with an error
 * body like `{code, message}` where a collection was expected, and neither
 * is caught by a `?? seed` fallback. Since components dereference required
 * fields directly (`member.photo.url`), that mismatch crashes the prerender
 * and fails the whole build — which is exactly what happened to `/approach`
 * in production.
 *
 * So domain services in this directory do two things, not one: fall back to
 * seed when this returns `null`, and reconcile whatever JSON did arrive
 * against the expected shape — `deepMerge` onto the seed for the object
 * endpoints (see ./pages.ts), the coercions in ./normalize.ts for the
 * collection endpoints. The site then always renders, whether WordPress is
 * down, misconfigured, half-populated, or returning something unexpected.
 *
 * TODO(backend): once real endpoints exist, verify each one returns `2xx`
 * with `Content-Type: application/json` even for empty result sets (e.g. a
 * CPT with zero published posts should return `[]` with `200`, not `404`) —
 * a `404` on an empty-but-valid collection would incorrectly trigger the
 * seed fallback instead of rendering an empty state.
 */
export async function wpFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!WORDPRESS_API_URL) return null;

  const base = WORDPRESS_API_URL.replace(/\/+$/, '');
  const joined = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  /*
    Cache-busting parameter. WP Engine caches every REST route this app reads
    for 10 minutes (`x-cacheable: SHORT`, `cache-control: max-age=600`), which
    breaks publishing: the deploy hook fires the moment an editor saves, the
    build starts within a minute, and it would otherwise fetch a response up to
    ten minutes old - so the edit that triggered the deploy is missing from the
    deploy it triggered. Nothing errors; it just looks flaky.

    A unique URL is used rather than a `Cache-Control: no-cache` request header
    because the header does NOT work here. Measured on 2026-11-04 against the
    live install, with a known-fresh value sitting in WordPress: six consecutive
    requests sending that header all came back `x-cache: HIT` with stale data,
    while the same URL with a changing query parameter returned the new value
    every time. The header is still sent below, but it is not what does the job.
  */
  const url = `${joined}${joined.includes('?') ? '&' : '?'}_redi=${Date.now()}`;

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        // Belt and braces alongside the cache-busting parameter above, which is
        // what actually defeats WP Engine's cache. Harmless on its own.
        'Cache-Control': 'no-cache',
        ...init?.headers,
      },
    });
    if (!res.ok) {
      console.error(`[wordpress] ${url} responded ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[wordpress] failed to fetch ${url}`, err);
    return null;
  }
}

/**
 * `true` once `WORDPRESS_API_URL` is set, regardless of whether that URL is
 * actually reachable or returns valid data. Useful for diagnostics/debug
 * banners; NOT a guarantee that any given endpoint will succeed — individual
 * `wpFetch()` calls can still fail and fall back to seed data even when this
 * is `true` (e.g. WP is up but a specific custom route isn't registered yet).
 */
export const isWordPressConnected = Boolean(WORDPRESS_API_URL);
