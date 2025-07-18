import { openDB, DBSchema, IDBPDatabase } from "idb";

interface CanvasImage {
  id: string;
  originalDataUrl: string;
  uploadedUrl?: string;
  createdAt: number;
}

interface ImageTransform {
  scale: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  cropBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface CanvasElement {
  id: string;
  type: "image" | "text" | "shape" | "video";
  imageId?: string; // Reference to IndexedDB image
  videoId?: string; // Reference to IndexedDB video
  transform: ImageTransform;
  zIndex: number;
  width?: number;
  height?: number;
  // Video-specific properties
  duration?: number;
  currentTime?: number;
  isPlaying?: boolean;
  volume?: number;
  muted?: boolean;
}

interface CanvasState {
  elements: CanvasElement[];
  backgroundColor?: string;
  lastModified: number;
  viewport?: {
    x: number;
    y: number;
    scale: number;
  };
}

interface CanvasVideo {
  id: string;
  originalDataUrl: string;
  uploadedUrl?: string;
  duration: number;
  createdAt: number;
}

// IndexedDB schema
interface CanvasDB extends DBSchema {
  images: {
    key: string;
    value: CanvasImage;
  };
  videos: {
    key: string;
    value: CanvasVideo;
  };
}

class CanvasStorage {
  private db: IDBPDatabase<CanvasDB> | null = null;
  private readonly DB_NAME = "infinite-kanvas-db";
  private readonly DB_VERSION = 1;
  private readonly STATE_KEY = "canvas-state";
  private readonly MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB max per image

  async init() {
    this.db = await openDB<CanvasDB>(this.DB_NAME, this.DB_VERSION + 1, {
      upgrade(db: IDBPDatabase<CanvasDB>, oldVersion) {
        if (!db.objectStoreNames.contains("images")) {
          db.createObjectStore("images", { keyPath: "id" });
        }

        // Add videos object store in version 2
        if (oldVersion < 2 && !db.objectStoreNames.contains("videos")) {
          db.createObjectStore("videos", { keyPath: "id" });
        }
      },
    });
  }

  // Save image to IndexedDB
  async saveImage(dataUrl: string, id?: string): Promise<string> {
    if (!this.db) await this.init();

    // Check size
    const sizeInBytes = new Blob([dataUrl]).size;
    if (sizeInBytes > this.MAX_IMAGE_SIZE) {
      throw new Error(
        `Image size exceeds maximum allowed size of ${this.MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      );
    }

    const imageId = id || crypto.randomUUID();
    const image: CanvasImage = {
      id: imageId,
      originalDataUrl: dataUrl,
      createdAt: Date.now(),
    };

    await this.db!.put("images", image);
    return imageId;
  }

  // Get image from IndexedDB
  async getImage(id: string): Promise<CanvasImage | undefined> {
    if (!this.db) await this.init();
    return await this.db!.get("images", id);
  }

  // Delete image from IndexedDB
  async deleteImage(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete("images", id);
  }

  // Save video to IndexedDB
  async saveVideo(
    videoDataUrl: string,
    duration: number,
    id?: string,
  ): Promise<string> {
    if (!this.db) await this.init();

    // Check size
    const sizeInBytes = new Blob([videoDataUrl]).size;
    if (sizeInBytes > this.MAX_IMAGE_SIZE) {
      throw new Error(
        `Video size exceeds maximum allowed size of ${this.MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      );
    }

    const videoId = id || crypto.randomUUID();
    const video: CanvasVideo = {
      id: videoId,
      originalDataUrl: videoDataUrl,
      duration,
      createdAt: Date.now(),
    };

    await this.db!.put("videos", video);
    return videoId;
  }

  // Get video from IndexedDB
  async getVideo(id: string): Promise<CanvasVideo | undefined> {
    if (!this.db) await this.init();
    return await this.db!.get("videos", id);
  }

  // Delete video from IndexedDB
  async deleteVideo(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete("videos", id);
  }

  // Save canvas state to localStorage
  saveCanvasState(state: CanvasState): void {
    try {
      localStorage.setItem(this.STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save canvas state:", e);
      // Handle quota exceeded error
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        this.cleanupOldData();
      }
    }
  }

  // Load canvas state from localStorage
  getCanvasState(): CanvasState | null {
    try {
      const stored = localStorage.getItem(this.STATE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Failed to load canvas state:", e);
      return null;
    }
  }

  // Clear all stored data
  async clearAll(): Promise<void> {
    localStorage.removeItem(this.STATE_KEY);
    if (!this.db) await this.init();

    // Clear images
    const imageTx = this.db!.transaction("images", "readwrite");
    await imageTx.objectStore("images").clear();
    await imageTx.done;

    // Clear videos
    try {
      const videoTx = this.db!.transaction("videos", "readwrite");
      await videoTx.objectStore("videos").clear();
      await videoTx.done;
    } catch (e) {
      // Handle case where videos store might not exist yet in older DB versions
      console.warn("Could not clear videos store, it may not exist yet:", e);
    }
  }

  // Cleanup old/unused images and videos
  async cleanupOldData(): Promise<void> {
    if (!this.db) await this.init();

    const state = this.getCanvasState();
    if (!state) return;

    // Get all image IDs currently in use
    const usedImageIds = new Set(
      state.elements
        .filter((el) => el.type === "image" && el.imageId)
        .map((el) => el.imageId!),
    );

    // Get all video IDs currently in use
    const usedVideoIds = new Set(
      state.elements
        .filter((el) => el.type === "video" && el.videoId)
        .map((el) => el.videoId!),
    );

    // Delete unused images
    const allImages = await this.db!.getAll("images");
    for (const image of allImages) {
      if (!usedImageIds.has(image.id)) {
        await this.deleteImage(image.id);
      }
    }

    // Delete unused videos
    const allVideos = await this.db!.getAll("videos");
    for (const video of allVideos) {
      if (!usedVideoIds.has(video.id)) {
        await this.deleteVideo(video.id);
      }
    }
  }

  // Export canvas data (for cloud backup)
  async exportCanvasData(): Promise<{
    state: CanvasState;
    images: CanvasImage[];
    videos: CanvasVideo[];
  }> {
    if (!this.db) await this.init();

    const state = this.getCanvasState();
    if (!state) throw new Error("No canvas state to export");

    const images = await this.db!.getAll("images");
    const videos = await this.db!.getAll("videos");
    return { state, images, videos };
  }

  // Import canvas data
  async importCanvasData(data: {
    state: CanvasState;
    images: CanvasImage[];
    videos?: CanvasVideo[]; // Optional for backward compatibility
  }): Promise<void> {
    if (!this.db) await this.init();

    // Clear existing data
    await this.clearAll();

    // Import images
    const imageTx = this.db!.transaction("images", "readwrite");
    for (const image of data.images) {
      await imageTx.objectStore("images").put(image);
    }
    await imageTx.done;

    // Import videos if they exist
    if (data.videos && data.videos.length > 0) {
      const videoTx = this.db!.transaction("videos", "readwrite");
      for (const video of data.videos) {
        await videoTx.objectStore("videos").put(video);
      }
      await videoTx.done;
    }

    // Import state
    this.saveCanvasState(data.state);
  }
}

export const canvasStorage = new CanvasStorage();
export type {
  CanvasState,
  CanvasElement,
  ImageTransform,
  CanvasImage,
  CanvasVideo,
};
