import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Canvases table
export const canvases = sqliteTable("canvases", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Untitled Canvas"),
  stateJson: text("state_json").notNull().default("{}"),
  thumbnailUrl: text("thumbnail_url"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  lastAccessedAt: text("last_accessed_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Canvas images table
export const canvasImages = sqliteTable("canvas_images", {
  id: text("id").primaryKey(),
  canvasId: text("canvas_id")
    .notNull()
    .references(() => canvases.id, { onDelete: "cascade" }),
  r2Key: text("r2_key").notNull(),
  url: text("url").notNull(),
  size: integer("size"),
  mimeType: text("mime_type"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Shared links table
export const sharedLinks = sqliteTable("shared_links", {
  id: text("id").primaryKey(),
  canvasId: text("canvas_id")
    .notNull()
    .references(() => canvases.id, { onDelete: "cascade" }),
  shareToken: text("share_token").notNull().unique(),
  expiresAt: text("expires_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Canvas = typeof canvases.$inferSelect;
export type NewCanvas = typeof canvases.$inferInsert;
export type CanvasImage = typeof canvasImages.$inferSelect;
export type NewCanvasImage = typeof canvasImages.$inferInsert;
export type SharedLink = typeof sharedLinks.$inferSelect;
export type NewSharedLink = typeof sharedLinks.$inferInsert;
