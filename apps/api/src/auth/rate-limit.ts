import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Small fixed-window limiter for auth endpoints, in memory (one instance).
 * Move to Redis with the rest of the shared state when the API scales out.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly max: number, private readonly windowMs: number) {}

  hit(key: string, now = Date.now()) {
    const h = this.hits.get(key);
    if (!h || h.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      if (this.hits.size > 10_000) for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
      return;
    }
    if (++h.count > this.max) {
      throw new HttpException({ code: 'rate_limited', retryAfter: Math.ceil((h.resetAt - now) / 1000) }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
