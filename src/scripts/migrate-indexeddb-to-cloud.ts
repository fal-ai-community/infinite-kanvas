/**
 * Migration script to move data from IndexedDB to cloud storage
 *
 * @description This script migrates canvas data and images from the legacy
 * IndexedDB storage to the new cloud infrastructure (D1 + R2).
 *
 * Run this from the browser console or as part of the app initialization.
 */

import type { PlacedImage, PlacedVideo } from "@/types/canvas";
import type { ViewportState } from "@/types/multiplayer";

interface LegacyCanvasData {
  id: string;
  images: PlacedImage[];
  videos: PlacedVideo[];
  viewport: ViewportState;
  lastSaved?: Date;
}

interface MigrationResult {
  canvases: number;
  images: number;
  errors: string[];
}

/**
 * Opens the legacy IndexedDB database
 */
async function openLegacyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("infinite-canvas-db", 1);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains("canvases")) {
        db.createObjectStore("canvases", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images", { keyPath: "id" });
      }
    };
  });
}

/**
 * Retrieves all canvases from IndexedDB
 */
async function getLegacyCanvases(db: IDBDatabase): Promise<LegacyCanvasData[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["canvases"], "readonly");
    const store = transaction.objectStore("canvases");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves all images from IndexedDB
 */
async function getLegacyImages(db: IDBDatabase): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["images"], "readonly");
    const store = transaction.objectStore("images");
    const request = store.getAll();

    request.onsuccess = () => {
      const imageMap = new Map<string, string>();
      const results = request.result || [];

      results.forEach((item: any) => {
        if (item.id && item.dataUrl) {
          imageMap.set(item.id, item.dataUrl);
        }
      });

      resolve(imageMap);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Converts blob URL to data URL
 */
async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Failed to convert blob URL: ${blobUrl}`, error);
    throw error;
  }
}

/**
 * Main migration function
 */
export async function migrateIndexedDBToCloud(
  trpcClient: any,
  userId: string,
): Promise<MigrationResult> {
  const result: MigrationResult = {
    canvases: 0,
    images: 0,
    errors: [],
  };

  try {
    // Open legacy database
    const db = await openLegacyDB();

    // Get all canvases and images
    const canvases = await getLegacyCanvases(db);
    const imageDataUrls = await getLegacyImages(db);

    console.log(`Found ${canvases.length} canvases to migrate`);
    console.log(`Found ${imageDataUrls.size} images to migrate`);

    // Migrate each canvas
    for (const canvas of canvases) {
      try {
        console.log(`Migrating canvas ${canvas.id}...`);

        // Process images for this canvas
        const migratedImages: PlacedImage[] = [];

        for (const image of canvas.images) {
          try {
            let imageDataUrl = image.src;

            // Convert blob URLs to data URLs
            if (image.src.startsWith("blob:")) {
              imageDataUrl = await blobUrlToDataUrl(image.src);
            }
            // Try to find image in the images store
            else if (
              !image.src.startsWith("data:") &&
              !image.src.startsWith("http")
            ) {
              const storedDataUrl = imageDataUrls.get(image.id);
              if (storedDataUrl) {
                imageDataUrl = storedDataUrl;
              }
            }

            // Skip if we couldn't get image data
            if (!imageDataUrl || imageDataUrl === image.src) {
              if (!image.src.startsWith("http")) {
                console.warn(`Skipping image ${image.id} - no data URL found`);
                continue;
              }
            }

            migratedImages.push({
              ...image,
              src: imageDataUrl,
            });

            result.images++;
          } catch (error) {
            const errorMsg = `Failed to process image ${image.id}: ${error}`;
            console.error(errorMsg);
            result.errors.push(errorMsg);
          }
        }

        // Create canvas in cloud
        const canvasResult = await trpcClient.canvas.create.mutate({
          title: `Migrated Canvas (${new Date(canvas.lastSaved || Date.now()).toLocaleDateString()})`,
          state: {
            images: migratedImages,
            videos: canvas.videos || [],
            viewport: canvas.viewport || { x: 0, y: 0, scale: 1 },
            version: "1.0.0",
          },
          isPublic: false,
        });

        console.log(
          `Created canvas ${canvasResult.id} with ${migratedImages.length} images`,
        );
        result.canvases++;
      } catch (error) {
        const errorMsg = `Failed to migrate canvas ${canvas.id}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    // Close database
    db.close();

    // Optionally clear IndexedDB after successful migration
    if (result.canvases > 0 && result.errors.length === 0) {
      const shouldClear = confirm(
        `Migration completed successfully!\n\n` +
          `Migrated ${result.canvases} canvases with ${result.images} images.\n\n` +
          `Do you want to clear the old IndexedDB data?`,
      );

      if (shouldClear) {
        await clearLegacyData();
      }
    }
  } catch (error) {
    console.error("Migration failed:", error);
    result.errors.push(`Migration failed: ${error}`);
  }

  return result;
}

/**
 * Clears legacy IndexedDB data
 */
async function clearLegacyData(): Promise<void> {
  try {
    await indexedDB.deleteDatabase("infinite-canvas-db");
    console.log("Legacy IndexedDB cleared successfully");
  } catch (error) {
    console.error("Failed to clear legacy data:", error);
  }
}

/**
 * Utility to run migration from browser console
 */
if (typeof window !== "undefined") {
  (window as any).runCanvasMigration = async () => {
    console.log("Starting canvas migration...");
    console.log("Please ensure you are logged in first.");

    // This would need to be adapted based on how you expose the tRPC client
    const trpcClient = (window as any).__APP_TRPC_CLIENT;
    const userId = (window as any).__APP_USER_ID;

    if (!trpcClient || !userId) {
      console.error(
        "Missing tRPC client or user ID. Please ensure you are logged in.",
      );
      return;
    }

    const result = await migrateIndexedDBToCloud(trpcClient, userId);

    console.log("Migration completed:", result);

    if (result.errors.length > 0) {
      console.error("Migration errors:", result.errors);
    }
  };
}
