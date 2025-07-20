# Multiplayer Canvas Guide

## Overview

fal infinite kanvas supports real-time collaborative editing using PartyKit. Multiple users can work on the same canvas simultaneously with live cursor tracking, presence indicators, and chat functionality.

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

- **PartyKit**: WebSocket server for real-time communication
- **Jotai atoms**: Centralized state management for multiplayer
- **Adapter pattern**: Clean separation between single/multiplayer logic
- **fal.storage**: Automatic image hosting for shared canvases

#### Key Files

```
/party/
  ├── index.ts        # Main PartyKit server
  └── registry.ts     # Room discovery server

/src/lib/multiplayer/
  ├── adapter.ts      # PartyKit sync adapter
  ├── types.ts        # TypeScript types
  └── index.ts        # Exports

/src/atoms/
  └── multiplayer.ts  # Jotai atoms for state

/src/components/canvas/multiplayer/
  ├── MultiplayerCursors.tsx  # Cursor rendering
  ├── MultiplayerPanel.tsx    # User list & controls
  └── ConnectionStatus.tsx    # Connection indicator

/src/hooks/
  ├── use-multiplayer.ts      # Main multiplayer hook
  └── use-room-registry.ts    # Room discovery hook
```

## Production Deployment

### Deploy PartyKit Server

```bash
# Deploy to PartyKit
npx partykit deploy

# Set environment variable in your hosting platform
NEXT_PUBLIC_PARTYKIT_HOST=your-app.your-username.partykit.dev
```

### Environment Variables

```env
# .env.local (for production)
NEXT_PUBLIC_PARTYKIT_HOST=your-app.your-username.partykit.dev

# Development (optional, defaults to localhost:1999)
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
```

## Keyboard Shortcuts

- **Cmd/Ctrl + K**: Toggle multiplayer panel
- **Click on user**: Follow their viewport
- **Middle-click drag**: Break following (pan canvas)

## Performance

- Cursor updates throttled to 60fps for smooth tracking
- Viewport changes debounced to 100ms
- Only visible cursors are rendered
- Automatic reconnection with exponential backoff
- Idle timeout removes inactive cursors after 5 seconds

## Limitations

- Room sessions are ephemeral (not persisted)
- Maximum 100 chat messages per room
- WebSocket connections may timeout on some hosts
- Large images require upload before syncing

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
