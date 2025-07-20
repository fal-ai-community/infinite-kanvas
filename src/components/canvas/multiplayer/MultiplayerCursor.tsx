"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ViewportState, PresenceData } from "@/lib/sync/types";
import { useMultiplayer } from "@/lib/sync/context";

interface CursorProps {
  position: { x: number; y: number };
  color: string;
  name?: string;
  viewport: ViewportState;
  lastActive?: number;
}

export function Cursor({ position, color, name, viewport, lastActive }: CursorProps) {
  const [interpolatedPosition, setInterpolatedPosition] = useState(position);
  const [isIdle, setIsIdle] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const targetPositionRef = useRef(position);
  const currentPositionRef = useRef(position);

  // Check for idle state (5 seconds)
  useEffect(() => {
    if (!lastActive) return;
    
    const checkIdle = () => {
      const idleTime = Date.now() - lastActive;
      setIsIdle(idleTime > 5000);
    };

    checkIdle();
    const interval = setInterval(checkIdle, 1000);
    return () => clearInterval(interval);
  }, [lastActive]);

  // Smooth interpolation at 60fps
  useEffect(() => {
    targetPositionRef.current = position;

    const interpolate = () => {
      const current = currentPositionRef.current;
      const target = targetPositionRef.current;
      
      // Lerp factor for smooth movement
      const lerpFactor = 0.15;
      
      const newX = current.x + (target.x - current.x) * lerpFactor;
      const newY = current.y + (target.y - current.y) * lerpFactor;
      
      const newPosition = { x: newX, y: newY };
      currentPositionRef.current = newPosition;
      setInterpolatedPosition(newPosition);

      // Continue animation if not at target
      const distance = Math.sqrt(
        Math.pow(target.x - newX, 2) + Math.pow(target.y - newY, 2)
      );
      
      if (distance > 0.1) {
        animationFrameRef.current = requestAnimationFrame(interpolate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(interpolate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [position]);

  // Transform cursor position based on viewport
  const x = (interpolatedPosition.x - viewport.x) * viewport.scale;
  const y = (interpolatedPosition.y - viewport.y) * viewport.scale;

  // Don't render if idle
  if (isIdle) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: 'opacity 200ms',
        opacity: isIdle ? 0 : 1,
      }}
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="relative"
      >
        <path
          d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
          fill={color}
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* Name label */}
      {name && (
        <div
          className="absolute top-5 left-5 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-sm"
          style={{ backgroundColor: color }}
        >
          {name}
        </div>
      )}
    </div>
  );
}

interface MultiplayerCursorsProps {
  viewport: ViewportState;
}

export function MultiplayerCursors({ viewport }: MultiplayerCursorsProps) {
  const { presenceMap } = useMultiplayer();

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {Array.from(presenceMap.values()).map((presence) => {
        if (!presence.cursor) return null;

        return (
          <Cursor
            key={presence.userId}
            position={presence.cursor}
            color={presence.color}
            name={presence.name}
            viewport={viewport}
            lastActive={presence.lastActive}
          />
        );
      })}
    </div>
  );
}
