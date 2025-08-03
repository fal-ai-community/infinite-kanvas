import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../init";
import { getR2Client, getD1Client, getKVClient } from "@/lib/cloudflare/config";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import type { Canvas, CanvasImage, CanvasState, User } from "@/types/db";
import { getOrCreateUser } from "@/lib/auth/utils";
import {
  AuthorizationError,
  NotFoundError,
  CloudflareError,
  ValidationError,
  handleTRPCError,
  logError,
} from "@/lib/errors";

// Type helper for D1 query results
type D1Result<T> = T;

// Canvas state schema
const canvasStateSchema = z.object({
  images: z.array(z.any()), // PlacedImage[]
  videos: z.array(z.any()), // PlacedVideo[]
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    scale: z.number(),
  }),
  version: z.string(),
});

export const canvasRouter = router({
  // Create a new canvas
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        state: canvasStateSchema,
        isPublic: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const d1 = await getD1Client();
        const canvasId = uuidv4();
        const now = new Date().toISOString();

        // Ensure user exists in database
        await getOrCreateUser();

        await d1.query(
          `INSERT INTO canvases (id, user_id, title, state_json, is_public, created_at, updated_at, last_accessed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            canvasId,
            ctx.userId,
            input.title || "Untitled Canvas",
            JSON.stringify(input.state),
            input.isPublic ? 1 : 0,
            now,
            now,
            now,
          ],
        );

        return { id: canvasId };
      } catch (error) {
        logError(error, { procedure: "canvas.create", userId: ctx.userId });
        return handleTRPCError(error);
      }
    }),

  // Get a canvas by ID
  get: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const d1 = await getD1Client();

      // First check KV cache
      const kv = getKVClient();
      const cacheKey = `canvas:${input.id}`;
      const cached = await kv.get(cacheKey);

      if (cached) {
        // Update last accessed time in background
        d1.query("UPDATE canvases SET last_accessed_at = ? WHERE id = ?", [
          new Date().toISOString(),
          input.id,
        ]).catch(console.error);

        return JSON.parse(cached);
      }

      const result = await d1.query("SELECT * FROM canvases WHERE id = ?", [
        input.id,
      ]);

      if (!result.results.length) {
        throw new NotFoundError("Canvas");
      }

      const canvas = result.results[0] as Canvas;

      // Check access permissions if user is authenticated
      const userId = ctx?.userId;
      if (!canvas.is_public && canvas.user_id !== userId) {
        throw new AuthorizationError();
      }

      // Parse state JSON
      const canvasData = {
        ...canvas,
        state: JSON.parse(canvas.state_json),
      };

      // Cache for quick access (5 minutes)
      await kv.put(cacheKey, JSON.stringify(canvasData), {
        expirationTtl: 300,
      });

      // Update last accessed time
      await d1.query("UPDATE canvases SET last_accessed_at = ? WHERE id = ?", [
        new Date().toISOString(),
        input.id,
      ]);

      return canvasData;
    }),

  // Update canvas state
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        state: canvasStateSchema.optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const d1 = await getD1Client();

      // Check ownership
      const checkResult = await d1.query(
        "SELECT user_id FROM canvases WHERE id = ?",
        [input.id],
      );

      if (!checkResult.results.length) {
        throw new NotFoundError("Canvas");
      }

      const canvas = checkResult.results[0] as D1Result<
        Pick<Canvas, "user_id">
      >;
      if (canvas.user_id !== ctx.userId) {
        throw new AuthorizationError();
      }

      // Build update query
      const updates: string[] = [];
      const params: any[] = [];

      if (input.title !== undefined) {
        updates.push("title = ?");
        params.push(input.title);
      }

      if (input.state !== undefined) {
        updates.push("state_json = ?");
        params.push(JSON.stringify(input.state));
      }

      if (input.isPublic !== undefined) {
        updates.push("is_public = ?");
        params.push(input.isPublic ? 1 : 0);
      }

      updates.push("updated_at = ?");
      params.push(new Date().toISOString());

      params.push(input.id);

      await d1.query(
        `UPDATE canvases SET ${updates.join(", ")} WHERE id = ?`,
        params,
      );

      // Invalidate cache
      const kv = getKVClient();
      await kv.delete(`canvas:${input.id}`);

      return { success: true };
    }),

  // List user's canvases
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(20),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ input, ctx }) => {
      const d1 = await getD1Client();

      const result = await d1.query(
        `SELECT id, title, thumbnail_url, created_at, updated_at, last_accessed_at 
         FROM canvases 
         WHERE user_id = ? 
         ORDER BY last_accessed_at DESC 
         LIMIT ? OFFSET ?`,
        [ctx.userId, input.limit, input.offset],
      );

      const countResult = await d1.query(
        "SELECT COUNT(*) as total FROM canvases WHERE user_id = ?",
        [ctx.userId],
      );

      const count = countResult.results[0] as D1Result<{ total: number }>;
      return {
        canvases: result.results,
        total: count.total,
      };
    }),

  // Delete a canvas
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const d1 = await getD1Client();
      const r2 = getR2Client();

      // Check ownership
      const checkResult = await d1.query(
        "SELECT user_id FROM canvases WHERE id = ?",
        [input.id],
      );

      if (!checkResult.results.length) {
        throw new NotFoundError("Canvas");
      }

      if ((checkResult.results[0] as any).user_id !== ctx.userId) {
        throw new AuthorizationError();
      }

      // Get all associated images to delete from R2
      const imagesResult = await d1.query(
        "SELECT r2_key FROM canvas_images WHERE canvas_id = ?",
        [input.id],
      );

      // Delete images from R2
      for (const image of imagesResult.results as any[]) {
        try {
          await r2.send(
            new DeleteObjectCommand({
              Bucket: "kanvas-images",
              Key: image.r2_key,
            }),
          );
        } catch (error) {
          console.error(`Failed to delete image ${image.r2_key}:`, error);
        }
      }

      // Delete from database (cascades to canvas_images)
      await d1.query("DELETE FROM canvases WHERE id = ?", [input.id]);

      // Invalidate cache
      const kv = getKVClient();
      await kv.delete(`canvas:${input.id}`);

      return { success: true };
    }),

  // Create a shareable link
  createShareLink: protectedProcedure
    .input(
      z.object({
        canvasId: z.string(),
        expiresIn: z.number().optional(), // Hours
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const d1 = await getD1Client();

      // Check ownership
      const checkResult = await d1.query(
        "SELECT user_id FROM canvases WHERE id = ?",
        [input.canvasId],
      );

      if (!checkResult.results.length) {
        throw new NotFoundError("Canvas");
      }

      if ((checkResult.results[0] as any).user_id !== ctx.userId) {
        throw new AuthorizationError();
      }

      const shareToken = uuidv4();
      const expiresAt = input.expiresIn
        ? new Date(Date.now() + input.expiresIn * 60 * 60 * 1000).toISOString()
        : null;

      await d1.query(
        `INSERT INTO shared_links (id, canvas_id, share_token, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          input.canvasId,
          shareToken,
          expiresAt,
          new Date().toISOString(),
        ],
      );

      return { shareToken };
    }),

  // Get canvas by share token
  getByShareToken: publicProcedure
    .input(
      z.object({
        shareToken: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const d1 = await getD1Client();

      // Get share link details
      const linkResult = await d1.query(
        "SELECT * FROM shared_links WHERE share_token = ?",
        [input.shareToken],
      );

      if (!linkResult.results.length) {
        throw new ValidationError("Invalid share link");
      }

      const link = linkResult.results[0] as any;

      // Check expiration
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        throw new ValidationError("Share link has expired");
      }

      // Get canvas
      const canvasResult = await d1.query(
        "SELECT * FROM canvases WHERE id = ?",
        [link.canvas_id],
      );

      if (!canvasResult.results.length) {
        throw new NotFoundError("Canvas");
      }

      const canvas = canvasResult.results[0] as Canvas;

      return {
        ...canvas,
        state: JSON.parse(canvas.state_json),
      };
    }),

  // Get a presigned URL for uploading an image
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        canvasId: z.string(),
        contentType: z.string(),
        fileName: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const d1 = await getD1Client();
      const r2 = getR2Client();

      // Check canvas ownership
      const checkResult = await d1.query(
        "SELECT user_id FROM canvases WHERE id = ?",
        [input.canvasId],
      );

      if (!checkResult.results.length) {
        throw new NotFoundError("Canvas");
      }

      const canvas = checkResult.results[0] as any;
      if (canvas.user_id !== ctx.userId) {
        throw new AuthorizationError("Unauthorized");
      }

      // Generate R2 key
      const r2Key = `canvases/${input.canvasId}/images/${Date.now()}-${input.fileName}`;

      // Create presigned URL for upload
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: r2Key,
        ContentType: input.contentType,
      });

      const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

      // Construct the public URL
      const imageUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`;

      return {
        uploadUrl,
        imageUrl,
        r2Key,
      };
    }),

  // Register an uploaded image with a canvas
  registerImage: protectedProcedure
    .input(
      z.object({
        canvasId: z.string(),
        r2Key: z.string(),
        url: z.string(),
        size: z.number().optional(),
        mimeType: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const d1 = await getD1Client();

      // Check canvas ownership
      const checkResult = await d1.query(
        "SELECT user_id FROM canvases WHERE id = ?",
        [input.canvasId],
      );

      if (!checkResult.results.length) {
        throw new NotFoundError("Canvas");
      }

      const canvas = checkResult.results[0] as any;
      if (canvas.user_id !== ctx.userId) {
        throw new AuthorizationError("Unauthorized");
      }

      const imageId = `image-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await d1.query(
        `INSERT INTO canvas_images (id, canvas_id, r2_key, url, size, mime_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          imageId,
          input.canvasId,
          input.r2Key,
          input.url,
          input.size || 0,
          input.mimeType || "image/png",
          new Date().toISOString(),
        ],
      );

      return { imageId };
    }),
});
