// In-memory fixed-window rate limiting for the form API routes.
//
// LIMITS (honest scope): this is per server instance, in process memory.
// On Vercel each serverless instance keeps its own counters, and a new
// deployment (or a cold instance) resets them. That is enough to blunt
// casual spam and accidental double-submits against a low-traffic
// contact/newsletter/apply surface, but it is NOT a distributed abuse
// defence. If abuse ever needs cross-instance limits, move this to
// Vercel KV / Upstash Redis — do not pretend this map is that.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Prune expired buckets once the map grows, so it cannot grow forever. */
function pruneExpired(now: number): void {
  if (buckets.size <= 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets (0 when allowed). */
  retryAfterSeconds: number;
}

/**
 * Fixed-window check: at most `limit` hits per `windowMs` for `key`.
 * Returns `{ allowed: false, retryAfterSeconds }` when the window is
 * exhausted; the caller answers 429 with a `Retry-After` header.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);
  const bucket = buckets.get(key);
  if (bucket === undefined || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Best-effort client IP for rate-limit keys. On Vercel the first
 * `x-forwarded-for` entry is the visitor IP; `clientAddress` is
 * Astro's own value. The IP is used ONLY as a rate-limit key — it is
 * never stored, logged, or sent to Resend.
 */
export function getClientIp(
  request: Request,
  clientAddress: string | undefined,
): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return clientAddress ?? "unknown";
}
