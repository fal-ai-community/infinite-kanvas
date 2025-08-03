import { auth } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";

/**
 * Get the current user ID or throw an error if not authenticated
 */
export async function requireAuth() {
  const { userId } = await auth();

  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  return userId;
}

/**
 * Get the current user ID (returns null if not authenticated)
 */
export async function getAuthUserId() {
  const { userId } = await auth();
  return userId;
}

/**
 * Check if the current user owns a resource
 */
export async function requireOwnership(resourceUserId: string) {
  const userId = await requireAuth();

  if (userId !== resourceUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this resource",
    });
  }

  return userId;
}

/**
 * Get or create a user in the database
 */
export async function getOrCreateUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  // Import dynamically to avoid circular dependencies
  const { getD1Client } = await import("@/lib/cloudflare/config");
  const d1 = await getD1Client();

  // Check if user exists
  const existingUser = await d1.query("SELECT * FROM users WHERE id = ?", [
    userId,
  ]);

  if (existingUser.results.length > 0) {
    return existingUser.results[0];
  }

  // Create new user
  const now = new Date().toISOString();
  await d1.query(
    "INSERT INTO users (id, email, name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      userId,
      clerkUser.emailAddresses[0]?.emailAddress || "",
      clerkUser.fullName || clerkUser.firstName || "User",
      clerkUser.imageUrl,
      now,
      now,
    ],
  );

  return {
    id: userId,
    email: clerkUser.emailAddresses[0]?.emailAddress || "",
    name: clerkUser.fullName || clerkUser.firstName || "User",
    avatar_url: clerkUser.imageUrl,
    created_at: now,
    updated_at: now,
  };
}

import { currentUser } from "@clerk/nextjs/server";
