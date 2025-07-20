import type { FalClient } from "@fal-ai/client";
import PartySocket from "partysocket";

import { uploadImageDirect } from "@/lib/handlers/generation-handler";
import type { PlacedImage } from "@/types/canvas";
import { PARTYKIT_HOST } from "@/lib/constants";

import type { SyncAdapter, SyncHandlers, ViewportState } from "./types";

interface PartyKitAdapterOptions {
  falClient: FalClient;
  roomId: string;
  setIsApiKeyDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toast: (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
  onConnectionStateChange?: (state: 'connected' | 'disconnected' | 'error') => void;
}

// No-op implementation for single-player mode
class NoOpSyncAdapter implements SyncAdapter {
  async onImageUpdate(_image: PlacedImage): Promise<void> {
    // No-op
  }

  async onImageAdd(_image: PlacedImage): Promise<void> {
    // No-op
  }

  onImageRemove(_imageId: string): void {
    // No-op
  }

  onViewportChange(_viewport: ViewportState): void {
    // No-op
  }

  onCursorMove(_position: { x: number; y: number }): void {
    // No-op
  }

  onGenerationStart(_imageId: string): void {
    // No-op
  }

  onGenerationComplete(_imageId: string): void {
    // No-op
  }

  sendChatMessage(_text: string): void {
    // No-op
  }

  subscribe(_handlers: SyncHandlers): () => void {
    // Return empty cleanup function
    return () => {};
  }

  isConnected(): boolean {
    return false;
  }

  getConnectionId(): string | null {
    return null;
  }
}

// PartyKit implementation for multiplayer mode
class PartyKitSyncAdapter implements SyncAdapter {
  private socket: PartySocket;
  private handlers: SyncHandlers = {};
  private pendingOperations = new Map<string, any>();
  private connectionId: string | null = null;
  private connected = false;
  private userName: string;
  private userColor: string | null = null;

  constructor(private options: PartyKitAdapterOptions) {
    const host = PARTYKIT_HOST;

    // Get username from localStorage
    this.userName = localStorage.getItem("userName") || "Guest";

    console.log(
      `[Client] Creating PartySocket connection to room ${options.roomId} at ${host}`,
    );
    console.log(`[Client] Constructor called at ${new Date().toISOString()}`);

    this.socket = new PartySocket({
      host,
      room: options.roomId,
      party: "main",
      query: {
        name: this.userName,
      },
    });

    this.socket.addEventListener("open", this.handleOpen);
    this.socket.addEventListener("message", this.handleMessage);
    this.socket.addEventListener("close", this.handleClose);
    this.socket.addEventListener("error", this.handleError);
  }

  private handleOpen = () => {
    this.connected = true;
    this.connectionId = this.socket.id;
    console.log("[Client] PartyKit connected with ID:", this.connectionId);
    this.options.onConnectionStateChange?.('connected');
  };

  private handleClose = (event: CloseEvent) => {
    this.connected = false;
    console.log(
      `[Client] PartyKit disconnected - Code: ${event.code}, Reason: ${event.reason}`,
    );
    
    this.options.onConnectionStateChange?.('disconnected');

    // Try to reconnect if it was an abnormal closure
    if (event.code !== 1000 && event.code !== 1001) {
      console.log("[Client] Attempting to reconnect in 1 second...");
      setTimeout(() => {
        console.log("[Client] Reconnecting...");
        this.socket.reconnect();
      }, 1000);
    }
  };

  private handleError = (error: Event) => {
    console.error("[Client] PartyKit error:", error);
    this.options.onConnectionStateChange?.('error');
  };

