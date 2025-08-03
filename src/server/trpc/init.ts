import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Context } from "./context";
import {
  createRateLimiter,
  shouldLimitRequest,
  RateLimiter,
} from "@/lib/ratelimit";
import { TRPCError } from "@trpc/server";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Create rate limiter for tRPC endpoints
const trpcLimiter: RateLimiter = {
  perMinute: createRateLimiter(50, "60 s"),
  perHour: createRateLimiter(250, "60 m"),
  perDay: createRateLimiter(500, "24 h"),
};

// Rate limiting middleware
const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  const req = ctx.req;
  if (!req) {
    console.log("[DEBUG] No request object in context, skipping rate limit");
    return next();
  }

  // Extract IP from request
  const ip =
    req.headers.get?.("x-forwarded-for") ||
    req.headers.get?.("x-real-ip") ||
    "unknown";

  console.log(`[DEBUG] tRPC rate limit check for IP: ${ip}`);

  const limiterResult = await shouldLimitRequest(trpcLimiter, ip);
  console.log(`[DEBUG] tRPC rate limit result:`, limiterResult);

  if (limiterResult.shouldLimitRequest) {
    console.log(`[DEBUG] tRPC request blocked - rate limit exceeded`);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded per ${limiterResult.period}`,
    });
  }

  console.log(`[DEBUG] tRPC request allowed`);
  return next();
});

// Auth middleware
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
export const rateLimitedProcedure = t.procedure.use(rateLimitMiddleware);
export const protectedRateLimitedProcedure = t.procedure
  .use(isAuthed)
  .use(rateLimitMiddleware);

export const createCallerFactory = t.createCallerFactory;
