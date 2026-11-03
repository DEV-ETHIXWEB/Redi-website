import seed from '@/content/seed/pages.json';
import { wpFetch } from './client';

/**
 * Shape of the page-copy payload. Inferred directly from the seed JSON
 * (`typeof seed`) rather than hand-written in `src/types/wordpress.ts` —
 * this is intentional: `pages.json` is a large, deeply nested tree of
 * hero/section copy for every page, and keeping the type derived from the
 * seed file guarantees they can never drift out of sync. **If the shape of
 * `src/content/seed/pages.json` changes, this type updates automatically —
 * you do not need to (and should not) hand-maintain a parallel interface.**
 */
export type PageCopy = typeof seed;

/**
 * Per-server-instance memoization — once fetched (or fallen back to seed),
 * the same object is returned for the lifetime of the process, since this
 * data doesn't change within a single build/request lifecycle. On Vercel's
 * serverless model each invocation gets a fresh module scope, so this cache
 * does NOT persist across requests in production — it only avoids redundant
 * fetches within a single page render that calls `getPageCopy()` more than
 * once.
 */
let cache: PageCopy | null = null;

/**
 * Static rich-copy blocks for every page (hero headlines, section body
 * copy, CTA labels), keyed by page name — effectively an ACF flexible-
 * content / options-page export. This is the single largest and most
 * complex content endpoint in the app.
 *
 * Endpoint:  `GET /wp-json/redi/v1/page-copy`
 * Method:    GET
 * Auth:      none (public)
 * Namespace: **custom** — see docs/WORDPRESS_INTEGRATION.md. This is the
 *            hardest of the six custom `redi/v1` routes to build faithfully,
 *            because the response shape must match `src/content/seed/pages.json`
 *            EXACTLY, key-for-key, nested object for nested object — there
 *            is no partial/optional structure here. Recommend building this
 *            one last, after the simpler CPT-backed endpoints, and diffing
 *            the WP response against `pages.json` directly before wiring it
 *            up (`WORDPRESS_API_URL` unset vs. set is the easiest way to
 *            A/B the two side by side locally).
 * Response:  a single large object — see `src/content/seed/pages.json` for
 *            the exact required shape (every key present there is required).
 * Optional fields: none in principle — but any WordPress implementation of
 *            this route must expect the seed's shape to keep evolving, and
 *            must not assume a key it returned once will still be read.
 * Source:    `src/content/seed/pages.json` — this repo, not WordPress. The
 *            `redi/v1/page-copy` route is a frozen export that silently overrode
 *            newer approved copy; see docs/WORDPRESS_INTEGRATION.md 6.2.1.
 * Failure:   not applicable; nothing is fetched.
 *
 * TODO(backend): consider whether this monolithic endpoint should eventually
 * be split per-page (e.g. `/wp-json/redi/v1/page-copy/home`,
 * `/wp-json/redi/v1/page-copy/about`, …) once real editorial workflows are
 * in place — a single giant options page can become an unwieldy WP-admin
 * editing experience for content editors. Not required for launch; noted
 * here so the decision is made deliberately, not by default.
 */
/**
 * What the REDI Home Editor plugin returns. Every field is nullable, and null
 * means the editor has not filled that box in.
 */
interface HomeCopyOverride {
  hero?: {
    kicker?: string | null;
    headline?: string | null;
    paragraphs?: string[] | null;
    ctaPrimaryLabel?: string | null;
    ctaSecondaryLabel?: string | null;
  } | null;
  statementOfValue?: {
    eyebrow?: string | null;
    heading?: string | null;
    paragraphs?: string[] | null;
  } | null;
  whyChoose?: { eyebrow?: string | null; heading?: string | null; body?: string | null } | null;
  rediScore?: { eyebrow?: string | null; heading?: string | null; body?: string | null } | null;
  ctaInvest?: { heading?: string | null; body?: string | null; ctaLabel?: string | null } | null;
}

