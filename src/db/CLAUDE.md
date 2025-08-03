# Database Layer

Database management using Drizzle ORM with Cloudflare D1. Provides type-safe database operations and schema management.

## Setup

The database is defined using Drizzle ORM with PostgreSQL-like syntax but targets Cloudflare D1 (SQLite).

```typescript
// db/client.ts - Database client initialization
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb(env: any) {
  return drizzle(env.KANVAS_DB, { schema });
}

// In API routes
import { db } from "@/db/client";
```

## Schema

### Tables Defined

```typescript
// db/schema.ts
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(true),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const roomParticipants = pgTable(
  "room_participants",
  {
    roomId: text("room_id").references(() => rooms.id),
    userId: text("user_id").references(() => users.id),
    joinedAt: timestamp("joined_at").defaultNow(),
    joinedBy: text("joined_by").references(() => users.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roomId, table.userId] }),
  }),
);

export const canvasStates = pgTable("canvas_states", {
  id: text("id").primaryKey(),
  roomId: text("room_id").references(() => rooms.id),
  userId: text("user_id").references(() => users.id),
  canvasData: text("canvas_data").notNull(), // JSON string
  version: integer("version").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  roomId: text("room_id").references(() => rooms.id),
  r2Key: text("r2_key").notNull(), // R2 object key
  contentType: text("content_type"),
  sizeBytes: integer("size_bytes"),
  metadata: text("metadata"), // JSON metadata
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Relations

```typescript
export const usersRelations = relations(users, ({ many }) => ({
  ownedRooms: many(rooms),
  participations: many(roomParticipants),
  assets: many(assets),
  canvasStates: many(canvasStates),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  owner: one(users, {
    fields: [rooms.ownerId],
    references: [users.id],
  }),
  participants: many(roomParticipants),
  canvasStates: many(canvasStates),
  assets: many(assets),
}));
```

## Query Examples

### Basic CRUD Operations

```typescript
// Create a room
await db.insert(rooms).values({
  id: generateUUID(),
  name: "My Canvas",
  description: "A collaborative space",
  isPublic: true,
  ownerId: userId,
});

// Read with joins
const roomWithDetails = await db
  .select({
    room: rooms,
    ownerName: users.name,
    participantCount: sql<number>`count(${roomParticipants.userId})`,
  })
  .from(rooms)
  .leftJoin(users, eq(rooms.ownerId, users.id))
  .leftJoin(roomParticipants, eq(rooms.id, roomParticipants.roomId))
  .where(eq(rooms.id, roomId))
  .groupBy(rooms.id);

// Update
await db
  .update(rooms)
  .set({
    name: newName,
    updatedAt: new Date(),
  })
  .where(eq(rooms.id, roomId));

// Delete
await db
  .delete(roomParticipants)
  .where(
    and(
      eq(roomParticipants.roomId, roomId),
      eq(roomParticipants.userId, userId),
    ),
  );
```

### Complex Queries

```typescript
// Room listing with pagination and filters
async function getRooms(
  page: number = 1,
  limit: number = 20,
  filters?: {
    isPublic?: boolean;
    ownerId?: string;
    search?: string;
  },
) {
  const offset = (page - 1) * limit;

  let query = db
    .select({
      id: rooms.id,
      name: rooms.name,
      description: rooms.description,
      ownerName: users.name,
      participantCount: sql<number>`count(${roomParticipants.userId})`,
      createdAt: rooms.createdAt,
    })
    .from(rooms)
    .leftJoin(users, eq(rooms.ownerId, users.id))
    .leftJoin(roomParticipants, eq(rooms.id, roomParticipants.roomId))
    .groupBy(rooms.id, users.name)
    .orderBy(desc(rooms.createdAt))
    .limit(limit)
    .offset(offset);

  // Apply filters
  if (filters?.isPublic !== undefined) {
    query = query.where(eq(rooms.isPublic, filters.isPublic));
  }

  if (filters?.ownerId) {
    query = query.where(eq(rooms.ownerId, filters.ownerId));
  }

  if (filters?.search) {
    query = query.where(
      or(
        ilike(rooms.name, `%${filters.search}%`),
        ilike(rooms.description, `%${filters.search}%`),
      ),
    );
  }

  return query;
}
```

## TypeScript Types

All tables generate TypeScript types:

```typescript
// Generated types from schema
type User = typeof users.$inferSelect;
type NewUser = typeof users.$inferInsert;
type Room = typeof rooms.$inferSelect;
type NewRoom = typeof rooms.$inferInsert;

