"use client";

import { useMultiplayer } from "@/hooks/use-multiplayer";
import { Users } from "lucide-react";

export function ActiveUsers() {
  const { isMultiplayer, roomId, presenceMap } = useMultiplayer();
  const userCount = presenceMap.size;

  // Only show in multiplayer mode
  if (!isMultiplayer || userCount === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-none">
      <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{userCount + 1} active</span>
          </div>

          {/* User avatars */}
          <div className="flex -space-x-2">
            {Array.from(presenceMap.values())
              .slice(0, 3)
              .map((presence) => (
                <div
                  key={presence.userId}
                  className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium text-white shadow-sm"
                  style={{ backgroundColor: presence.color }}
                >
                  {presence.name?.[0] ||
                    presence.userId?.slice(0, 1).toUpperCase() ||
                    "?"}
                </div>
              ))}
            {userCount > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                +{userCount - 3}
              </div>
            )}
          </div>
        </div>

        {/* Room ID for sharing */}
        <div className="mt-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Room:{" "}
            <span className="font-mono">
              {roomId?.slice(0, 8) || "Unknown"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
