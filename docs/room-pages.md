# Room Page Structure (k/[roomId])

This document covers the structure and implementation of the multiplayer room pages in Infinite Kanvas. Room pages are where users collaborate on canvas content in real-time.

## Route Structure

```
src/app/(authenticated)/k/[roomId]/
├── layout.tsx         # Room-specific layout
└── page.tsx          # Main room component
```

## Page Flow

```
Landing Page → Create/Join Room → /k/[roomId] → Canvas Editor
    ↓                ↓                   ↓              ↓
 Browse Rooms   Enter Room Name    Authenticate   Multiplayer Canvas
                → Room ID          → Join Room   → Real-time Editing
```

## Room Page Layout (`layout.tsx`)

The room layout provides the container for the canvas experience:

```tsx
// src/app/(authenticated)/k/[roomId]/layout.tsx
export default function RoomLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { roomId: string };
}) {
  return (
    <div className="h-screen flex flex-col bg-background">
      <RoomHeader roomId={params.roomId} />
      <div className="flex-1 flex">
        <div className="flex-1">{children}</div>
        <RoomSidebar roomId={params.roomId} />
      </div>
    </div>
  );
}
```

### Key Layout Components

#### RoomHeader

- Room name and status
- Connection status indicator
- User presence summary
- Share room button
- Settings menu

#### RoomSidebar

- Collapsible sidebar
- Multiplayer panel (users, chat)
- AI transformation tools
- Layer management
- History/undo controls

## Room Page Component (`page.tsx`)

The main room component orchestrates all functionality:

```tsx
// src/app/(authenticated)/k/[roomId]/page.tsx
export default async function RoomPage({
  params,
}: {
  params: { roomId: string };
}) {
  // Server-side checks
  const user = await getCurrentUser();
  const room = await getRoomById(params.roomId);

  // Verify room access
  if (!room || !(await canAccessRoom(user, room))) {
    notFound();
  }

  // Add participant tracking
  await trackRoomVisit(user.id, params.roomId);

  return (
    <RoomProvider roomId={params.roomId}>
      <Canvas roomId={params.roomId} />
    </RoomProvider>
  );
}
```

## Authentication & Authorization

Server-side checks ensure only authorized users can access rooms:

```typescript
// Helper functions in page.tsx
async function canAccessRoom(user: User, room: Room) {
  // Public rooms: anyone can access
  if (room.isPublic) return true;

  // Private rooms: check if participant
  return await isRoomParticipant(user.id, room.id);
}

async function getCurrentRoomState(roomId: string) {
  // Load initial canvas state
  const state = await getLatestCanvasState(roomId);

  // Load room metadata
  const room = await getRoomById(roomId);

  // Load active participants
  const participants = await getRoomParticipants(roomId);

  return {
    room,
    canvasState: state?.canvasData || null,
    participants,
  };
}
```

## Client-Side Components

### Canvas Component

The main canvas handles all editing operations:

```tsx
// components/canvas/index.tsx
export function Canvas({ roomId }: { roomId: string }) {
  // Room and multiplayer state
  const { isConnected, users, broadcast } = useMultiplayer(roomId);

  // Canvas state management
  const [images, setImages] = useState<CanvasImage[]>([]);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);

  // Real-time event handlers
  const handleCanvasTransform = useCallback((transform: ViewportTransform) => {
    setViewport((prev) => applyTransform(prev, transform));
    broadcast({
      type: "canvas:transform",
      data: transform,
    });
  }, []);

  const handleImageUpdate = useCallback(
    (imageId: string, updates: ImageUpdate) => {
      setImages((prev) => updateImage(prev, imageId, updates));
      broadcast({
        type: "image:transform",
        data: { imageId, updates },
      });
    },
    [],
  );

  // Render canvas with multiplayer overlays
  return (
    <div className="relative w-full h-full">
      <InfiniteCanvas
        images={images}
        viewport={viewport}
        onTransform={handleCanvasTransform}
        onImageUpdate={handleImageUpdate}
      />
      <MultiplayerCursors roomId={roomId} />
      {!isConnected && <ConnectionStatus />}
    </div>
  );
}
```

### Multiplayer Integration

Real-time features are seamlessly integrated:

