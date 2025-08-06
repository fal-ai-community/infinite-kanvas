import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

export type RateLimiter = {
  perMinute: Ratelimit;
  perHour: Ratelimit;
  perDay: Ratelimit;
};

export const createRateLimiter = (tokens: number, window: string) => {
  console.log(`[DEBUG] Creating rate limiter: ${tokens} tokens per ${window}`);
  return new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(tokens, window as any),
    analytics: true,
  });
};

type LimitPeriod = "perMinute" | "perHour" | "perDay";

export const RATE_LIMIT_PERIOD_LABELS: Record<LimitPeriod, string> = {
  perMinute: "minute",
  perHour: "hour",
  perDay: "day",
};

type LimitResult =
  | {
      shouldLimitRequest: false;
    }
  | { shouldLimitRequest: true; period: LimitPeriod };

export const IS_RATE_LIMITER_ENABLED =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

console.log(`[DEBUG] Rate limiter enabled: ${IS_RATE_LIMITER_ENABLED}`);
console.log(
  `[DEBUG] KV_REST_API_URL present: ${!!process.env.KV_REST_API_URL}`,
);
console.log(
  `[DEBUG] KV_REST_API_TOKEN present: ${!!process.env.KV_REST_API_TOKEN}`,
);

export async function shouldLimitRequest(
  limiter: RateLimiter,
  ip: string,
  keyPrefix?: string,
): Promise<LimitResult> {
  console.log(
    `[DEBUG] Checking rate limit for IP: ${ip}${keyPrefix ? ` with prefix: ${keyPrefix}` : ""}`,
  );

  if (!IS_RATE_LIMITER_ENABLED) {
    console.log(`[DEBUG] Rate limiter disabled, allowing request`);
    return { shouldLimitRequest: false };
  }

  // Use different keys for different types of rate limits
  const rateLimitKey = keyPrefix ? `${keyPrefix}:${ip}` : ip;

  const limits = ["perMinute", "perHour", "perDay"] as const;
  const results = await Promise.all(
    limits.map(async (limit) => {
      const result = await limiter[limit].limit(rateLimitKey);
      console.log(`[DEBUG] ${limit} limit result for key ${rateLimitKey}:`, {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
        limit: result.limit,
      });
      return result;
    }),
  );

  const limitRequestIndex = results.findIndex((result) => !result.success);
  const shouldLimit = limitRequestIndex >= 0;

  console.log(`[DEBUG] Should limit request: ${shouldLimit}`);
  if (shouldLimit) {
    console.log(
      `[DEBUG] Rate limit exceeded for period: ${limits[limitRequestIndex]}`,
    );
  }

  return {
    shouldLimitRequest: shouldLimit,
    period: limits[limitRequestIndex],
  };
}
