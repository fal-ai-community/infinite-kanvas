// Database types matching our D1 schema

import type { PlacedImage, PlacedVideo } from "./canvas";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Canvas {
  id: string;
  user_id: string;
  title: string;
  state_json: string; // JSON string of canvas state
  thumbnail_url?: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export interface CanvasImage {
  id: string;
  canvas_id: string;
  r2_key: string;
  url: string;
  size?: number | null;
  mime_type?: string | null;
  created_at: string;
}

export interface SharedLink {
  id: string;
  canvas_id: string;
  share_token: string;
  expires_at?: string | null;
  created_at: string;
}

// Canvas state type (what gets stored in state_json)
export interface CanvasState {
  images: PlacedImage[];
  videos: PlacedVideo[];
  viewport: {
    x: number;
    y: number;
    scale: number;
  };
  version: string;
}

// Import existing types from the canvas
export type { PlacedImage, PlacedVideo } from "@/types/canvas";
