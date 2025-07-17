import React, { useRef, useState } from "react";
import { Target } from "lucide-react";
import type { PlacedImage } from "@/types/canvas";

interface MiniMapProps {
  images: PlacedImage[];
  viewport: {
    x: number;
    y: number;
    scale: number;
  };
  canvasSize: {
    width: number;
    height: number;
  };
  onViewportChange?: (viewport: {
    x: number;
    y: number;
    scale: number;
  }) => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  images,
  viewport,
  canvasSize,
  onViewportChange,
}) => {
  const minimapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Calculate bounds of all content
  let contentMinX = Infinity,
    contentMinY = Infinity;
  let contentMaxX = -Infinity,
    contentMaxY = -Infinity;

  // Only calculate content bounds if there are images
  if (images.length > 0) {
    images.forEach((img) => {
      contentMinX = Math.min(contentMinX, img.x);
      contentMinY = Math.min(contentMinY, img.y);
      contentMaxX = Math.max(contentMaxX, img.x + img.width);
      contentMaxY = Math.max(contentMaxY, img.y + img.height);
    });
  } else {
    // If no images, center around origin
    contentMinX = -500;
    contentMinY = -500;
    contentMaxX = 500;
    contentMaxY = 500;
  }

  // Calculate current viewport bounds in canvas coordinates
  const viewportCanvasX = -viewport.x / viewport.scale;
  const viewportCanvasY = -viewport.y / viewport.scale;
  const viewportCanvasWidth = canvasSize.width / viewport.scale;
  const viewportCanvasHeight = canvasSize.height / viewport.scale;

  // Expand bounds to include both content AND current viewport
  const minX = Math.min(contentMinX, viewportCanvasX);
  const minY = Math.min(contentMinY, viewportCanvasY);
  const maxX = Math.max(contentMaxX, viewportCanvasX + viewportCanvasWidth);
  const maxY = Math.max(contentMaxY, viewportCanvasY + viewportCanvasHeight);

  const totalWidth = maxX - minX;
  const totalHeight = maxY - minY;
  const miniMapWidth = 192; // 48 * 4 (w-48 in tailwind)
  const miniMapHeight = 128; // 32 * 4 (h-32 in tailwind)

  // Calculate distance between viewport and content for enhanced styling
  const viewportCenterX = viewportCanvasX + viewportCanvasWidth / 2;
  const viewportCenterY = viewportCanvasY + viewportCanvasHeight / 2;
  const contentCenterX =
    images.length > 0 ? (contentMinX + contentMaxX) / 2 : 0;
  const contentCenterY =
    images.length > 0 ? (contentMinY + contentMaxY) / 2 : 0;
  const distance = Math.sqrt(
    Math.pow(viewportCenterX - contentCenterX, 2) +
      Math.pow(viewportCenterY - contentCenterY, 2),
  );
  const isFarFromContent = distance > 1000; // Consider "far" if >1000 pixels away

  // Calculate scale to fit total area (content + viewport) in minimap
  const scaleX = miniMapWidth / totalWidth;
  const scaleY = miniMapHeight / totalHeight;
  const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to add padding

  // Center total area in minimap
  const offsetX = (miniMapWidth - totalWidth * scale) / 2;
  const offsetY = (miniMapHeight - totalHeight * scale) / 2;

  // Handle click/drag to move viewport
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onViewportChange || !minimapRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert minimap coordinates to canvas coordinates
    const canvasX =
      ((x - offsetX) / scale + minX) * viewport.scale - canvasSize.width / 2;
    const canvasY =
      ((y - offsetY) / scale + minY) * viewport.scale - canvasSize.height / 2;

    onViewportChange({
      ...viewport,
      x: -canvasX,
      y: -canvasY,
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    handleMinimapClick(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleMinimapClick(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Return to content functionality - pan only, no zoom change
  const handleReturnToContent = () => {
    if (!onViewportChange || images.length === 0) return;

    // Calculate bounds of all images (content area)
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    images.forEach((img) => {
      minX = Math.min(minX, img.x);
      minY = Math.min(minY, img.y);
      maxX = Math.max(maxX, img.x + img.width);
      maxY = Math.max(maxY, img.y + img.height);
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Center content on screen at current zoom level (no zoom change)
    onViewportChange({
      x: canvasSize.width / 2 - centerX * viewport.scale,
      y: canvasSize.height / 2 - centerY * viewport.scale,
      scale: viewport.scale, // Keep current zoom level
    });
  };

  // Add global mouse up listener to handle mouse up outside minimap
  React.useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }
  }, [isDragging]);

  return (
    <div className="absolute top-4 right-2 md:right-4 z-20 bg-background/95 border rounded shadow-sm p-1 md:p-2">
      <div
        ref={minimapRef}
        className="relative w-32 h-24 md:w-48 md:h-32 bg-muted rounded overflow-hidden cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        {/* Render tiny versions of images */}
        {images.map((img) => (
          <div
            key={img.id}
            className="absolute bg-primary/50"
            style={{
              left: `${(img.x - minX) * scale + offsetX}px`,
              top: `${(img.y - minY) * scale + offsetY}px`,
              width: `${img.width * scale}px`,
              height: `${img.height * scale}px`,
            }}
          />
        ))}

        {/* Viewport indicator with enhanced visibility when far from content */}
        <div
          className={`absolute border-2 ${
            isFarFromContent
              ? "border-orange-500 bg-orange-500/20 shadow-lg"
              : "border-blue-500 bg-blue-500/10"
          }`}
          style={{
            left: `${(viewportCanvasX - minX) * scale + offsetX}px`,
            top: `${(viewportCanvasY - minY) * scale + offsetY}px`,
            width: `${viewportCanvasWidth * scale}px`,
            height: `${viewportCanvasHeight * scale}px`,
            borderWidth: isFarFromContent ? "3px" : "2px",
          }}
        />

        {/* Content area indicator when far from content */}
        {isFarFromContent && images.length > 0 && (
          <div
            className="absolute border-2 border-green-500 bg-green-500/10"
            style={{
              left: `${(contentMinX - minX) * scale + offsetX}px`,
              top: `${(contentMinY - minY) * scale + offsetY}px`,
              width: `${(contentMaxX - contentMinX) * scale}px`,
              height: `${(contentMaxY - contentMinY) * scale}px`,
            }}
          />
        )}
      </div>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-muted-foreground">Mini-map</p>
        {images.length > 0 && (
          <button
            onClick={handleReturnToContent}
            className={`p-1 text-xs rounded transition-colors ${
              isFarFromContent
                ? "text-orange-600 hover:text-orange-700 hover:bg-orange-100 bg-orange-50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title={
              isFarFromContent
                ? "You're far from content - click to return"
                : "Return to content"
            }
          >
            <Target className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
};
