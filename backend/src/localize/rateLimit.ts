/**
 * Fixed-window, in-memory rate limiter keyed by client IP.
 *
 * On serverless hosting each warm instance keeps its own counts, so this is a
 * brake on casual abuse, not a hard global quota.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  take(key: string, now = Date.now()): { allowed: boolean; retryAfterMs: number } {
    const entry = this.hits.get(key);
    if (!entry || now >= entry.resetAt) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      if (this.hits.size > 10_000) this.prune(now);
      return { allowed: true, retryAfterMs: 0 };
    }
    if (entry.count < this.max) {
      entry.count++;
      return { allowed: true, retryAfterMs: 0 };
    }
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  private prune(now: number) {
    for (const [k, v] of this.hits) if (now >= v.resetAt) this.hits.delete(k);
  }
}