```tsx
// hooks/use-multiplayer.ts
export function useMultiplayer(roomId: string) {
  const [state, setState] = useState<MultiplayerState>({
    isConnected: false,
    users: new Map(),
    error: null,
  });

  useEffect(() => {
    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
      id: CLERK_USER_ID, // From auth
    });

    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "user:joined":
          setState((prev) => ({
            ...prev,
            users: new Map(prev.users).set(data.userId, data.user),
          }));
          break;

        case "user:cursor":
          setUserCursor(data.userId, data.position);
          break;

        case "canvas:sync":
          // Apply remote canvas changes
          break;
      }
    });

    // Connection lifecycle...
  }, [roomId]);

  return state;
}
```

## Room Features

### 1. Real-Time Collaboration

- Cursor tracking positions synced at 60fps
- Canvas transforms (pan/zoom) synchronized
- Image edits broadcast immediately
- User presence indicators
- Join/leave notifications

### 2. Canvas Operations

```typescript
// Supported operations
interface CanvasEvent {
  type:
    | "canvas:transform" // Viewport changes
    | "image:add" // New image added
    | "image:remove" // Image deleted
    | "image:transform" // Position/scale/rotation
    | "image:layer" // Z-order changes
    | "selection:change" // Multi-selection
    | "group:create" // Create group
    | "group:ungroup"; // Ungroup
}
```

### 3. AI Integration

AI transformations work with multiplayer:

```tsx
// When AI completes generation
const handleAIComplete = (result: AIResult) => {
  // Add to canvas
  addImageToCanvas(result.image);

  // Broadcast to room
  broadcast({
    type: "image:add",
    data: {
      image: result.image,
      generatedBy: result.userId,
      timestamp: Date.now(),
    },
  });

  // Generate notification
  showNotification(`${result.userName} applied ${result.style} style`);
};
```

### 4. Persistence

Room state persists across sessions:

```typescript
// Auto-save with debouncing
useEffect(() => {
  const saveTimeout = setTimeout(async () => {
    await saveCanvasState(roomId, {
      images,
      version: stateVersion,
    });
  }, 5000); // 5 seconds

  return () => clearTimeout(saveTimeout);
}, [images, stateVersion]);
```

## URL Parameters

Room pages support additional parameters:

```
/k/[roomId]?view=readonly         # View-only mode
/k/[roomId]?theme=dark           # Force theme
/k/[roomId]?zoom=fit             # Initial zoom
/k/[roomId]?focus=image-[id]     # Focus on specific image
```

## Error Handling

Room pages handle various error states:

```tsx
// Error boundary for room
export function RoomErrorBoundary({
  children,
  roomId,
}: {
  children: React.ReactNode;
  roomId: string;
}) {
  return (
    <ErrorBoundary
      fallback={({ error, retry }) => (
        <RoomError
          error={error}
          onRetry={retry}
          onLeaveRoom={() => (window.location.href = "/")}
          roomId={roomId}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

## Performance Optimizations

### 1. Lazy Loading

- Canvas images load on demand
- Large images resized before upload
- Component code splitting

### 2. Event Throttling

```typescript
// Throttle canvas events
const throttledBroadcast = useMemo(
  () =>
    throttle((event: CanvasEvent) => {
      socket.send(JSON.stringify(event));
    }, 16), // ~60fps
  [],
);
```

### 3. Memory Management

- Cleanup unused image data
- Limit history states
- Disconnect sockets when hidden

## Mobile Considerations

Room pages are mobile-responsive:

```tsx
// Mobile-specific features
const MobileRoom = () => (
  <div className="flex flex-col h-full">
    <MobileToolbar roomId={roomId} />
    <div className="flex-1 relative">
      <PanZoomableCanvas roomId={roomId} />
      <FloatingToolButton />
    </div>
    <MobileChatDrawer roomId={roomId} />
  </div>
);
```

## SEO and Analytics

Room pages track usage:

```tsx
// page.tsx
export async function generateMetadata({ params }) {
  const room = await getRoomById(params.roomId);

  return {
    title: room ? `${room.name} - Infinite Kanvas` : "Room Not Found",
    description: room?.description || "Collaborative canvas room",
  };
}
```

## Future Enhancements

1. **Room Templates**
   - Save room as template
   - Quick start from templates
   - Template gallery

2. **Advanced Permissions**
   - Viewer/Editor/Admin roles
   - Room locking during critical operations
   - Invite-only rooms

3. **Recording & Playback**
   - Record canvas sessions
   - Playback with timeline
   - Export as video

4. **Advanced Collaboration**
   - Voice chat integration
   - Screen sharing
   - Real-time cursors with names

---

This room structure provides a foundation for unlimited collaborative creativity in Infinite Kanvas, with real-time synchronization, AI-powered features, and persistent storage.
