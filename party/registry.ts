import type * as Party from "partykit/server";

export interface RoomInfo {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: number;
  lastActivity: number;
  userCount: number;
  creatorName?: string;
}

export default class RoomRegistry implements Party.Server {
  rooms = new Map<string, RoomInfo>();
  cleanupInterval: NodeJS.Timeout | null = null;

  constructor(readonly party: Party.Party) {}

  onStart() {
    // Start cleanup interval - run every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveRooms();
    }, 5 * 60 * 1000);
  }

  onClose() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  onConnect(conn: Party.Connection) {
    // Send current active rooms to new connection
    const publicRooms = Array.from(this.rooms.values()).filter(room => room.isPublic);
    conn.send(JSON.stringify({
      type: 'rooms',
      rooms: publicRooms
    }));
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'room-created':
          this.handleRoomCreated(data, sender);
          break;
        case 'room-update':
          this.handleRoomUpdate(data);
          break;
        case 'room-cleanup':
          this.handleRoomCleanup(data);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  handleRoomCreated(data: any, sender: Party.Connection) {
    const roomInfo: RoomInfo = {
      id: data.roomId,
      name: data.name || `Room ${data.roomId.slice(0, 6)}`,
      isPublic: data.isPublic,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      userCount: 1,
      creatorName: data.creatorName
    };

    this.rooms.set(data.roomId, roomInfo);

    // Broadcast to all connected clients if public
    if (data.isPublic) {
      this.party.broadcast(JSON.stringify({
        type: 'room-added',
        room: roomInfo
      }));
    }
  }

  handleRoomUpdate(data: any) {
    const room = this.rooms.get(data.roomId);
    if (room) {
      room.userCount = data.userCount;
      room.lastActivity = Date.now();

      // Broadcast update if public room
      if (room.isPublic) {
        this.party.broadcast(JSON.stringify({
          type: 'room-updated',
          roomId: data.roomId,
          updates: {
            userCount: data.userCount,
            lastActivity: room.lastActivity
          }
        }));
      }
    }
  }

  handleRoomCleanup(data: any) {
    const room = this.rooms.get(data.roomId);
    if (room) {
      this.rooms.delete(data.roomId);
      
      // Broadcast removal if public room
      if (room.isPublic) {
        this.party.broadcast(JSON.stringify({
          type: 'room-removed',
          roomId: data.roomId
        }));
      }
    }
  }

  cleanupInactiveRooms() {
    const now = Date.now();
    const INACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutes
    const PRIVATE_INACTIVE_THRESHOLD = 10 * 60 * 1000; // 10 minutes for private rooms

    for (const [id, room] of this.rooms) {
      const threshold = room.isPublic ? INACTIVE_THRESHOLD : PRIVATE_INACTIVE_THRESHOLD;
      
      if (now - room.lastActivity > threshold && room.userCount === 0) {
        this.rooms.delete(id);
        
        // Broadcast removal if public room
        if (room.isPublic) {
          this.party.broadcast(JSON.stringify({
            type: 'room-removed',
            roomId: id
          }));
        }
      }
    }
  }
}