import type * as Party from "partykit/server";
import type { PlacedImage } from "../src/types/canvas";

const MAX_CHAT_MESSAGES = 100;

interface CanvasState {
  images: PlacedImage[];
  viewport: { x: number; y: number; scale: number };
}

interface PresenceData {
  userId: string;
  cursor: { x: number; y: number } | null;
  color: string;
  name?: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  color: string;
  text: string;
  timestamp: number;
}

export default class CanvasRoom implements Party.Server {
  options: Party.ServerOptions = {
    hibernate: true, // Enable hibernation to save resources
  };

  private connections = new Map<string, { color: string; name: string }>();

  constructor(readonly room: Party.Room) {
    console.log(`[PartyKit] Room ${room.id} initialized`);
  }

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    try {
      console.log(
        `[PartyKit] New connection: ${connection.id} to room ${this.room.id}`,
      );
      console.log(
        `[PartyKit] Total connections in room: ${this.connections.size}`,
      );

      // Update registry with new user count
      await this.updateRegistry();

      // Send current room state to new connection
      const state = await this.room.storage.get<CanvasState>("canvasState");
      if (state) {
        console.log(`[PartyKit] Sending canvas state to ${connection.id}`);
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
      console.log(
        `[PartyKit] Sending ${chatMessages.length} chat messages to ${connection.id}`,
      );
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
      console.log(
        `[PartyKit] User ${connection.id} joined as "${userName}" with color ${userColor}`,
      );

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
              } as PresenceData,
            }),
          );
        }
      }
      console.log(
        `[PartyKit] Sent ${existingUsers.length} existing users to ${connection.id}`,
      );

      // NOW store the new connection info
      this.connections.set(connection.id, { color: userColor, name: userName });
      
      // Send connection info to the user (including their color)
      connection.send(
        JSON.stringify({
          type: "connection:info",
          data: {
            userId: connection.id,
            color: userColor,
            name: userName,
          },
        }),
      );

      // Broadcast new user joined to others (but not to themselves)
      console.log(
        `[PartyKit] Broadcasting new user ${connection.id} to others`,
      );
      this.room.broadcast(
        JSON.stringify({
          type: "presence:join",
          data: {
            userId: connection.id,
            cursor: null,
            color: userColor,
            name: userName,
          } as PresenceData,
        }),
        [connection.id],
      );

      console.log(
        `[PartyKit] Total connections after: ${this.connections.size}`,
      );
    } catch (error) {
      console.error(`[PartyKit] Error in onConnect:`, error);
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    const event = JSON.parse(message);
    console.log(`[PartyKit] Received ${event.type} from ${sender.id}`);

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
          this.room.broadcast(JSON.stringify({
            type: "cursor:move",
            data: {
              userId: sender.id,
              cursor: event.data.cursor,
              color: cursorUser.color,
              name: cursorUser.name
            }
          }), [sender.id]);
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
        console.log(
          `[PartyKit] Chat message from ${sender.id}: "${event.data?.text}"`,
        );

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
          console.log(
            `[PartyKit] Stored chat message, total messages: ${messages.length}`,
          );

          // Broadcast to all clients
          console.log(`[PartyKit] Broadcasting chat message to all clients`);
          this.room.broadcast(
            JSON.stringify({
              type: "chat:new",
              data: chatMessage,
            }),
          );
        } else {
          console.log(`[PartyKit] Invalid chat message from ${sender.id}:`, {
            userInfo,
            text: event.data?.text,
          });
        }
        break;
    }
  }

  async onClose(connection: Party.Connection) {
    console.log(`[PartyKit] User ${connection.id} disconnected`);

    // Clean up connection info
    this.connections.delete(connection.id);

    // Broadcast user left
    console.log(`[PartyKit] Broadcasting user ${connection.id} left`);
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
      setTimeout(async () => {
        if (this.connections.size === 0) {
          await this.notifyRegistryForCleanup();
        }
      }, 5 * 60 * 1000); // 5 minute grace period
    }
  }

  private async updateStorage(event: any) {
    const state = (await this.room.storage.get<CanvasState>("canvasState")) || {
      images: [],
      viewport: { x: 0, y: 0, scale: 1 },
    };

    switch (event.type) {
      case "image:add":
        state.images.push(event.data);
        break;
      case "image:update":
        const index = state.images.findIndex((img) => img.id === event.data.id);
        if (index !== -1) {
          state.images[index] = event.data;
        }
        break;
      case "image:remove":
        state.images = state.images.filter(
          (img) => img.id !== event.data.imageId,
        );
        break;
    }

    await this.room.storage.put("canvasState", state);
  }

  private async updateRegistry() {
    try {
      // Get room metadata from storage
      const roomInfo = await this.room.storage.get<any>("roomInfo") || {};
      
      // Send update to registry party via WebSocket
      const host = process.env.PARTYKIT_HOST || "localhost:1999";
      const protocol = process.env.NODE_ENV === "production" ? "wss" : "ws";
      const ws = new WebSocket(`${protocol}://${host}/parties/registry/registry`);
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: "room-update",
          roomId: this.room.id,
          userCount: this.connections.size,
          lastActivity: Date.now(),
        }));
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
        ws.send(JSON.stringify({
          type: "room-cleanup",
          roomId: this.room.id,
        }));
        ws.close();
      };
    } catch (error) {
      console.error(`[PartyKit] Failed to notify registry for cleanup:`, error);
    }
  }
}

CanvasRoom satisfies Party.Worker;
