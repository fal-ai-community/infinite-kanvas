import React, { useState, useRef } from "react";
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
  setViewport: (viewport: { x: number; y: number; scale: number }) => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  images,
  viewport,
  canvasSize,
  setViewport,
}) => {
  const [isDraggingViewport, setIsDraggingViewport] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const minimapRef = useRef<HTMLDivElement>(null);

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

  const handleMiniMapClick = (e: React.MouseEvent) => {
    if (isDraggingViewport) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const canvasX = (clickX - offsetX) / scale + minX;
    const canvasY = (clickY - offsetY) / scale + minY;

    const newViewportX =
      -(canvasX - canvasSize.width / 2 / viewport.scale) * viewport.scale;
    const newViewportY =
      -(canvasY - canvasSize.height / 2 / viewport.scale) * viewport.scale;

    setViewport({
      x: newViewportX,
      y: newViewportY,
      scale: viewport.scale,
    });
  };

  const handleViewportMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingViewport(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingViewport || !minimapRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const canvasDeltaX = deltaX / scale;
    const canvasDeltaY = deltaY / scale;

    const newViewportX = viewport.x - canvasDeltaX * viewport.scale;
    const newViewportY = viewport.y - canvasDeltaY * viewport.scale;

    setViewport({
      x: newViewportX,
      y: newViewportY,
      scale: viewport.scale,
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDraggingViewport(false);
  };

  React.useEffect(() => {
    if (isDraggingViewport) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!minimapRef.current) return;

        const rect = minimapRef.current.getBoundingClientRect();
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;

        const canvasDeltaX = deltaX / scale;
        const canvasDeltaY = deltaY / scale;

        const newViewportX = viewport.x - canvasDeltaX * viewport.scale;
        const newViewportY = viewport.y - canvasDeltaY * viewport.scale;

        setViewport({
          x: newViewportX,
          y: newViewportY,
          scale: viewport.scale,
        });

        setDragStart({ x: e.clientX, y: e.clientY });
      };

      const handleGlobalMouseUp = () => {
        setIsDraggingViewport(false);
      };

      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [isDraggingViewport, dragStart, viewport, scale, setViewport]);

  return (
    <div className="absolute top-4 right-2 md:right-4 z-20 bg-background/95 border rounded shadow-sm p-1 md:p-2">
      <div
        ref={minimapRef}
        className="relative w-32 h-24 md:w-48 md:h-32 bg-muted rounded overflow-hidden cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={handleMiniMapClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: isDraggingViewport ? "grabbing" : "pointer" }}
      >
        {/* Render tiny versions of images */}
        {images.map((img) => {
          const centerX =
            (img.x - minX) * scale + offsetX + (img.width * scale) / 2;
          const centerY =
            (img.y - minY) * scale + offsetY + (img.height * scale) / 2;

          return (
            <div
              key={img.id}
              className="absolute bg-primary/50"
              style={{
                left: `${(img.x - minX) * scale + offsetX}px`,
                top: `${(img.y - minY) * scale + offsetY}px`,
                width: `${img.width * scale}px`,
                height: `${img.height * scale}px`,
                transform: img.rotation
                  ? `rotate(${img.rotation}deg)`
                  : undefined,
                transformOrigin: "center",
              }}
            />
          );
        })}

        {/* Viewport indicator */}
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10 cursor-grab active:cursor-grabbing hover:bg-blue-500/20 transition-colors"
          style={{
            left: `${(-viewport.x / viewport.scale - minX) * scale + offsetX}px`,
            top: `${(-viewport.y / viewport.scale - minY) * scale + offsetY}px`,
            width: `${(canvasSize.width / viewport.scale) * scale}px`,
            height: `${(canvasSize.height / viewport.scale) * scale}px`,
          }}
          onMouseDown={handleViewportMouseDown}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-center">Mini-map</p>
    </div>
  );
};
