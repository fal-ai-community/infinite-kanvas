"use client";

import React, { memo, useMemo } from "react";
import { useAtomValue } from "jotai";
import { presenceMapAtom } from "@/atoms/multiplayer";
import { useMultiplayer } from "@/hooks/use-multiplayer";
import type { ViewportState, PresenceData } from "@/types/multiplayer";

interface MultiplayerCursorsProps {
  viewport: ViewportState;
}

const Cursor = memo(
  ({
    x,
    y,
    color,
    name,
  }: {
    x: number;
    y: number;
    color: string;
    name: string;
  }) => {
    return (
      <div
        className="absolute pointer-events-none z-50"
        style={{
          transform: `translate(${x}px, ${y}px)`,
          transition: "transform 0.05s linear",
        }}
      >
        {/* Cursor pointer */}
        <svg
          className="relative"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{ marginLeft: -2, marginTop: -2 }}
        >
          <path
            d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
            fill={color}
            stroke="white"
            strokeWidth="1"
          />
        </svg>

        {/* Name label */}
        <div
          className="absolute left-2 top-5 px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
          style={{
            backgroundColor: color,
            color: "white",
          }}
        >
          {name}
        </div>
      </div>
    );
  },
);

Cursor.displayName = "Cursor";

// Separate component for cursor logic to optimize re-renders
const CursorRenderer = memo(
  ({
    userId,
    presence,
    viewport,
    windowWidth,
    windowHeight,
  }: {
    userId: string;
    presence: PresenceData;
    viewport: ViewportState;
    windowWidth: number;
    windowHeight: number;
  }) => {
    // Memoize screen position calculations
    const { screenX, screenY, isInViewport } = useMemo(() => {
      if (!presence.cursor) {
        return { screenX: 0, screenY: 0, isInViewport: false };
      }

      const x = (presence.cursor.x - viewport.x) * viewport.scale;
      const y = (presence.cursor.y - viewport.y) * viewport.scale;

      const inViewport =
        x >= -50 && x <= windowWidth + 50 && y >= -50 && y <= windowHeight + 50;

      return { screenX: x, screenY: y, isInViewport: inViewport };
    }, [
      presence.cursor?.x,
      presence.cursor?.y,
      viewport.x,
      viewport.y,
      viewport.scale,
      windowWidth,
      windowHeight,
    ]);

    if (!isInViewport || !presence.cursor) {
      return null;
    }

    return (
      <Cursor
        x={screenX}
        y={screenY}
        color={presence.color}
        name={presence.name || "Anonymous"}
      />
    );
  },
);

CursorRenderer.displayName = "CursorRenderer";

export const MultiplayerCursors: React.FC<MultiplayerCursorsProps> = memo(
  ({ viewport }) => {
    const presenceMap = useAtomValue(presenceMapAtom);
    const { syncAdapter } = useMultiplayer();
    const myUserId = syncAdapter?.getConnectionId();

    // Memoize window dimensions to avoid re-renders on every frame
    const windowDimensions = useMemo(
      () => ({
        width: typeof window !== "undefined" ? window.innerWidth : 1920,
        height: typeof window !== "undefined" ? window.innerHeight : 1080,
      }),
      [], // Only calculate once on mount
    );

    // Memoize the cursor entries to avoid re-creating array on every render
    const cursorEntries = useMemo(
      () =>
        Array.from(presenceMap.entries()).filter(
          ([userId]) => userId !== myUserId,
        ),
      [presenceMap, myUserId],
    );

    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {cursorEntries.map(([userId, presence]) => (
          <CursorRenderer
            key={userId}
            userId={userId}
            presence={presence}
            viewport={viewport}
            windowWidth={windowDimensions.width}
            windowHeight={windowDimensions.height}
          />
        ))}
      </div>
    );
  },
);

MultiplayerCursors.displayName = "MultiplayerCursors";
