/**
 * Custom error classes and error handling utilities
 */

export class CanvasError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "CanvasError";
  }
}

export class AuthenticationError extends CanvasError {
  constructor(message = "Authentication required") {
    super(message, "AUTH_REQUIRED", 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends CanvasError {
  constructor(message = "Access denied") {
    super(message, "ACCESS_DENIED", 403);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends CanvasError {
  constructor(resource: string) {
    super(`${resource} not found`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends CanvasError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class CloudflareError extends CanvasError {
  constructor(message: string, service: "R2" | "D1" | "KV") {
    super(`${service} error: ${message}`, `${service}_ERROR`, 500);
    this.name = "CloudflareError";
  }
}

/**
 * Error handler for tRPC procedures
 */
export function handleTRPCError(error: unknown): never {
  if (error instanceof CanvasError) {
    throw error;
  }

  if (error instanceof Error) {
    throw new CanvasError(error.message, "INTERNAL_ERROR", 500);
  }

  throw new CanvasError("An unexpected error occurred", "UNKNOWN_ERROR", 500);
}

/**
 * Safe error logger that excludes sensitive information
 */
export function logError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const errorInfo = {
    message: error instanceof Error ? error.message : "Unknown error",
    name: error instanceof Error ? error.name : "UnknownError",
    code: error instanceof CanvasError ? error.code : "UNKNOWN",
    context,
    timestamp: new Date().toISOString(),
  };

  // In production, send to error monitoring service
  if (process.env.NODE_ENV === "production") {
    // TODO: Send to Sentry or similar service
  } else {
    console.error("[Error]", errorInfo);
  }
}
