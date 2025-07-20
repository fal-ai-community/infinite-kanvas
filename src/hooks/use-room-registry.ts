import { useState, useEffect } from "react";
import PartySocket from "partysocket";

export interface Room {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: number;
  lastVisited: number;
  userCount: number;
  creatorName?: string;
}

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";

export function useRoomRegistry() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to the registry party
    const ws = new PartySocket({
      host: PARTYKIT_HOST,
      room: "registry",
      party: "registry",
    });

    ws.addEventListener("open", () => {
      console.log("[Registry] Connected to room registry");
      setIsConnected(true);
    });

    ws.addEventListener("close", () => {
      console.log("[Registry] Disconnected from room registry");
      setIsConnected(false);
    });

    ws.addEventListener("error", (error) => {
      console.error("[Registry] WebSocket error:", error);
    });

    ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[Registry] Received:", data.type);

        switch (data.type) {
          case "rooms":
            // Initial room list
            setRooms(data.rooms.map((room: any) => ({
              ...room,
              lastVisited: room.lastActivity,
            })));
            break;

          case "room-added":
            // New room created
            setRooms((prev) => {
              // Check if room already exists
              if (prev.find(r => r.id === data.room.id)) {
                return prev;
              }
              return [...prev, {
                ...data.room,
                lastVisited: data.room.lastActivity,
              }];
            });
            break;

          case "room-removed":
            // Room was cleaned up
            setRooms((prev) => prev.filter((r) => r.id !== data.roomId));
            break;

          case "room-updated":
            // Room metadata updated (user count, activity)
            setRooms((prev) =>
              prev.map((r) =>
                r.id === data.roomId
                  ? { 
                      ...r, 
                      userCount: data.updates.userCount,
                      lastVisited: data.updates.lastActivity 
                    }
                  : r
              )
            );
            break;
        }
      } catch (error) {
        console.error("[Registry] Error parsing message:", error);
      }
    });

    return () => {
      ws.close();
    };
  }, []);

  const createRoom = async (roomId: string, name: string, isPublic: boolean, creatorName: string) => {
    try {
      // Send room creation notification to registry
      const ws = new PartySocket({
        host: PARTYKIT_HOST,
        room: "registry",
        party: "registry",
      });

      ws.addEventListener("open", () => {
        ws.send(JSON.stringify({
          type: "room-created",
          roomId,
          name,
          isPublic,
          creatorName,
        }));
        
        // Close connection after sending
        setTimeout(() => ws.close(), 100);
      });
    } catch (error) {
      console.error("[Registry] Failed to notify room creation:", error);
    }
  };

  return {
    rooms,
    isConnected,
    createRoom,
  };
}