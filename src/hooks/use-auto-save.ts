import { useEffect, useRef, useCallback } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { uploadImageToR2 } from "@/lib/cloudflare/image-handler";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";
import type { ViewportState } from "@/types/multiplayer";
import { useAuth } from "@clerk/nextjs";
import { debounce } from "@/lib/utils";
import { logError } from "@/lib/errors";

interface AutoSaveState {
  images: PlacedImage[];
  videos: PlacedVideo[];
  viewport: ViewportState;
}

interface UseAutoSaveOptions {
  canvasId?: string;
  enabled?: boolean;
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: Error) => void;
}

/**
 * Hook for auto-saving canvas state to cloud storage
 *
 * @description Automatically saves canvas changes to Cloudflare D1 database
 * with debouncing. Handles image uploads to R2 before saving state.
 *
 * @param {UseAutoSaveOptions} options - Configuration options
 * @param {string} options.canvasId - ID of the canvas to save
 * @param {boolean} options.enabled - Whether auto-save is enabled (default: true)
 * @param {number} options.debounceMs - Debounce delay in milliseconds (default: 2000)
 * @param {Function} options.onSaveStart - Callback when save starts
 * @param {Function} options.onSaveComplete - Callback when save completes
 * @param {Function} options.onSaveError - Callback when save fails
 *
 * @returns {Object} Auto-save controls
 * @returns {Function} returns.updateState - Update canvas state and trigger debounced save
 * @returns {Function} returns.saveNow - Force immediate save
 * @returns {boolean} returns.isSaving - Whether save is in progress
 *
 * @example
 * const { updateState, saveNow, isSaving } = useAutoSave({
 *   canvasId: 'abc123',
 *   onSaveComplete: () => console.log('Saved!'),
 *   onSaveError: (error) => console.error('Save failed:', error)
 * });
 */
export function useAutoSave({
  canvasId,
  enabled = true,
  debounceMs = 2000,
  onSaveStart,
  onSaveComplete,
  onSaveError,
}: UseAutoSaveOptions) {
  const { userId } = useAuth();
  const trpc = useTRPC();
  const saveStateRef = useRef<AutoSaveState | null>(null);
  const isSavingRef = useRef(false);

  const updateMutation = useMutation({
    ...trpc.canvas.update.mutationOptions(),
    onSuccess: () => {
      isSavingRef.current = false;
      onSaveComplete?.();
    },
    onError: (error) => {
      isSavingRef.current = false;
      onSaveError?.(new Error(error.message || "Failed to save canvas"));
    },
  });

  // Upload images that haven't been uploaded yet
  const uploadPendingImages = useCallback(
    async (images: PlacedImage[]) => {
      if (!canvasId) return images;

      const uploadPromises = images.map(async (image) => {
        // Skip if already uploaded or is a placeholder
        if (
          image.cloudImageId ||
          image.src.startsWith("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP")
        ) {
          return image;
        }

        // Skip if it's already a cloud URL
        if (!image.src.startsWith("data:") && !image.src.startsWith("blob:")) {
          return image;
        }

        try {
          const cloudImage = await uploadImageToR2(image.src, canvasId, trpc);
          return {
            ...image,
            src: cloudImage.url,
            cloudImageId: cloudImage.id,
          };
        } catch (error) {
          logError(error, {
            context: "uploadPendingImages",
            imageId: image.id,
            canvasId,
          });
          // Return original image if upload fails
          return image;
        }
      });

      return Promise.all(uploadPromises);
    },
    [canvasId, trpc],
  );

  // Save function with offline support
  const performSave = useCallback(async () => {
    if (!canvasId || !userId || !saveStateRef.current || isSavingRef.current) {
      return;
    }

    const state = saveStateRef.current;
    isSavingRef.current = true;
    onSaveStart?.();

    try {
      // Check if we're online
      if (!navigator.onLine) {
        // Save to cache for background sync
        if ("serviceWorker" in navigator && "SyncManager" in window) {
          const cache = await caches.open("canvas-sync");
          const syncRequest = new Request(`/sync/${canvasId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              canvasId,
              state,
              timestamp: Date.now(),
            }),
          });

          await cache.put(
            syncRequest.url,
            new Response(syncRequest.body, {
              status: 200,
              headers: syncRequest.headers,
            }),
          );

          // Register background sync
          const registration = await navigator.serviceWorker.ready;
          await (registration as any).sync.register(`save-canvas-${canvasId}`);

          isSavingRef.current = false;
          onSaveComplete?.();
          return;
        }
      }

      // Upload any pending images
      const cloudImages = await uploadPendingImages(state.images);

      // Update canvas state in D1
      await updateMutation.mutateAsync({
        id: canvasId,
        state: {
          images: cloudImages,
          videos: state.videos,
          viewport: state.viewport,
          version: "1.0.0",
        },
      });
    } catch (error) {
      logError(error, {
        context: "performSave",
        canvasId,
        userId,
      });
      isSavingRef.current = false;
      onSaveError?.(error as Error);
    }
  }, [
    canvasId,
    userId,
    uploadPendingImages,
    updateMutation,
    onSaveStart,
    onSaveError,
    onSaveComplete,
  ]);

  // Debounced save
  const debouncedSave = useRef(debounce(performSave, debounceMs)).current;

  // Update state and trigger save
  const updateState = useCallback(
    (newState: AutoSaveState) => {
      if (!enabled || !canvasId) return;

      saveStateRef.current = newState;
      debouncedSave();
    },
    [enabled, canvasId, debouncedSave],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Debounced save will be cleaned up automatically
    };
  }, []);

  return {
    updateState,
    saveNow: performSave,
    isSaving: isSavingRef.current,
  };
}
