import type {
  WPImage,
  LegalSection,
  CoreDocument,
  Property,
  TeamMember,
  Testimonial,
  Partner,
  ScoreTier,
  BlogPost,
  AdvantageItem,
} from '@/types/wordpress';

/**
 * Coercion helpers applied to **remote WordPress responses only**.
 *
 * Components dereference the shapes in `src/types/wordpress.ts` directly
 * (`member.photo.url`, `post.tags.join()`, …) because those fields are
 * typed as required. TypeScript enforces that against the seed files, but
 * it cannot enforce it against JSON that arrives over the network at build
 * time: a CPT whose ACF fields are half-filled returns `undefined` for a
 * "required" field, and the dereference crashes the whole prerender — the
 * same failure mode that kept `/approach` from building (see
 * `getPageCopy()` in ./pages.ts).
 *
 * Every function here therefore takes untrusted JSON and returns a value
 * that satisfies the type contract. Seed data is NOT passed through these:
 * it is already valid by construction and type-checked at build time, so
 * the fallback path stays byte-for-byte what it is today.
 */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** WordPress returns numeric post IDs; the type models them as strings. */
function id(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/** Shown wherever the CMS has no usable image, so layout holds and `src` is never empty. */
export const PLACEHOLDER_IMAGE: WPImage = { url: '/images/placeholder.svg', alt: '' };

/** A required image: always returns something renderable. */
export function image(value: unknown): WPImage {
  if (isObject(value) && typeof value.url === 'string' && value.url.trim() !== '') {
    const out: WPImage = { url: value.url, alt: str(value.alt) };
    if (typeof value.width === 'number') out.width = value.width;
    if (typeof value.height === 'number') out.height = value.height;
    return out;
  }
  return PLACEHOLDER_IMAGE;
}

/** An optional image: absent stays absent, so `{img && …}` branches still work. */
export function optionalImage(value: unknown): WPImage | undefined {
  if (isObject(value) && typeof value.url === 'string' && value.url.trim() !== '') {
    return image(value);
  }
  return undefined;
}

/**
 * Normalizes a remote collection, falling back to `fallback` when the response
 * isn't a list at all — a WP error body (`{code, message}`) is a 200-with-JSON,
 * so `?? seed` doesn't catch it and `[...remote]` throws.
 *
 * An **empty** list also falls back. WordPress is populated one content type at
 * a time, and an empty collection in practice means "nobody has filled this in
 * yet", not "this section is deliberately blank" — the site would otherwise
 * drop from ten news posts to an empty page the moment the CMS was connected.
 * Falling back keeps each section showing approved content until WordPress
 * actually has something to say, and WordPress wins the moment it does.
 *
 * The trade-off is deliberate: a collection emptied *on purpose* in WordPress
 * will show seed content rather than nothing. Deleting every row of a content
 * type is not something an editor does by accident, and a page that silently
 * empties itself is the worse failure of the two.
 */
export function list<T>(remote: unknown, fallback: T[], normalize: (raw: unknown) => T): T[] {
  if (!Array.isArray(remote) || remote.length === 0) return fallback;
  return remote.filter(isObject).map(normalize);
}

export function property(raw: unknown): Property {
  const r = isObject(raw) ? raw : {};
  return {
    ...(r as unknown as Property),
    id: id(r.id),
    slug: str(r.slug),
    title: str(r.title),
    city: str(r.city),
    state: str(r.state),
    acreage: num(r.acreage),
    featured: r.featured === true,
    image: image(r.image),
  };
}

export function teamMember(raw: unknown): TeamMember {
  const r = isObject(raw) ? raw : {};
  return {
    ...(r as unknown as TeamMember),
    id: id(r.id),
    name: str(r.name),
    jobTitle: str(r.jobTitle),
    order: num(r.order),
    photo: image(r.photo),
  };
  // `group` is deliberately left as-is: it decides which roster a member
  // renders in, and inventing one would silently file a board member under
  // Staff. An unset/unknown group renders in neither grid, which is wrong
  // but visibly wrong, and never crashes the build.
}

export function testimonial(raw: unknown): Testimonial {
  const r = isObject(raw) ? raw : {};
  return {
    ...(r as unknown as Testimonial),
    id: id(r.id),
    quote: str(r.quote),
    personName: str(r.personName),
    personTitle: str(r.personTitle),
    companyName: str(r.companyName),
    companyLogo: image(r.companyLogo),
    backgroundImage: image(r.backgroundImage),
  };
}

export function partner(raw: unknown): Partner {
  const r = isObject(raw) ? raw : {};
  return {
    ...(r as unknown as Partner),
    id: id(r.id),
    name: str(r.name),
    url: str(r.url),
    variant: r.variant === 'wordmark' ? 'wordmark' : 'photo',
    image: image(r.image),
    backgroundImage: optionalImage(r.backgroundImage),
  };
}

export function scoreTier(raw: unknown): ScoreTier {
  const r = isObject(raw) ? raw : {};
  return {
    ...(r as unknown as ScoreTier),
    id: id(r.id),
    label: str(r.label),
    range: str(r.range),
    description: str(r.description),
    badgeImage: image(r.badgeImage),
  };
}

const ADVANTAGE_ICONS: AdvantageItem['icon'][] = [
  'eye',
  'globe',
  'shield-check',
  'badge-check',
  'route',
  'megaphone',
  'zap',
];

export function advantage(raw: unknown): AdvantageItem {
  const r = isObject(raw) ? raw : {};
  const icon = ADVANTAGE_ICONS.find((known) => known === r.icon);
  return {
    ...(r as unknown as AdvantageItem),
    id: id(r.id),
    title: str(r.title),
    description: str(r.description),
    // `Icon.astro` throws on an unknown name — by design, so a typo in a
    // hardcoded icon fails the build loudly. CMS-supplied names get pinned
    // to the known set here instead, so bad content can't do the same.
    icon: icon ?? 'badge-check',
  };
}

export function blogPost(raw: unknown): BlogPost {
  const r = isObject(raw) ? raw : {};
  const source = isObject(r.source) && str(r.source.url) !== '' ? r.source : undefined;
  return {
    ...(r as unknown as BlogPost),
    id: id(r.id),
    slug: str(r.slug),
    title: str(r.title),
    excerpt: str(r.excerpt),
    contentHtml: str(r.contentHtml),
    tags: strArray(r.tags),
    author: { name: isObject(r.author) ? str(r.author.name) : '' },
    featuredImage: image(r.featuredImage),
    heroImage: optionalImage(r.heroImage),
    // Left undefined rather than defaulted: RSS and the post header both
    // treat a missing date as "unknown", never as today (see BlogPost.date).
    date: str(r.date) !== '' ? str(r.date) : undefined,
    source: source ? { name: str(source.name), url: str(source.url) } : undefined,
    externalUrl: str(r.externalUrl) !== '' ? str(r.externalUrl) : undefined,
  };
}

export function legalSection(raw: unknown): LegalSection {
  const r = isObject(raw) ? raw : {};
  return {
    ...(r as unknown as LegalSection),
    id: id(r.id),
    eyebrow: str(r.eyebrow),
    heading: str(r.heading),
    bodyHtml: str(r.bodyHtml),
  };
}

export function coreDocument(raw: unknown): CoreDocument {
  const r = isObject(raw) ? raw : {};
  return { ...(r as unknown as CoreDocument), area: str(r.area), submit: str(r.submit) };
}
