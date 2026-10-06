/**
 * Recursively merges `source` onto `base`, returning a new object. Plain
 * objects are merged key-by-key (so a key missing from `source` falls back
 * to `base`'s value); anything else — arrays, primitives, null — is taken
 * wholesale from `source` when present, otherwise from `base`.
 *
 * Arrays are intentionally NOT merged element-by-element: a content array
 * (e.g. a list of steps or benefits) is replaced wholesale rather than
 * zipped, since merging by index would silently produce nonsense if the
 * two sources disagree on array length or ordering.
 *
 * `base` doubles as the shape contract: only keys present in `base` appear
 * in the result, and a `source` value whose type disagrees with `base`'s
 * (an object where `base` has an array, a string where `base` has an
 * object) is discarded in favour of `base`. Both rules exist because the
 * caller is merging a live CMS response onto a seed file — components are
 * typed against the seed, so a value of the wrong type is a CMS bug that
 * would crash the render, and `base` is the only value known to be safe.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether `source` can stand in for `base` without changing its shape. */
function isCompatible(base: unknown, source: unknown): boolean {
  if (source === undefined || source === null) return false;
  if (Array.isArray(base)) return Array.isArray(source);
  if (isPlainObject(base)) return isPlainObject(source);
  // `base` is a primitive (or null/undefined in the seed, which pins nothing
  // down) — accept any non-nullish primitive, but never an object or array
  // where the seed promised a string or number.
  return !Array.isArray(source) && !isPlainObject(source);
}

export function deepMerge<T>(base: T, source: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(source)) {
    return (isCompatible(base, source) ? source : base) as T;
  }

  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) {
    result[key] = deepMerge(base[key], source[key]);
  }
  return result as T;
}