// Usage in components
interface RoomCardProps {
  room: Room & {
    ownerName: string;
    participantCount: number;
  };
}
```

## Migrations

### Creating Migrations

```bash
# Generate migration file
npx drizzle-kit generate:sqlite

# Run migrations
npx drizzle-kit push:sqlite
```

### Example Migration

```sql
-- drizzle/0000_wicked_brackstone.sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
```

## Performance Tips

### Indexing Strategy

```typescript
// Important indexes for queries
export const indexes = [
  // Users
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)`,

  // Rooms
  `CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms(owner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rooms_public ON rooms(is_public)`,
  `CREATE INDEX IF NOT EXISTS idx_rooms_created ON rooms(created_at)`,

  // Room participants
  `CREATE INDEX IF NOT EXISTS idx_participants_room ON room_participants(room_id)`,
  `CREATE INDEX IF NOT EXISTS idx_participants_user ON room_participants(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_participants_joined ON room_participants(joined_at)`,

  // Canvas states
  `CREATE INDEX IF NOT EXISTS idx_canvas_room ON canvas_states(room_id)`,
  `CREATE INDEX IF NOT EXISTS idx_canvas_user ON canvas_states(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_canvas_updated ON canvas_states(updated_at)`,

  // Assets
  `CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_assets_room ON assets(room_id)`,
  `CREATE INDEX IF NOT EXISTS idx_assets_created ON assets(created_at)`,
];
```

### Query Optimization

```typescript
// Use transactions for multiple operations
await db.transaction(async (tx) => {
  await tx.insert(rooms).values(roomData);
  await tx.insert(roomParticipants).values({
    roomId: roomData.id,
    userId: roomData.ownerId,
    joinedBy: roomData.ownerId,
  });
});

// Batch inserts for better performance
await db.insert(roomParticipants).values(
  participants.map((p) => ({
    roomId: p.roomId,
    userId: p.userId,
    joinedBy: p.joinedBy,
  })),
);

// Use prepared statements for repeated queries
const getRoomById = db
  .select()
  .from(rooms)
  .where(eq(rooms.id, sql.placeholder("id")))
  .prepare();

const room = await getRoomById.execute({ id: roomId });
```

## Integration with tRPC

```typescript
// server/trpc/routers/rooms.ts
import { db } from "@/db/client";
import { rooms, users, roomParticipants } from "@/db/schema";

export const roomsRouter = t.router({
  list: t.procedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const query = getRooms(input.limit);

      if (input.cursor) {
        query = query.where(gt(rooms.createdAt, new Date(input.cursor)));
      }

      return query;
    }),

  create: t.procedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        isPublic: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const room = await db
        .insert(rooms)
        .values({
          id: generateUUID(),
          name: input.name,
          description: input.description,
          isPublic: input.isPublic,
          ownerId: userId,
        })
        .returning();

      // Add creator as participant
      await db.insert(roomParticipants).values({
        roomId: room[0].id,
        userId,
        joinedBy: userId,
      });

      return room[0];
    }),
});
```

## Debugging

### Enable Query Logging

```typescript
// Add this to db/client.ts for development
export function getDb(env: any) {
  const d1 = drizzle(env.KANVAS_DB, {
    schema,
    logger: process.env.NODE_ENV === "development",
  });

  return d1;
}
```

### Common Issues

1. **Foreign Key Constraints**: D1 doesn't enforce foreign keys
2. **Case Sensitivity**: D1 string comparisons are case-insensitive
3. **Transaction Limits**: D1 has limits on transaction size and duration
4. **Connection Pooling**: Not needed with D1 (serverless)

## Backup and Restore

```typescript
// Backup utilities
export async function backupDatabase() {
  const tables = [
    "users",
    "rooms",
    "room_participants",
    "canvas_states",
    "assets",
  ];
  const backup = {};

  for (const table of tables) {
    const result = await db.execute(sql`SELECT * FROM ${sql.raw(table)}`);
    backup[table] = result.rows;
  }

  // Save to R2
  await env.KANVAS_IMAGES.put(
    `backups/${Date.now()}.json`,
    JSON.stringify(backup),
  );
}

export async function restoreDatabase(backupData: any) {
  await db.transaction(async (tx) => {
    for (const [table, rows] of Object.entries(backupData)) {
      await tx.execute(sql`DELETE FROM ${sql.raw(table)}`);

      for (const row of rows as any[]) {
        await tx.insert(sql.raw(table)).values(row);
      }
    }
  });
}
```
