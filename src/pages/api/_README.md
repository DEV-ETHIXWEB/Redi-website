# `src/pages/api/`

This directory is intentionally empty today — there is no backend/auth API
in this build. It exists as the designated home for future Astro API
routes (endpoint handlers, as opposed to page routes), primarily
authentication.

## TODO(auth): expected routes

When member authentication is built (see `docs/WORDPRESS_INTEGRATION.md` §
Authentication and the `TODO(auth)` comments in `src/pages/sign-in.astro`,
`src/pages/register.astro`, `src/pages/forgot-password.astro`,
`src/pages/set-password.astro`, `src/components/forms/SetPasswordForm.tsx`,
and `src/middleware.ts`), the routes those TODOs assume are:

| Route                                   | Method | Purpose                                                       |
| --------------------------------------- | ------ | ------------------------------------------------------------- |
| `src/pages/api/auth/login.ts`           | POST   | Sign in, issue session/token                                  |
| `src/pages/api/auth/register.ts`        | POST   | Create account (if self-serve registration is ever built)     |
| `src/pages/api/auth/forgot-password.ts` | POST   | Send password-reset email                                     |
| `src/pages/api/auth/reset-password.ts`  | POST   | Consume a reset token, set new password                       |
| `src/pages/api/auth/logout.ts`          | POST   | Clear session / revoke token                                  |
| `src/pages/api/auth/refresh.ts`         | POST   | Rotate a short-lived access token, if that strategy is chosen |
| `src/pages/api/auth/session.ts`         | GET    | Return the current user for the active session, or 401        |

## Shape of an Astro API route (for reference)

```ts
// src/pages/api/auth/login.ts
import type { APIRoute } from 'astro';

export const prerender = false; // API routes must opt out of static generation

export const POST: APIRoute = async ({ request, cookies }) => {
  const { email, password } = await request.json();
  // ...validate, call WordPress auth endpoint, set a cookie via `cookies.set(...)`...
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

## Where these routes should call

These handlers are the natural place to call whatever WordPress-side auth
mechanism is chosen (JWT auth plugin, Application Passwords, or a custom
`redi/v1` auth namespace mirroring the pattern already used by
`src/services/wordpress/*.ts`) — keeping auth calls server-side here, rather
than calling WordPress directly from the browser, avoids exposing WP
credentials/tokens to client-side JS and sidesteps any CORS configuration on
the WordPress side.

Delete this file once real routes exist here.