  private handleMessage = (event: MessageEvent) => {
    const message = JSON.parse(event.data);
    console.log("[Client] Received message:", message.type, message.data);

    switch (message.type) {
      case "sync:full":
        this.handlers.onFullSync?.(message.data);
        break;
      case "connection:info":
        // Store our connection info
        this.userColor = message.data.color;
        // Add ourselves to presence
        this.handlers.onPresenceUpdate?.({ 
          ...message.data, 
          type: "join",
          cursor: null 
        });
        break;
      case "image:update":
        this.handlers.onImageUpdate?.(message.data);
        break;
      case "image:add":
        this.handlers.onImageAdd?.(message.data);
        break;
      case "image:remove":
        this.handlers.onImageRemove?.(message.data.imageId);
        break;
      case "viewport:change":
        this.handlers.onViewportChange?.(message.data.userId, message.data.viewport);
        break;
      case "presence:join":
        this.handlers.onPresenceUpdate?.({ ...message.data, type: "join" });
        break;
      case "presence:leave":
        this.handlers.onPresenceUpdate?.({ ...message.data, type: "leave" });
        break;
      case "cursor:move":
        // For cursor moves, only update the cursor position
        this.handlers.onPresenceUpdate?.({ 
          ...message.data,
          type: "move" 
        });
        break;
      case "chat:history":
        this.handlers.onChatHistory?.(message.data);
        break;
      case "chat:new":
        this.handlers.onChatMessage?.(message.data);
        break;
    }
  };

  // Outgoing operations
  async onImageAdd(image: PlacedImage): Promise<void> {
    // Upload to fal.storage if local file
    const syncedImage = await this.ensureImageUploaded(image);

    this.socket.send(
      JSON.stringify({
        type: "image:add",
        data: syncedImage,
      }),
    );
  }

  async onImageUpdate(image: PlacedImage): Promise<void> {
    // Upload to fal.storage if local file
    const syncedImage = await this.ensureImageUploaded(image);

    this.socket.send(
      JSON.stringify({
        type: "image:update",
        data: syncedImage,
      }),
    );
  }

  onImageRemove(imageId: string): void {
    this.socket.send(
      JSON.stringify({
        type: "image:remove",
        data: { imageId },
      }),
    );
  }

  onViewportChange(viewport: ViewportState): void {
    this.socket.send(
      JSON.stringify({
        type: "viewport:change",
        data: viewport,
      }),
    );
  }

  onCursorMove(position: { x: number; y: number }): void {
    this.socket.send(
      JSON.stringify({
        type: "cursor:move",
        data: {
          userId: this.connectionId,
          cursor: position,
        },
      }),
    );
  }

  onGenerationStart(imageId: string): void {
    this.socket.send(
      JSON.stringify({
        type: "generation:start",
        data: { imageId },
      }),
    );
  }

  onGenerationComplete(imageId: string): void {
    this.socket.send(
      JSON.stringify({
        type: "generation:complete",
        data: { imageId },
      }),
    );
  }

  private async ensureImageUploaded(image: PlacedImage): Promise<PlacedImage> {
    // Skip if already a URL
    if (image.src.startsWith("http")) {
      return image;
    }

    try {
      // Upload to fal.storage
      const uploadResult = await uploadImageDirect(
        image.src,
        this.options.falClient,
        this.options.toast,
        this.options.setIsApiKeyDialogOpen,
      );

      if (!uploadResult?.url) {
        throw new Error(`Upload failed for image ${image.id} (size: ${image.width}x${image.height}) - no URL returned`);
      }

      return {
        ...image,
        src: uploadResult.url,
      };
    } catch (error) {
      console.error("Failed to upload image for sync:", error);
      this.options.toast({
        title: "Failed to sync image",
        description: "Image will only be visible locally",
        variant: "destructive",
      });
      throw error;
    }
  }

  subscribe(handlers: SyncHandlers): () => void {
    this.handlers = handlers;
    return () => {
      console.log("[Client] Unsubscribing and closing connection");
      this.socket.close(1000, "Client unsubscribed");
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectionId(): string | null {
    return this.connectionId;
  }

  sendChatMessage(text: string): void {
    if (!this.connected) {
      console.warn("[Client] Cannot send chat message - not connected");
      return;
    }

    console.log(
      `[Client] Sending chat message: "${text}" Connected: ${this.connected}, Socket state: ${this.socket.readyState}`,
    );
    this.socket.send(
      JSON.stringify({
        type: "chat:send",
        data: { text },
      }),
    );
  }
}

// Factory function to create the appropriate adapter
export function createSyncAdapter(
  options?: PartyKitAdapterOptions,
): SyncAdapter {
  if (options) {
    return new PartyKitSyncAdapter(options);
  }
  return new NoOpSyncAdapter();
}

// Export the adapters for backwards compatibility
export { NoOpSyncAdapter, PartyKitSyncAdapter };
