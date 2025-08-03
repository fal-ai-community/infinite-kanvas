# Multiplayer Canvas Guide

## Overview

Infinite Kanvas supports real-time collaborative editing using PartyKit. Multiple users can work on the same canvas simultaneously with live cursor tracking, presence indicators, in-room chat, and seamless synchronization of all canvas operations.

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Run development servers (both Next.js and PartyKit)
npm run dev

# This runs both servers concurrently:
# - PartyKit server on localhost:1999
# - Next.js app on localhost:3000
```

### Using Multiplayer

1. **Browse rooms**: Visit `http://localhost:3000` to see available public rooms
2. **Create a room**: Click "Create Room" button on the homepage
3. **Join a room**: Click on any room card or visit `http://localhost:3000/k/[room-id]`
4. **Share a room**: Copy the room URL to invite others

## Features

### Real-time Collaboration

- **Live cursors**: See other users' cursor positions in real-time (60fps)
- **User presence**: See who's in the room with names and colors
- **Click-to-follow**: Click on any user to follow their viewport
- **Instant sync**: All canvas operations sync immediately
- **In-room chat**: Communicate with other users via chat

### Room Management

- **Public/Private rooms**: Create public rooms visible to all or private rooms
- **Room discovery**: Browse active public rooms from the homepage
- **Name customization**: Click edit icon next to your name in the panel
- **Connection status**: Visual indicator shows connection state

### Technical Implementation

#### Architecture

The multiplayer system follows a clean, event-driven architecture:

- **PartyKit**: WebSocket server for real-time communication
- **Jotai atoms**: Centralized state management for multiplayer
- **Adapter pattern**: Clean separation between single/multiplayer logic
- **Cloudflare storage**: Automatic image hosting + fal.ai collaboration
- **Room registry**: Central room discovery and management

#### Key Files

```
/party/
  ├── index.ts              # Main PartyKit server
  └── registry.ts           # Room discovery server

/src/lib/multiplayer/
  ├── adapter.ts           # PartyKit sync adapter
  ├── index.ts             # Exports
  └── types.ts             # TypeScript types

/src/atoms/
  └── multiplayer.ts       # Jotai atoms for multiplayer state

/src/components/canvas/multiplayer/
  ├── MultiplayerCursors.tsx   # Real-time cursor rendering
  ├── MultiplayerPanel.tsx     # User list, chat & controls
  └── ConnectionStatus.tsx     # Connection state indicator

/src/hooks/
  ├── use-multiplayer.ts       # Main multiplayer hook
  ├── use-room-registry.ts     # Room discovery & listing
  └── use-auto-save.ts         # Auto-save with multiplayer sync

/src/
  ├── app/
  │   ├── (authenticated)/k/[roomId]/...  # Room pages
  │   └── api/                   # API routes
  └── middleware.ts            # Authentication middleware
```

## Production Deployment

### Deploy PartyKit Server

```bash
# Deploy to PartyKit
npx partykit deploy

# Set environment variables
NEXT_PUBLIC_PARTYKIT_HOST=your-app.your-username.partykit.dev
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
```

### Environment Variables

```env
# .env.local (production)
NEXT_PUBLIC_PARTYKIT_HOST=your-app.your-username.partykit.dev
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# Development (defaults)
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
```

## Keyboard Shortcuts

- **Cmd/Ctrl + K**: Toggle multiplayer panel
- **Click on user**: Follow their viewport
- **Middle-click drag**: Break following (pan canvas)

## Performance & Scaling

### Optimizations

- **Cursor updates**: Throttled to 60fps for smooth tracking
- **Viewport sync**: Debounced to 100ms for efficiency
- **Rendering**: Only visible cursors rendered
- **Reconnection**: Exponential backoff for reliability
- **Idle management**: Inactive cursors removed after 5 seconds

### Scaling Considerations

- Each PartyKit room lives in its own isolate
- Room discovery uses KV for horizontal scaling
- Image references via fal.ai URLs prevent data duplication
- Canvas state efficiently serialized for sync

### Multiplayer Events & Data Flow

```typescript
// Room connection flow
1. User visits /k/[roomId]
2. Check authentication (Clerk)
3. Connect to PartyKit WebSocket
4. Join room with user info
5. Sync canvas state
6. Start real-time collaboration

// Events handled:
// - cursor:move - Cursor position updates
// - canvas:transform - Canvas viewport changes
// - image:transform - Image manipulations
// - image:add/remove - Canvas content changes
// - user:join/leave - Presence management
// - chat:message - In-room communication
```

## Limitations & Future Enhancements

### Current Limitations

- Room sessions are ephemeral (not persisted between restarts)
- Maximum 100 chat messages per room
- WebSocket connections may timeout on some hosts
- Large images require upload before sharing
- No offline support for multiplayer sessions

### Future Enhancements

#### v1.3 - Persistence Layer

- Persistent rooms with save/load functionality
- Room templates and presets
- Version history for collaborative work
- Export/import room configurations

#### v1.4 - Enhanced Collaboration

- User authentication and profiles
- Permissions system (view/edit/admin)
- Voice/video chat integration
- Comments and annotations

#### v2.0 - Mobile & Advanced Features

- Native mobile apps with multiplayer
- Collaborative drawing tools
- Real-time filters and effects
- Offline synchronization
- AI-powered collaborative features

## Security

- WebSocket connections use WSS in production
- Input sanitization needed for chat messages
- Rate limiting recommended for cursor updates
- Room IDs are UUIDs for privacy

## Future Enhancements

- Persistent rooms with save/load functionality
- User authentication and profiles
- Voice/video chat integration
- Collaborative drawing tools
- Mobile app support
- Offline sync capabilities