/** A non-empty string from the CMS, or undefined so the caller keeps its own value. */
function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/** A non-empty list of non-empty strings, or undefined. */
function list(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  return items.length > 0 ? items : undefined;
}

/**
 * Lays the editor's values over the approved copy.
 *
 * The important half of this function is what it does NOT do: a field the
 * editor left blank is skipped, so it keeps the value already on the site. An
 * empty or half-filled screen in WordPress can never blank a section of the
 * home page.
 *
 * That is the exact failure this replaces. `redi/v1/page-copy` was merged with
 * WordPress winning outright, and because it served a frozen export, every
 * copy change made here after 2026-09-04 was silently discarded at render
 * time for over a month (docs/WORDPRESS_INTEGRATION.md §6.2.1). Overlaying
 * rather than replacing means the worst case is "the CMS changed nothing",
 * not "the CMS wiped the page".
 *
 * `kicker` is deliberately not treated as blankable either: it is empty in the
 * approved copy, and an editor clearing it should leave it empty rather than
 * be unable to express that. Blank simply means no change in both directions.
 */
function applyHomeCopy(base: PageCopy, remote: HomeCopyOverride | null): PageCopy {
  if (!remote || typeof remote !== 'object') return base;

  const home = base.home;
  const r = remote;

  return {
    ...base,
    home: {
      ...home,
      hero: {
        ...home.hero,
        kicker: text(r.hero?.kicker) ?? home.hero.kicker,
        headline: text(r.hero?.headline) ?? home.hero.headline,
        paragraphs: list(r.hero?.paragraphs) ?? home.hero.paragraphs,
        ctaPrimary: {
          ...home.hero.ctaPrimary,
          label: text(r.hero?.ctaPrimaryLabel) ?? home.hero.ctaPrimary.label,
        },
        ctaSecondary: {
          ...home.hero.ctaSecondary,
          label: text(r.hero?.ctaSecondaryLabel) ?? home.hero.ctaSecondary.label,
        },
      },
      statementOfValue: {
        ...home.statementOfValue,
        eyebrow: text(r.statementOfValue?.eyebrow) ?? home.statementOfValue.eyebrow,
        heading: text(r.statementOfValue?.heading) ?? home.statementOfValue.heading,
        paragraphs: list(r.statementOfValue?.paragraphs) ?? home.statementOfValue.paragraphs,
      },
      whyChoose: {
        ...home.whyChoose,
        eyebrow: text(r.whyChoose?.eyebrow) ?? home.whyChoose.eyebrow,
        heading: text(r.whyChoose?.heading) ?? home.whyChoose.heading,
        body: text(r.whyChoose?.body) ?? home.whyChoose.body,
      },
      rediScore: {
        ...home.rediScore,
        eyebrow: text(r.rediScore?.eyebrow) ?? home.rediScore.eyebrow,
        heading: text(r.rediScore?.heading) ?? home.rediScore.heading,
        body: text(r.rediScore?.body) ?? home.rediScore.body,
      },
      ctaInvest: {
        ...home.ctaInvest,
        heading: text(r.ctaInvest?.heading) ?? home.ctaInvest.heading,
        body: text(r.ctaInvest?.body) ?? home.ctaInvest.body,
        ctaLabel: text(r.ctaInvest?.ctaLabel) ?? home.ctaInvest.ctaLabel,
      },
    },
  };
}

export async function getPageCopy(): Promise<PageCopy> {
  if (cache) return cache;

  /*
    The seed is the base for every page. Only the home page is editable in
    WordPress so far, through the REDI Home Editor plugin, and only as an
    overlay — see applyHomeCopy above for why it is layered rather than
    swapped in.

    Note the namespace: `ethixweb/v1`, not `redi/v1`. The latter belongs to
    REDI Headless CMS and still serves the frozen export; nothing here reads
    it. wpFetch returns null on any failure, which lands on the approved copy.
  */
  const remote = await wpFetch<HomeCopyOverride>('/wp-json/ethixweb/v1/home-copy');
  cache = applyHomeCopy(seed as PageCopy, remote);
  return cache;
}
