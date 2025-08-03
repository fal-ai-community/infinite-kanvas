import { drizzle } from "drizzle-orm/d1";
import { getD1Client } from "@/lib/cloudflare/config";
import * as schema from "./schema";

/**
 * Creates a Drizzle ORM client for Cloudflare D1
 *
 * @description Initializes a type-safe Drizzle ORM client connected to the
 * Cloudflare D1 database. The client includes all schema definitions for
 * type-safe queries and mutations.
 *
 * @returns {Promise<DrizzleD1Database>} Configured Drizzle database client
 *
 * @throws {Error} If D1 client initialization fails
 *
 * @example
 * const db = await getDrizzleClient();
 * const canvas = await db
 *   .select()
 *   .from(canvases)
 *   .where(eq(canvases.id, 'abc123'))
 *   .limit(1);
 */
export async function getDrizzleClient() {
  const d1 = await getD1Client();
  return drizzle(d1 as any, { schema });
}

// Re-export schema and types
export * from "./schema";
