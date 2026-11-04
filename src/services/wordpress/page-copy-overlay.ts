/**
 * Lays the WordPress editor's values over the approved copy.
 *
 * Kept in its own module, importing nothing, so it can be exercised directly
 * by scripts/verify-page-overlay.mjs. `pages.ts` owns the fetch; this file
 * owns the merge rule, which is the part that can quietly lose client copy.
 */

/**
 * What the REDI Page Editor plugin returns: the same tree as the seed, but
 * carrying only the fields an editor has actually filled in. Deliberately
 * untyped beyond this — the overlay below reads the SEED's shape, not this
 * one, so the payload cannot introduce a key or change a type.
 */
export type RemoteCopy = Record<string, unknown>;

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

/** Indexable view of a CMS value that should line up with an array in the seed. */
function indexed(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) return { ...value };
  // PHP's json_encode turns a sparse array - which is what you get when an
  // editor fills in the 3rd process step and not the 1st - into an object with
  // numeric string keys. Both forms have to work.
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

/**
 * Lays the editor's values over the approved copy.
 *
 * The important half of this function is what it does NOT do. It walks the
 * SEED and asks the CMS for a replacement at each leaf, so:
 *
 *   - a field the editor left blank keeps the value already on the site;
 *   - a key the CMS invents is never read;
 *   - a value of the wrong type is ignored rather than rendered;
 *   - the returned object has exactly the seed's shape, so no page can
 *     render `undefined` because WordPress omitted a section.
 *
 * An empty or half-filled screen in WordPress therefore cannot blank a
 * section of the site. That is the exact failure this replaces: `redi/v1/page-copy`
 * was merged with WordPress winning outright, and because it served a frozen
 * export, every copy change made in this repo after 2026-09-04 was silently
 * discarded at render time for over a month (docs/WORDPRESS_INTEGRATION.md
 * section 6.2.1). Overlaying rather than replacing means the worst case is
 * "the CMS changed nothing", not "the CMS wiped the page".
 *
 * Blank means "no change" in both directions. `home.hero.kicker` is empty in
 * the approved copy and stays empty; an editor clearing a field restores the
 * repo's value rather than emptying the element, which is the safe direction
 * for a field that carries layout (a heading, a CTA label).
 */
export function overlay<T>(base: T, remote: unknown): T {
  if (typeof base === 'string') {
    return (text(remote) ?? base) as T;
  }

  if (Array.isArray(base)) {
    // A list of strings is replaced whole: the editor typed the whole block.
    if (base.every((item) => typeof item === 'string')) {
      return (list(remote) ?? base) as T;
    }
    // A list of objects. Two different things can arrive here.
    //
    // A real array means the editor typed the whole list in one box and may
    // have added or removed rows, so it replaces the list outright. Each row
    // is laid over the FIRST seed item rather than onto nothing, so keys the
    // editor never sees - ids, icons, colours, badge images - keep working
    // values on rows that did not exist before.
    if (Array.isArray(remote)) {
      const rows = remote.filter((row) => row && typeof row === 'object' && !Array.isArray(row));
      if (rows.length === 0) return base;
      const template = base[0];
      return rows.map((row, i) => overlay(base[i] ?? template, row)) as T;
    }

    // An object with numeric keys is PHP's sparse array - the editor filled in
    // the third row and not the first - so the length is kept and the rows are
    // merged individually.
    const source = indexed(remote);
    if (!source) return base;
    return base.map((item, i) =>
      i in source || String(i) in source ? overlay(item, source[String(i)]) : item,
    ) as T;
  }

  if (base && typeof base === 'object') {
    if (!remote || typeof remote !== 'object' || Array.isArray(remote)) return base;
    const source = remote as RemoteCopy;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(base as Record<string, unknown>)) {
      out[key] = key in source ? overlay(value, source[key]) : value;
    }
    return out as T;
  }

  return base;
}
