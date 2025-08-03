# Multiplayer Library

Real-time multiplayer functionality using PartyKit for WebSocket connections.

## Architecture

This library implements an adapter pattern that allows the canvas to work seamlessly in both single-player and multiplayer modes.

## Files

### adapter.ts

The core multiplayer adapter:

- Manages WebSocket connection lifecycle
- Handles event serialization/deserialization
- Implements reconnect logic with exponential backoff
- Throttles events for performance
- Syncs canvas state between users

### index.ts

Main export file that:

- Re-exports multiplayer utilities
- Provides types for TypeScript
- Exposes adapter initialization

### types.ts

TypeScript definitions:

- Multiplayer event types
- Room and user interfaces
- Connection state enumerations
- Event payload structures

## Usage Pattern

```typescript
// In canvas component
import { useMultiplayer } from "@/lib/multiplayer";

const { isConnected, users, broadcast, on } = useMultiplayer(roomId);

// Broadcast canvas changes
broadcast({
  type: "canvas:image-transform",
  data: { imageId, position, scale },
});

// Listen for remote changes
on("canvas:image-transform", (data) => {
  updateImage(data.imageId, data);
});
```

## Event Types

### Canvas Events

- `canvas:transform` - Viewport pan/zoom changes
- `image:transform` - Image position, scale, rotation updates
- `image:add` - New image added to canvas
- `image:remove` - Image deleted from canvas

### User Events

- `user:join` - User entered the room
- `user:leave` - User left the room
- `cursor:move` - Cursor position with metadata

### Chat Events

- `chat:message` - Text messages between users

## Performance Optimizations

### Event Throttling

- Cursor movements: 60fps limit
- Canvas transforms: 100ms debounce
- Image updates: Batch processing

### Data Optimization

- Only send delta changes
- JSON schema for compact serialization
- Binary payloads for large data

### Connection Management

- Automatic reconnect with backoff
- Heartbeat/ping for connection health
- Offline detection and queuing

## Integration Points

### With Canvas Components

- MultiplayerCursors component consumes user data
- Canvas state updates are broadcast automatically
- Event bus pattern for decoupled communication

### With Storage

- Syncs with Cloudflare D1 for persistence
- Uses fal.ai storage for shared images
- KV cache for presence and room metadata

### With Authentication

- Uses Clerk JWT for secure connections
- User identity mapped to session
- Permission checking per room

## Error Handling

- Connection errors show in UI
- Retry mechanism for transient failures
- Graceful degradation to offline mode
- User notifications for disconnections

## Configuration

```typescript
// PartyKit host configuration
const partykitHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

// Connection options
const options = {
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,
};
```

## Debugging

Enable debug logging:

```typescript
localStorage.setItem("debug", "multiplayer:*");
```

Log levels:

- `multiplayer:events` - All events send/received
- `multiplayer:connection` - Connection state changes
- `multiplayer:error` - Connection errors

## Future Enhancements

- Room state persistence
- User roles and permissions
- Recording and playback
- Enhanced conflict resolution
- Mobile optimization
