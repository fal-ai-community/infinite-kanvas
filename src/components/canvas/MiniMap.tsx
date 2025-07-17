import React, { useRef, useState } from "react";
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

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const miniMapWidth = 192; // 48 * 4 (w-48 in tailwind)
  const miniMapHeight = 128; // 32 * 4 (h-32 in tailwind)

  // Calculate scale to fit content in minimap
  const scaleX = miniMapWidth / contentWidth;
  const scaleY = miniMapHeight / contentHeight;
  const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to add padding

  // Center content in minimap
  const offsetX = (miniMapWidth - contentWidth * scale) / 2;
  const offsetY = (miniMapHeight - contentHeight * scale) / 2;

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

        {/* Viewport indicator */}
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10"
          style={{
            left: `${(-viewport.x / viewport.scale - minX) * scale + offsetX}px`,
            top: `${(-viewport.y / viewport.scale - minY) * scale + offsetY}px`,
            width: `${(canvasSize.width / viewport.scale) * scale}px`,
            height: `${(canvasSize.height / viewport.scale) * scale}px`,
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-center">Mini-map</p>
    </div>
  );
};
