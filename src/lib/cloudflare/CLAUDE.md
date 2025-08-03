# Cloudflare Service Integration

Cloudflare service integration utilities for storage, database, and caching operations.

## Overview

This library integrates with three Cloudflare services:

- **D1**: Serverless SQL database for persistent data
- **R2**: Object storage for files and images
- **KV**: Distributed key-value cache

## Configuration

All services are configured through `wrangler.toml` and bound at runtime:

```toml
# D1 Database
[[d1_databases]]
binding = "KANVAS_DB"
database_name = "kanvas-db"

# R2 Object Storage
[[r2_buckets]]
binding = "KANVAS_IMAGES"
bucket_name = "kanvas-images"

# KV Cache
[[kv_namespaces]]
binding = "KANVAS_CACHE"
id = "kanvas-cache-id"
```

## Files

### config.ts

Configuration types and utilities:

- Environment variable management
- Service binding interfaces
- Configuration validation
- Feature flag management

### image-handler.ts

Image upload and management for R2:

- Multipart upload support
- Image optimization
- Signed URL generation
- CORS handling
- Cleanup utilities

## Usage Examples

### D1 Database Operations

```typescript
// Using Drizzle ORM
import { db } from "@/db/client";
import { rooms, users, roomParticipants } from "@/db/schema";

// Query with joins
const roomsWithUsers = await db
  .select({
    room: rooms,
    creator: { id: users.id, name: users.name },
    participantCount: sql<number>`count(${roomParticipants.userId})`,
  })
  .from(rooms)
  .leftJoin(users, eq(rooms.owner_id, users.id))
  .leftJoin(roomParticipants, eq(rooms.id, roomParticipants.room_id))
  .groupBy(rooms.id);
```

### R2 Image Storage

```typescript
// Upload image
import { uploadToR2, generateSignedUrl } from "@/lib/cloudflare/image-handler";

async function handleImageUpload(file: File, userId: string) {
  // Upload to R2
  const { key, url } = await uploadToR2({
    file,
    path: `uploads/${userId}/${Date.now()}-${file.name}`,
    metadata: {
      userId,
      contentType: file.type,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Store reference in database
  await db.insert(assets).values({
    id: ulid(),
    userId,
    r2Key: key,
    sizeBytes: file.size,
    contentType: file.type,
  });

  // Return signed URL for immediate access
  return generateSignedUrl(key, 3600); // 1 hour expiry
}
```

### KV Cache Operations

```typescript
// Room registry cache
import { env } from "cloudflare:workers";

async function updateRoomRegistry(roomId: string, data: RoomData) {
  const cacheKey = `rooms:registry`;
  const existing = await env.KANVAS_CACHE.get(cacheKey);

  const registry = existing ? JSON.parse(existing) : {};
  registry[roomId] = {
    ...data,
    lastUpdated: Date.now(),
  };

  await env.KANVAS_CACHE.put(
    cacheKey,
    JSON.stringify(registry),
    { expirationTtl: 300 }, // 5 minutes
  );
}

// Rate limiting with KV
async function checkRateLimit(userId: string, action: string) {
  const key = `rate_limit:${userId}:${action}:${getHour()}`;
  const current = parseInt((await env.KANVAS_CACHE.get(key)) || "0");

  if (current >= RATE_LIMITS[action]) {
    throw new Error("Rate limit exceeded");
  }

  await env.KANVAS_CACHE.put(key, (current + 1).toString(), {
    expirationTtl: 3600, // 1 hour
  });
}
```

## Error Handling

All services implement consistent error handling:

```typescript
// Service-specific errors
class CloudflareServiceError extends Error {
  constructor(
    message: string,
    public service: "d1" | "r2" | "kv",
    public statusCode?: number,
  ) {
    super(message);
    this.name = "CloudflareServiceError";
  }
}

// Usage
try {
  const result = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
} catch (error) {
  if (error instanceof CloudflareServiceError) {
    logServiceError("d1", error);
    retryOrFallback();
  }
}
```

## Performance Optimization

### D1 Optimizations

- Use appropriate indexes
- Batch operations when possible
- Implement connection pooling
- Cache frequent queries in KV

### R2 Optimizations

- Use multipart uploads for files > 100MB
- Set appropriate cache headers
- Implement content delivery via CDN
- Use presigned URLs for private access

### KV Optimizations

- Use appropriate TTL values
- Batch operations for multiple keys
- Implement cache invalidation strategies
- Monitor cache hit/miss ratios

## Monitoring

Add monitoring hooks for all operations:

```typescript
// Wrapper for monitoring
async function withMonitoring<T>(
  service: "d1" | "r2" | "kv",
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();

  try {
    const result = await fn();

    // Track success metrics
    metrics.increment(`cloudflare.${service}.${operation}.success`, {
      duration: Date.now() - start,
    });

    return result;
  } catch (error) {
    // Track error metrics
    metrics.increment(`cloudflare.${service}.${operation}.error`, {
      error: error.message,
    });

    throw error;
  }
}
```

## Local Development

For local development without Cloudflare:

```typescript
// Fallback implementations
const localFallback = {
  d1: {
    // Use SQLite for development
    client: new Database("./dev.db"),
    query: async (sql) => localD1.exec(sql),
  },
  r2: {
    // Use local filesystem
    put: async (key, content) => {
      await fs.writeFile(`./storage/${key}`, content);
    },
  },
  kv: {
    // Use in-memory cache
    cache: new Map(),
    get: async (key) => localKV.cache.get(key),
    put: async (key, value) => {
      localKV.cache.set(key, value);
    },
  },
};
```

## Security Considerations

1. **Authentication**: All operations authenticated
2. **Authorization**: Check user permissions
3. **Input Validation**: Sanitize all inputs
4. **Rate Limiting**: Prevent abuse
5. **Audit Logging**: Log all significant operations

## Migration Scripts

Database migration utilities:

```typescript
// scripts/migrate.ts
export async function migrateDatabase() {
  // Create tables
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `);

  console.log("Migration completed");
}
```

## Troubleshooting

### Common Issues

**D1 Connection Issues**

- Verify database binding in wrangler.toml
- Check database ID is correct
- Ensure proper permissions

**R2 Upload Failures**

- Verify bucket exists
- Check CORS configuration
- Ensure proper authentication

**KV Cache Issues**

- Verify namespace binding
- Check key length limits
- Monitor TTL behavior

### Debug Commands

```bash
# Check D1 database
wrangler d1 execute kanvas-db --command="SELECT * FROM rooms"

# List R2 objects
wrangler r2 list kanvas-images

# Check KV values
wrangler kv key get KANVAS_CACHE rooms:registry
```
