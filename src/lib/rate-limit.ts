/**
 * Minimal in-memory rate limiter for low-stakes endpoints (e.g. the /sites
 * password gate) that don't warrant external infra (Redis/KV) but shouldn't
 * be left completely open to scripted brute-forcing.
 *
 * Best-effort, not a strong guarantee: state lives in this module's memory,
 * so it's reliably enforced on the Node adapter (one long-running process)
 * but resets on cold start under the Vercel serverless adapter and isn't
 * shared across concurrent instances. That's an acceptable trade-off here —
 * it still meaningfully slows down a single scripted attacker, which is the
 * actual goal, without adding a database dependency for a shared-password
 * gate that isn't protecting sensitive data in the first place.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Returns `true` if `key` (typically a client IP) has exceeded `max`
 * attempts within `windowMs`, and records this attempt either way.
 */
export function isRateLimited(key: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > max;
}
