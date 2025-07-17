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
  type: "image" | "text" | "shape";
  imageId?: string; // Reference to IndexedDB image
  transform: ImageTransform;
  zIndex: number;
  width?: number;
  height?: number;
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

// IndexedDB schema
interface CanvasDB extends DBSchema {
  images: {
    key: string;
    value: CanvasImage;
  };
}

class CanvasStorage {
  private db: IDBPDatabase<CanvasDB> | null = null;
  private readonly DB_NAME = "infinite-kanvas-db";
  private readonly DB_VERSION = 1;
  private readonly STATE_KEY = "canvas-state";
  private readonly MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB max per image

  async init() {
    this.db = await openDB<CanvasDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db: IDBPDatabase<CanvasDB>) {
        if (!db.objectStoreNames.contains("images")) {
          db.createObjectStore("images", { keyPath: "id" });
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

    const tx = this.db!.transaction("images", "readwrite");
    await tx.objectStore("images").clear();
    await tx.done;
  }

  // Cleanup old/unused images
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

    // Delete unused images
    const allImages = await this.db!.getAll("images");
    for (const image of allImages) {
      if (!usedImageIds.has(image.id)) {
        await this.deleteImage(image.id);
      }
    }
  }

  // Export canvas data (for cloud backup)
  async exportCanvasData(): Promise<{
    state: CanvasState;
    images: CanvasImage[];
  }> {
    if (!this.db) await this.init();

    const state = this.getCanvasState();
    if (!state) throw new Error("No canvas state to export");

    const images = await this.db!.getAll("images");
    return { state, images };
  }

  // Import canvas data
  async importCanvasData(data: {
    state: CanvasState;
    images: CanvasImage[];
  }): Promise<void> {
    if (!this.db) await this.init();

    // Clear existing data
    await this.clearAll();

    // Import images
    const tx = this.db!.transaction("images", "readwrite");
    for (const image of data.images) {
      await tx.objectStore("images").put(image);
    }
    await tx.done;

    // Import state
    this.saveCanvasState(data.state);
  }
}

export const canvasStorage = new CanvasStorage();
export type { CanvasState, CanvasElement, ImageTransform, CanvasImage };
