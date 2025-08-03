import type { PlacedImage } from "@/types/canvas";
import { logError } from "@/lib/errors";

export interface CloudImageUploadResult {
  id: string;
  url: string;
  r2Key: string;
}

/**
 * Upload an image to Cloudflare R2 and register it in the database
 *
 * @description Handles the complete image upload flow:
 * 1. Converts data URL to blob
 * 2. Gets presigned upload URL from server
 * 3. Uploads directly to R2 using presigned URL
 * 4. Registers the image in D1 database
 *
 * @param {string} dataUrl - Base64 encoded image data URL or blob URL
 * @param {string} canvasId - ID of the canvas this image belongs to
 * @param {any} trpcClient - TRPC client instance for API calls
 *
 * @returns {Promise<CloudImageUploadResult>} Upload result with image ID, URL, and R2 key
 *
 * @throws {Error} If upload fails at any stage
 *
 * @example
 * const result = await uploadImageToR2(
 *   'data:image/png;base64,iVBORw0...',
 *   'canvas-123',
 *   trpcClient
 * );
 * console.log(result.url); // https://r2.example.com/images/...
 */
export async function uploadImageToR2(
  dataUrl: string,
  canvasId: string,
  trpcClient: any,
): Promise<CloudImageUploadResult> {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Get file extension from mime type
    const mimeType = blob.type || "image/png";
    const extension = mimeType.split("/")[1] || "png";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    // Get presigned URL from server
    const { uploadUrl, imageUrl, r2Key } =
      await trpcClient.canvas.getUploadUrl.mutate({
        canvasId,
        contentType: mimeType,
        fileName,
      });

    // Upload directly to R2 using presigned URL
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: blob,
      headers: {
        "Content-Type": mimeType,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    // Register the image in the database
    const { imageId } = await trpcClient.canvas.registerImage.mutate({
      canvasId,
      r2Key,
      url: imageUrl,
      size: blob.size,
      mimeType,
    });

    return {
      id: imageId,
      url: imageUrl,
      r2Key,
    };
  } catch (error) {
    logError(error, {
      context: "uploadImageToR2",
      canvasId,
      dataUrlSize: dataUrl.length,
    });
    throw error;
  }
}

/**
 * Convert a PlacedImage to use cloud URL if needed
 *
 * @description Migrates local/temporary image URLs (data: or blob:) to permanent
 * cloud storage. Preserves all image metadata while updating the URL.
 *
 * @param {PlacedImage} image - The image object to migrate
 * @param {string} canvasId - ID of the canvas this image belongs to
 * @param {any} trpcClient - TRPC client instance for API calls
 *
 * @returns {Promise<PlacedImage>} Image with updated cloud URL, or original if already migrated/on error
 *
 * @example
 * const cloudImage = await migrateImageToCloud(
 *   { id: '123', src: 'data:image/png;base64,...', x: 100, y: 200 },
 *   'canvas-456',
 *   trpcClient
 * );
 */
export async function migrateImageToCloud(
  image: PlacedImage,
  canvasId: string,
  trpcClient: any,
): Promise<PlacedImage> {
  // Skip if already a cloud URL
  if (!image.src.startsWith("data:") && !image.src.startsWith("blob:")) {
    return image;
  }

  try {
    const cloudImage = await uploadImageToR2(image.src, canvasId, trpcClient);
    return {
      ...image,
      src: cloudImage.url,
      cloudImageId: cloudImage.id,
    };
  } catch (error) {
    logError(error, {
      context: "migrateImageToCloud",
      imageId: image.id,
      canvasId,
    });
    // Return original image if migration fails
    return image;
  }
}
