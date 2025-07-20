"use client";

import React, { memo } from "react";
import { useAtomValue } from "jotai";
import { presenceMapAtom } from "@/atoms/multiplayer";
import { useMultiplayer } from "@/hooks/use-multiplayer";
import type { ViewportState } from "@/types/multiplayer";

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

export const MultiplayerCursors: React.FC<MultiplayerCursorsProps> = memo(
  ({ viewport }) => {
    const presenceMap = useAtomValue(presenceMapAtom);
    const { syncAdapter } = useMultiplayer();
    const myUserId = syncAdapter?.getConnectionId();

    // Debug logging commented out for production
    // console.log("[MultiplayerCursors] Rendering cursors:", {
    //   presenceMapSize: presenceMap.size,
    //   myUserId,
    //   viewport,
    //   presenceEntries: Array.from(presenceMap.entries()).map(([id, p]) => ({
    //     id,
    //     name: p.name,
    //     cursor: p.cursor
    //   }))
    // });

    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from(presenceMap.entries()).map(([userId, presence]) => {
          // Don't render our own cursor
          if (userId === myUserId || !presence.cursor) {
            // console.log("[MultiplayerCursors] Skipping cursor:", userId, "isMe:", userId === myUserId, "hasCursor:", !!presence.cursor);
            return null;
          }

          // Transform cursor position based on viewport
          const screenX = (presence.cursor.x - viewport.x) * viewport.scale;
          const screenY = (presence.cursor.y - viewport.y) * viewport.scale;

          // console.log("[MultiplayerCursors] Rendering cursor for:", userId, {
          //   canvasPos: presence.cursor,
          //   screenPos: { x: screenX, y: screenY },
          //   viewport
          // });

          // Only render if cursor is in viewport
          const isInViewport =
            screenX >= -50 &&
            screenX <= window.innerWidth + 50 &&
            screenY >= -50 &&
            screenY <= window.innerHeight + 50;

          if (!isInViewport) {
            // console.log("[MultiplayerCursors] Cursor out of viewport:", { screenX, screenY, viewportSize: { width: window.innerWidth, height: window.innerHeight } });
            return null;
          }

          return (
            <Cursor
              key={userId}
              x={screenX}
              y={screenY}
              color={presence.color}
              name={presence.name || "Anonymous"}
            />
          );
        })}
      </div>
    );
  },
);

MultiplayerCursors.displayName = "MultiplayerCursors";
