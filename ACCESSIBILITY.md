# Accessibility — WCAG 2.1 AA Remediation

This site targets **WCAG 2.1 Level AA** conformance, verified with automated
auditing using the same rules engine (axe-core) that accessibility scanners and
ADA demand letters rely on.

## Running the audit

```bash
# terminal 1 — start the site
pnpm dev            # (or: npx astro dev --background)

# terminal 2 — scan every route at desktop + mobile
node scripts/a11y-audit.mjs

# scan a single route while iterating
node scripts/a11y-audit.mjs /contact
```

The script (`scripts/a11y-audit.mjs`) loads every route in real Chromium via
Playwright and runs axe-core against the full Level A/AA ruleset
(`wcag2a, wcag2aa, wcag21a, wcag21aa`) at two viewports (1366×900 and 390×844)
with reduced motion emulated. It writes a full JSON report to `.a11y/report.json`
and prints a summary grouped by rule. Exit code is non-zero if any violation is
found, so it can gate CI.

## Latest result

**0 violations** across 24 routes × 2 viewports (48 scans).

## Remediation history — 2026-07-28

Baseline audit found **32 violation nodes, all `color-contrast` (serious)**.
Grouped by root cause and fixed at the source:

| #   | Root cause                                                                                                                              | Where                                     | Fix                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Score-tier range labels (platinum/gold/silver/bronze) rendered in low-contrast brand colors on the light `steel-200` card (1.18–2.21:1) | `ScoreTierCard.astro` (home + approach)   | Range text set to `navy-950` (11.5:1); tier color is still carried by the badge image above it |
| 2   | Team/blog card subtitle `slate-600` on `steel-200` (3.65:1)                                                                             | `--color-slate-600` token in `global.css` | Darkened `#57697d → #3e4d5c` (5.6:1); still safe on white                                      |
| 3   | "Forgot password" / "Request Access" links in `cyan-500` on the light panel (1.93:1)                                                    | `sign-in.astro`                           | Switched to `cyan-600` (4.65:1), the token designated for light backgrounds                    |
| 4   | "Browse Sites" button used the light-background `outline-dark` variant on the dark hero — navy text on navy (1.08:1)                    | `404.astro`                               | Switched to the `outline` variant (the dark-background one used on the home hero)              |

All fixes are genuine code changes — no overlay widget. Typecheck (`astro check`)
and lint pass.

## Maintenance

- Re-run `node scripts/a11y-audit.mjs` after any significant content or design change.
- Re-scan the deployed production site after release.
- Consider a manual screen-reader + keyboard walkthrough of the main conversion
  flow for the portion of WCAG automated tools cannot cover.
