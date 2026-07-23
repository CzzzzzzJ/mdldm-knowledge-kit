interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, RateLimitEntry>();

export function consumeRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(options.windowMs / 1_000),
    };
  }

  current.count += 1;
  attempts.set(key, current);

  return {
    allowed: current.count <= options.limit,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((current.resetAt - now) / 1_000),
    ),
  };
}

export function clearRateLimit(key: string): void {
  attempts.delete(key);
}
