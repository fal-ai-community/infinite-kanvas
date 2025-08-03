# PartyKit Server

This directory contains the PartyKit WebSocket server implementation that powers Infinite Kanvas's real-time multiplayer features.

## Files

- `index.ts` - Main PartyKit server handling room connections and synchronization
- `registry.ts` - Room discovery and public room registry

## Architecture

### index.ts

The main PartyKit server handles:

- WebSocket connections from clients
- Room lifecycle management
- Real-time event broadcasting
- User presence tracking
- Canvas state synchronization

Key features:

- Authentication via Clerk JWT tokens
- Room join/leave with permission checking
- Event broadcasting (cursor moves, canvas changes, chat)
- Presence indicators and user lists
- Room state persistence via Cloudflare services

### registry.ts

A special PartyKit party that acts as a room discovery service:

- Maintains list of active public rooms
- Handles room creation/deletion
- Provides room metadata
- Implements room browsing features

## Development

```bash
# PartyKit starts automatically with npm run dev
# PartyKit runs on localhost:1999

# Deploy PartyKit to production
npx partykit deploy
```

## Event Types

```typescript
// Client → Server events
interface ClientEvent {
  type:
    | "cursor:move"
    | "canvas:transform"
    | "image:transform"
    | "image:add"
    | "image:remove"
    | "chat:message"
    | "user:join"
    | "user:leave";
  data: any;
  timestamp: number;
}

// Server → Client events
interface ServerEvent {
  type:
    | "room:joined"
    | "room:left"
    | "user:joined"
    | "user:left"
    | "state:sync"
    | "user:list";
  data: any;
  clientId: string;
}
```

## Integration

The PartyKit server integrates with:

- **Cloudflare KV**: For room registry and presence caching
- **Clerk**: For user authentication
- **D1 Database**: For persistent room data
- **Main Next.js App**: Via WebSocket connection

## Security

- All connections authenticated via Clerk JWT
- Room access permissions validated
- Rate limiting on message sending
- Input sanitization for chat messages
- CORS configuration for cross-origin requests

## Monitoring

Monitor via PartyKit dashboard:

- Connection count per room
- Message throughput
- Error rates
- Memory usage per isolate
