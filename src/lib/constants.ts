// PartyKit configuration
export const DEFAULT_DEV_PORT = 1999;
export const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || `localhost:${DEFAULT_DEV_PORT}`;

// Reconnection settings
export const BASE_DELAY_MS = 1000;
export const BACKOFF_MULTIPLIER = 2;
export const MAX_BACKOFF_DELAY_MS = 30000;

// Chat settings
export const MAX_CHAT_MESSAGES = 100;

// Performance settings
export const CURSOR_THROTTLE_MS = 16; // ~60fps
export const VIEWPORT_DEBOUNCE_MS = 100;

// Presence settings
export const IDLE_TIMEOUT_MS = 5000;