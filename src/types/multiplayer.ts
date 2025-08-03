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
  email?: string;
  image?: string;
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
