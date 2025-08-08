import { route } from "@fal-ai/server-proxy/nextjs";
import { NextRequest } from "next/server";
import {
  createRateLimiter,
  RateLimiter,
  shouldLimitRequest,
} from "@/lib/ratelimit";
import { checkBotId } from "botid/server";

const limiter: RateLimiter = {
  perMinute: createRateLimiter(5, "60 s"),
  perHour: createRateLimiter(15, "60 m"),
  perDay: createRateLimiter(50, "24 h"),
};

export const POST = async (req: NextRequest) => {
  // Check for bot activity first
  const verification = await checkBotId();
  if (verification.isBot) {
    return new Response("Access denied", { status: 403 });
  }

  // Check if user has provided their own API key
  const authHeader = req.headers.get("authorization");
  const hasCustomApiKey = authHeader && authHeader.length > 0;

  // Only apply rate limiting if no custom API key is provided
  if (!hasCustomApiKey) {
    const ip = req.headers.get("x-forwarded-for") || "";
    const limiterResult = await shouldLimitRequest(limiter, ip);
    if (limiterResult.shouldLimitRequest) {
      return new Response(
        `Rate limit exceeded per ${limiterResult.period}. Add your FAL API key to bypass rate limits.`,
        {
          status: 429,
          headers: {
            "Content-Type": "text/plain",
            "X-RateLimit-Limit":
              limiterResult.period === "perMinute"
                ? "10"
                : limiterResult.period === "perHour"
                  ? "30"
                  : "100",
            "X-RateLimit-Period": limiterResult.period,
          },
        },
      );
    }
  }

  return route.POST(req);
};

export const { GET, PUT } = route;
