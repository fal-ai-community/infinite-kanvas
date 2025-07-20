# Multiplayer Canvas Guide

## Overview

Infinite Kanvas now supports real-time collaborative editing using PartyKit. Multiple users can work on the same canvas simultaneously with live cursor tracking and instant synchronization.

## Getting Started

### Development

```bash
# Install dependencies
bun install

# Run with multiplayer support
bun run dev:multiplayer

# Or run servers separately:
# Terminal 1: PartyKit server
bunx partykit dev

# Terminal 2: Next.js app
bun run dev
```

### Using Multiplayer

1. **Single-player mode** (default): Visit `http://localhost:3000`
2. **Create a multiplayer session**: Click the "Multiplayer" button in the toolbar
3. **Join a session**: Use the room URL format: `http://localhost:3000/c/[room-id]`

## Features

### Real-time Collaboration
- **Live cursor tracking**: See where other users are pointing
- **Instant synchronization**: All canvas operations sync immediately
- **Presence indicators**: See who's currently active in the room
- **Automatic image sharing**: Images upload to fal.storage for sharing

### Maintained UX
- Single-player and multiplayer modes have identical interfaces
- Seamless switching between modes
- No performance degradation in single-player mode

### Technical Implementation

#### Architecture
- **PartyKit**: WebSocket server for real-time communication
- **Zustand**: State management for multiplayer data
- **Sync Adapter Pattern**: Clean separation between single/multiplayer logic
- **fal.storage**: Automatic image hosting for multiplayer sessions

#### Key Components
- `/party/index.ts`: PartyKit server implementation
- `/src/lib/sync/`: Sync adapter pattern and types
- `/src/components/providers/MultiplayerProvider.tsx`: React context provider
- `/src/components/canvas/ActiveUsers.tsx`: Presence UI
- `/src/components/canvas/MultiplayerCursor.tsx`: Cursor rendering

## Production Deployment

### Deploy PartyKit Server

```bash
# Deploy to PartyKit
bunx partykit deploy

# Set environment variable in Vercel
NEXT_PUBLIC_PARTYKIT_HOST=your-app.your-username.partykit.dev
```

### Environment Variables

```env
# For production
NEXT_PUBLIC_PARTYKIT_HOST=your-app.your-username.partykit.dev

# For development (optional, defaults to localhost:1999)
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
```

## Limitations

- Sessions are ephemeral (not persisted)
- Maximum 10 concurrent users per room (configurable)
- WebSocket connections limited to 5 minutes on some hosts
- Large images may take time to sync

## Future Enhancements

- Persistent rooms with save/load
- User authentication and profiles
- Voice/video chat integration
- Offline sync capabilities
- Mobile app support