# `src/lib/validation/`

Reserved for shared Zod validation schemas once more than one form needs the
same rules.

Currently, `setPasswordSchema` (password min/max length + confirm-password
match) lives inline in `src/components/forms/SetPasswordForm.tsx` because
it's the only form that needs it. When the Register (`src/pages/register.astro`)
and/or Login (`src/pages/sign-in.astro`) forms are built out with real
client-side validation (see the `TODO(auth)` comments in those files), move
the password schema here and import it from both places rather than
duplicating the rules.

An earlier contact-form implementation (removed when the Monday.com embed
replaced it) kept its Zod schemas in this folder — this is that same
convention, not a new one.
