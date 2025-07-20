import type { PlacedImage } from "@/types/canvas";

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface PresenceData {
  userId: string;
  cursor: { x: number; y: number } | null;
  color: string;
  name?: string;
  viewport?: ViewportState;
  lastActive?: number;
  isFollowing?: string | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  color: string;
  text: string;
  timestamp: number;
}

export interface SyncHandlers {
  onFullSync?: (state: {
    images: PlacedImage[];
    viewport: ViewportState;
  }) => void;
  onImageUpdate?: (image: PlacedImage) => void;
  onImageAdd?: (image: PlacedImage) => void;
  onImageRemove?: (imageId: string) => void;
  onViewportChange?: (userId: string, viewport: ViewportState) => void;
  onPresenceUpdate?: (
    data: PresenceData & { type?: "join" | "leave" | "move" },
  ) => void;
  onChatHistory?: (messages: ChatMessage[]) => void;
  onChatMessage?: (message: ChatMessage) => void;
}

export interface SyncAdapter {
  // Called for every state mutation
  onImageUpdate(image: PlacedImage): Promise<void>;
  onImageAdd(image: PlacedImage): Promise<void>;
  onImageRemove(imageId: string): void;
  onViewportChange(viewport: ViewportState): void;
  onCursorMove(position: { x: number; y: number }): void;
  onGenerationStart(imageId: string): void;
  onGenerationComplete(imageId: string): void;

  // Chat functionality
  sendChatMessage?(text: string): void;

  // Subscribe to remote changes
  subscribe(handlers: SyncHandlers): () => void;

  // Connection state
  isConnected(): boolean;
  getConnectionId(): string | null;
}
