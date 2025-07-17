import React from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import Link from "next/link";
import { LogoIcon } from "@/components/icons/logo";
import type { PlacedImage } from "@/types/canvas";

interface ZoomControlsProps {
  viewport: {
    x: number;
    y: number;
    scale: number;
  };
  setViewport: (viewport: { x: number; y: number; scale: number }) => void;
  canvasSize: {
    width: number;
    height: number;
  };
  images: PlacedImage[];
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  viewport,
  setViewport,
  canvasSize,
  images,
}) => {
  const handleZoomIn = () => {
    const newScale = Math.min(5, viewport.scale * 1.2);
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;

    // Zoom towards center
    const mousePointTo = {
      x: (centerX - viewport.x) / viewport.scale,
      y: (centerY - viewport.y) / viewport.scale,
    };

    setViewport({
      x: centerX - mousePointTo.x * newScale,
      y: centerY - mousePointTo.y * newScale,
      scale: newScale,
    });
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.1, viewport.scale / 1.2);
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;

    // Zoom towards center
    const mousePointTo = {
      x: (centerX - viewport.x) / viewport.scale,
      y: (centerY - viewport.y) / viewport.scale,
    };

    setViewport({
      x: centerX - mousePointTo.x * newScale,
      y: centerY - mousePointTo.y * newScale,
      scale: newScale,
    });
  };

  const handleResetView = () => {
    if (images.length === 0) {
      // If no images, reset to default view
      setViewport({ x: 0, y: 0, scale: 1 });
      return;
    }

    // Calculate bounds of all images
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
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate scale to fit content with padding (zoom to fit everything in view)
    const padding = 100;
    const scaleX = (canvasSize.width - padding * 2) / contentWidth;
    const scaleY = (canvasSize.height - padding * 2) / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 2); // Max 200% zoom

    // Center content on screen with proper zoom
    setViewport({
      x: canvasSize.width / 2 - centerX * newScale,
      y: canvasSize.height / 2 - centerY * newScale,
      scale: Math.max(0.1, Math.min(5, newScale)),
    });
  };

  return (
    <div className="absolute bottom-4 right-4 hidden md:flex flex-col items-end gap-2 z-20">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleZoomIn}
        className="w-10 h-10 p-0"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleZoomOut}
        className="w-10 h-10 p-0"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleResetView}
        className="w-10 h-10 p-0"
        title="Reset view"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
      <div className="border text-xs text-muted-foreground text-center bg-background/80 px-2 py-1 rounded">
        {Math.round(viewport.scale * 100)}%
      </div>
      <div className="border bg-background/80 p-2 flex flex-row rounded gap-2 items-center">
        <Link href="https://fal.ai" target="_blank">
          <LogoIcon className="w-10 h-10" />
        </Link>
        <div className="text-center text-xs">
          Powered by <br />
          <Link href="https://fal.ai" target="_blank">
            <span className="font-bold text-xl">Fal</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
