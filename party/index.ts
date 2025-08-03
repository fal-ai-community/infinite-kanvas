import type * as Party from "partykit/server";
import type { PlacedImage } from "../src/types/canvas";
import type {
  ViewportState,
  PresenceData,
  ChatMessage,
} from "../src/types/multiplayer";

const MAX_CHAT_MESSAGES = 100;

interface CanvasState {
  images: PlacedImage[];
  viewport: ViewportState;
}

export default class CanvasRoom implements Party.Server {
  options: Party.ServerOptions = {
    hibernate: true, // Enable hibernation to save resources
  };

  private connections = new Map<
    string,
    {
      color: string;
      name: string;
      email?: string;
      image?: string;
    }
  >();

  constructor(readonly room: Party.Room) {}

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    try {
      // Update registry with new user count
      await this.updateRegistry();

      // Check if room state exists in storage
      let state = await this.room.storage.get<CanvasState>("canvasState");

      // If no state exists, try to load from D1
      if (!state && this.room.id) {
        try {
          // Fetch canvas from D1 database using tRPC endpoint
          const response = await fetch(
            `${this.getApiUrl()}/api/trpc/canvas.get`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                json: { id: this.room.id },
              }),
            },
          );
          if (response.ok) {
            const trpcResponse = await response.json();
            if (trpcResponse.result?.data?.json?.state) {
              state = trpcResponse.result.data.json.state as CanvasState;
              // Store in room storage for future connections
              await this.room.storage.put("canvasState", state);
            }
          }
        } catch (error) {
          console.error(`[PartyKit] Failed to load canvas from D1:`, error);
        }
      }

      // Send current room state to new connection
      if (state) {
        connection.send(
          JSON.stringify({
            type: "sync:full",
            data: state,
          }),
        );
      }

      // Send chat history to new connection
      const chatMessages =
        (await this.room.storage.get<ChatMessage[]>("chatMessages")) || [];
      connection.send(
        JSON.stringify({
          type: "chat:history",
          data: chatMessages,
        }),
      );

      // Generate a color for this user
      const colors = [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#96CEB4",
        "#FECA57",
        "#FF9FF3",
        "#54A0FF",
        "#48DBFB",
      ];
      const userColor = colors[Math.floor(Math.random() * colors.length)];

      // Parse user metadata from query params
      const url = new URL(ctx.request.url);
      const userName =
        url.searchParams.get("name") || `User${connection.id.slice(0, 4)}`;
      const userEmail = url.searchParams.get("email");
      const userImage = url.searchParams.get("image");

      // Send existing users to new connection BEFORE storing new user
      const existingUsers = [];
      for (const [connId, userInfo] of this.connections.entries()) {
        if (connId !== connection.id) {
          existingUsers.push(connId);
          connection.send(
            JSON.stringify({
              type: "presence:join",
              data: {
                userId: connId,
                cursor: null,
                color: userInfo.color,
                name: userInfo.name,
                email: userInfo.email,
                image: userInfo.image,
              } as PresenceData,
            }),
          );
        }
      }

      // NOW store the new connection info
      this.connections.set(connection.id, {
        color: userColor,
        name: userName,
        email: userEmail || undefined,
        image: userImage || undefined,
      });

      // Send connection info to the user (including their color)
      connection.send(
        JSON.stringify({
          type: "connection:info",
          data: {
            userId: connection.id,
            color: userColor,
            name: userName,
            email: userEmail,
            image: userImage,
          },
        }),
      );

      // Broadcast new user joined to others (but not to themselves)
      this.room.broadcast(
        JSON.stringify({
          type: "presence:join",
          data: {
            userId: connection.id,
            cursor: null,
            color: userColor,
            name: userName,
            email: userEmail,
            image: userImage,
          } as PresenceData,
        }),
        [connection.id],
      );
    } catch (error) {
      console.error(`[PartyKit] Error in onConnect:`, error);
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    let event;
    try {
      event = JSON.parse(message);
    } catch (error) {
      console.error(
        `[PartyKit] Failed to parse message from ${sender.id}:`,
        error,
      );
      return;
    }

    if (!event || typeof event.type !== "string") {
      console.error(
        `[PartyKit] Invalid message format from ${sender.id}:`,
        event,
      );
      return;
    }

    switch (event.type) {
      case "image:update":
      case "image:add":
      case "image:remove":
        // Broadcast to all except sender
        this.room.broadcast(message, [sender.id]);
        // Update storage for late joiners
        await this.updateStorage(event);
        break;

      case "cursor:move":
        // High-frequency, don't persist
        // Update the user's cursor position in presence
        const cursorUser = this.connections.get(sender.id);
        if (cursorUser) {
          // Broadcast the full user presence data
          this.room.broadcast(
            JSON.stringify({
              type: "cursor:move",
              data: {
                userId: sender.id,
                cursor: event.data.cursor,
                color: cursorUser.color,
                name: cursorUser.name,
                email: cursorUser.email,
                image: cursorUser.image,
              },
            }),
            [sender.id],
          );
        }
        break;

      case "generation:start":
      case "generation:complete":
        // Broadcast generation status
        this.room.broadcast(message, [sender.id]);
        break;

      case "viewport:change":
        // Optionally sync viewport changes
        this.room.broadcast(message, [sender.id]);
        break;

      case "chat:send":
        // Handle chat message
        const userInfo = this.connections.get(sender.id);

        if (userInfo && event.data?.text) {
          const chatMessage: ChatMessage = {
            id: crypto.randomUUID(),
            userId: sender.id,
            name: userInfo.name,
            color: userInfo.color,
            text: event.data.text,
            timestamp: Date.now(),
          };

          // Store message in chat history
          const messages =
            (await this.room.storage.get<ChatMessage[]>("chatMessages")) || [];
          messages.push(chatMessage);

          // Keep only last MAX_CHAT_MESSAGES to prevent unbounded growth
          if (messages.length > MAX_CHAT_MESSAGES) {
            messages.splice(0, messages.length - MAX_CHAT_MESSAGES);
          }

          await this.room.storage.put("chatMessages", messages);

          // Broadcast to all clients
          this.room.broadcast(
            JSON.stringify({
              type: "chat:new",
              data: chatMessage,
            }),
          );
        } else {
          console.error(`[PartyKit] Invalid chat message from ${sender.id}:`, {
            userInfo,
            text: event.data?.text,
          });
        }
        break;
    }
  }

  async onClose(connection: Party.Connection) {
    // Clean up connection info
    this.connections.delete(connection.id);

    // Broadcast user left
    this.room.broadcast(
      JSON.stringify({
        type: "presence:leave",
        data: { userId: connection.id },
      }),
    );

    // Update registry with new user count
    await this.updateRegistry();

    // If room is empty, schedule cleanup check
    if (this.connections.size === 0) {
      setTimeout(
        async () => {
          if (this.connections.size === 0) {
            await this.notifyRegistryForCleanup();
          }
        },
        5 * 60 * 1000,
      ); // 5 minute grace period
    }
  }

  private async updateStorage(event: {
    type: "image:add" | "image:update" | "image:remove";
    data: PlacedImage | { imageId: string };
  }) {
    const state = (await this.room.storage.get<CanvasState>("canvasState")) || {
      images: [],
      viewport: { x: 0, y: 0, scale: 1 },
    };

    switch (event.type) {
      case "image:add":
        if ("src" in event.data) {
          state.images.push(event.data as PlacedImage);
        }
        break;
      case "image:update":
        if ("src" in event.data) {
          const updateData = event.data as PlacedImage;
          const index = state.images.findIndex(
            (img) => img.id === updateData.id,
          );
          if (index !== -1) {
            state.images[index] = updateData;
          }
        }
        break;
      case "image:remove":
        if ("imageId" in event.data) {
          const removeData = event.data as { imageId: string };
          state.images = state.images.filter(
            (img) => img.id !== removeData.imageId,
          );
        }
        break;
    }

    await this.room.storage.put("canvasState", state);
  }

  private async updateRegistry() {
    try {
      // Get room metadata from storage
      interface RoomInfo {
        name?: string;
        createdAt?: number;
        updatedAt?: number;
      }
      const roomInfo =
        (await this.room.storage.get<RoomInfo>("roomInfo")) || {};

      // Send update to registry party via WebSocket
      const host = process.env.PARTYKIT_HOST || "localhost:1999";
      const protocol = process.env.NODE_ENV === "production" ? "wss" : "ws";
      const ws = new WebSocket(
        `${protocol}://${host}/parties/registry/registry`,
      );

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "room-update",
            roomId: this.room.id,
            userCount: this.connections.size,
            lastActivity: Date.now(),
          }),
        );
        ws.close();
      };
    } catch (error) {
      console.error(`[PartyKit] Failed to update registry:`, error);
    }
  }

  private async notifyRegistryForCleanup() {
    try {
      const host = process.env.PARTYKIT_HOST || "localhost:1999";
      const ws = new WebSocket(`ws://${host}/parties/registry/registry`);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "room-cleanup",
            roomId: this.room.id,
          }),
        );
        ws.close();
      };
    } catch (error) {
      console.error(`[PartyKit] Failed to notify registry for cleanup:`, error);
    }
  }

  private getApiUrl(): string {
    // In production, use the public app URL
    if (process.env.NODE_ENV === "production") {
      return (
        process.env.NEXT_PUBLIC_APP_URL || "https://infinite-kanvas.vercel.app"
      );
    }
    // In development, use localhost
    return "http://localhost:3000";
  }
}

CanvasRoom satisfies Party.Worker;
