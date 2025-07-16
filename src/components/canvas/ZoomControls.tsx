import React from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import Link from "next/link";
import { LogoIcon } from "@/components/icons/logo";

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
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  viewport,
  setViewport,
  canvasSize,
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
    setViewport({ x: 0, y: 0, scale: 1 });
  };

  return (
    <div className="absolute bottom-4 right-4 flex-col hidden md:flex items-end gap-2 z-20">
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
