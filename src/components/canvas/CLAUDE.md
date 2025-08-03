# Canvas Components

This directory contains all React Konva-based canvas components for the Infinite Kanvas editor.

## Main Component

### Canvas (/index.tsx)

The primary canvas component that orchestrates all functionality:

- Stage and layer management
- Drag & drop handling
- Image manipulation
- AI transformation flows
- Undo/redo history
- Multiplayer integration
- Auto-save functionality

## Canvas Features

### Interaction Components

- `CanvasContextMenu.tsx` - Right-click context menu for images
- `CanvasGrid.tsx` - Background grid with snapping
- `SelectionBox.tsx` - Multi-selection rectangle
- `DimensionDisplay.tsx` - Shows image dimensions on hover
- `ZoomControls.tsx` - Zoom in/out and fit to screen

### Image Components

- `CanvasImage.tsx` - Individual image element with transforms
- `CanvasVideo.tsx` - Video element with playback controls
- `StreamingImage.tsx` - Real-time AI image generation display
- `StreamingVideo.tsx` - Real-time AI video generation display

### UI Components

- `MobileToolbar.tsx` - Mobile-optimized tool palette
- `MiniMap.tsx` - Overview of entire canvas viewport
- `ShortcutBadge.tsx` - Keyboard shortcut indicators

### Video Processing

- `VideoControls.tsx` - Playback controls for video elements
- `VideoModelComponents.tsx` - AI video model selection UI
- `VideoOverlays.tsx` - Video-specific overlays and effects
- `ExtendVideoDialog.tsx` - Video length extension
- `ImageToVideoDialog.tsx` - Image to video conversion
- `VideoToVideoDialog.tsx` - Video style transfer

### Cropping & Editing

- `CropOverlay.tsx` - Image cropping interface
- `CropOverlayWrapper.tsx` - Wrapper with keyboard shortcuts

## Multiplayer Components

Real-time collaboration UI components:

- `ConnectionStatus.tsx` - Shows WebSocket connection state
- `MultiplayerCursors.tsx` - Renders other users' cursors
- `MultiplayerPanel.tsx` - User list, chat, and presence info

## Integration Points

### State Management

- Uses Jotai atoms for global state
- React Query for server state
- Context providers for canvas state

### Hooks Integration

- `useAutoSave` - Debounced save to IndexedDB/Cloudflare
- `useFalClient` - fal.ai API client management
- `useStreamingImage/Video` - Real-time AI generation

### tRPC API

- Canvas operations via tRPC procedures
- Database persistence
- Multiplayer event broadcasting

## Key Features

### Infinite Canvas

- Pan with drag/mouse wheel
- Zoom with pinch/scroll
- Viewport culling for performance
- Grid snapping and guides

### AI Transformations

- Style transfer with visual feedback
- Background removal preview
- Object isolation with AI
- Real-time streaming results
- Multiple AI models supported

### Data Flow

1. User interacts with canvas
2. Event handlers update state
3. State changes propagate to Konva
4. Multiplayer events sent via adapter
5. Auto-save triggers on significant changes

## Performance

- Viewport culling renders only visible areas
- Image lazy loading with intersection observer
- Debounced event handlers
- Optimized re-renders with React.memo

## Styling

- Tailwind CSS for most styling
- Layer styles for Konva elements
- Responsive design with breakpoints
- Dark/light theme support
