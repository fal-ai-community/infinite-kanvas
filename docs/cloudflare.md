# Cloudflare Integration Guide

## Overview

Infinite Kanvas leverages multiple Cloudflare services for building a globally distributed, high-performance collaborative canvas application. This integration provides scalable persistence, caching, and image storage capabilities.

## Architecture

### Services Overview

1. **Cloudflare D1**: Primary database for persistent data
2. **Cloudflare R2**: Object storage for images and assets
3. **Cloudflare KV**: Low-latency key-value store for caching
4. **Cloudflare Workers**: Serverless compute for edge operations
5. **PartyKit**: Real-time coordination (deployed on Cloudflare Workers)

### Integration Points

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Next.js     │    │    PartyKit     │    │   Cloudflare    │
│    App Router   │◄───┤   WebSocket     │◄───┤     Services    │
│                 │    │     Server      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│    fal.ai      │◄─────────────┘
                        │   API/Storage   │
                        └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Cloudflare R2  │
                        │   Object Store  │
                        └─────────────────┘
```

## Configuration

### Wrangler Setup

The `wrangler.toml` file configures all Cloudflare resources:

```toml
name = "infinite-kanvas-dev"
compatibility_date = "2024-12-01"

# R2 bucket binding
[[r2_buckets]]
binding = "KANVAS_IMAGES"
bucket_name = "kanvas-images"

# D1 database binding
[[d1_databases]]
binding = "KANVAS_DB"
database_name = "kanvas-db"
database_id = "77bedc55-0190-40f9-ba57-a5fbb84d3dfd"

# KV namespace binding
[[kv_namespaces]]
binding = "KANVAS_CACHE"
id = "ee2d9571c831496e912c66126eb38782"

# Environment variables
[vars]
ENVIRONMENT = "development"
```

### Environment Variables

```env
# Cloudflare Credentials
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# KV Cache (optional, overrides wrangler.toml)
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

## D1 Database Integration

### Schema Design

The database is defined using Drizzle ORM with the following key tables:

```sql
-- Users table (via Clerk integration)
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- Clerk user ID
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms for multiplayer sessions
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,           -- UUID
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  owner_id TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room participants
CREATE TABLE room_participants (
  room_id TEXT REFERENCES rooms(id),
  user_id TEXT REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id)
);

-- Canvas states for persistence
CREATE TABLE canvas_states (
  id TEXT PRIMARY KEY,
  room_id TEXT REFERENCES rooms(id),
  user_id TEXT REFERENCES users(id),
  canvas_data TEXT,              -- JSON representation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assets stored in R2
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  room_id TEXT REFERENCES rooms(id),
  r2_key TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Usage Examples

```typescript
// Query rooms with Drizzle
const rooms = await db
  .select()
  .from(rooms)
  .where(eq(rooms.is_public, true))
  .orderBy(desc(rooms.created_at))
  .limit(50);

// Save canvas state
await db.insert(canvasStates).values({
  id: uuid(),
  room_id: roomId,
  user_id: userId,
  canvas_data: JSON.stringify(canvasState),
});
```

## R2 Object Storage

### Image Storage Strategy

R2 is used for storing user-uploaded images and AI-generated content:

```typescript
// Upload image to R2
async function uploadImage(file: File, userId: string) {
  const key = `images/${userId}/${ulid()}-${file.name}`;
  const r2 = env.KANVAS_IMAGES;

  await r2.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000",
    },
  });

  return {
    key,
    url: `https://account-id.r2.dev/${key}`,
  };
}

// Generate signed URL for private access
function getSignedUrl(key: string, expiresInSeconds = 3600) {
  const r2 = env.KANVAS_IMAGES;
  const signedUrl = await r2.sign(key, {
    expiresIn: expiresInSeconds * 1000,
  });
  return signedUrl;
}
```

### Image Lifecycle

1. Upload to R2 via multipart upload for large files
2. Generate signed URL for browser access
3. Cache frequently accessed images at edge
4. Optional: Configure cleanup policies for unused assets

## KV Cache Layer

### Cache Patterns

```typescript
// Rate limiting
const limiter = new Ratelimit({
  redis: Redis.fromEnv(env.KV_REST_API_URL),
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
});

// Room registry cache
const ROOM_REGISTRY_KEY = "rooms:registry";
await env.KANVAS_CACHE.put(
  ROOM_REGISTRY_KEY,
  JSON.stringify(activeRooms),
  { expirationTtl: 300 }, // 5 minutes TTL
);

// User presence
async function updateUserPresence(userId: string, roomId: string) {
  const key = `presence:${userId}`;
  await env.KANVAS_CACHE.put(
    key,
    JSON.stringify({
      userId,
      roomId,
      lastSeen: Date.now(),
    }),
    { expirationTtl: 60 },
  ); // 1 minute TTL
}
```

### Cache Keys Schema

```
# Rate limiting
rate_limit:{userId}:{action}:{timeWindow}

# Room metadata
rooms:registry                    # List of active public rooms
rooms:{roomId}:participants      # Users in specific room
rooms:{roomId}:stats              # Room usage statistics

# User presence
presence:{userId}                 # Current room and last seen

# Canvas state cache
canvas:{roomId}:latest            # Latest canvas state hash

# Asset metadata
assets:{assetId}:meta             # Asset information
```

## PartyKit Integration

### PartyKit Server

```typescript
// party/index.ts
export default class Party {
  constructor(readonly party: PartyKitServer) {}

  async onConnect(connection: WebSocketConnection) {
    // Authenticate via JWT/Clerk
    const user = await authenticateToken(connection.token);

    if (user) {
      connection.setState({ userId: user.id });

      // Join room party
      const room = await this.party.room.fetch();
      // ... room joining logic
    }
  }

  async onRequest(request: Request) {
    if (request.method === "POST") {
      // Handle WebSocket → HTTP bridge
      const data = await request.json();

      // Update KV cache
      if (data.type === "canvas_update") {
        await this.party.kv.put(`canvas:${this.party.id}:latest`, data.hash, {
          expirationTtl: 300,
        });
      }
    }
  }
}
```

## Performance Optimization

### Edge Caching Strategy

1. **Static Assets**: Serve fonts, images from Cloudflare CDN
2. **API Responses**: Cache room listings, public data
3. **Database**: Write-through cache for frequently accessed data
4. **Real-time**: Local state sync before persistence

### Deployment Tips

```yaml
# github actions - deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Cloudflare
        run: |
          npx wrangler d1 execute kanvas-db --remote --file=drizzle/schema.sql
          npx wrangler r2 bucket create kanvas-images || true
          npx wrangler kv namespace create KANVAS_CACHE || true
          npx wrangler deploy

      - name: Deploy PartyKit
        run: npx partykit deploy
```

## Monitoring & Analytics

### Metrics to Track

- D1 query response times
- R2 upload/download throughput
- KV cache hit/miss ratios
- WebSocket connection counts
- Room creation rates

### Log Aggregation

```typescript
// Log to Cloudflare Workers logpush
console.log({
  level: "info",
  timestamp: Date.now(),
  event: "canvas_update",
  roomId: party.id,
  userId: connection.state.userId,
  dataSize: JSON.stringify(data).length,
});
```

## Security Considerations

1. **Authentication**: Validate Clerk JWT tokens
2. **Authorization**: Check user permissions for room access
3. **DDoS Protection**: Use Cloudflare Security rules
4. **Data Privacy**: Encrypt sensitive data at rest
5. **Rate Limiting**: Implement per-user and per-API rate limits

## Troubleshooting

### Common Issues

**D1 Database Connection Errors**

```bash
# Check D1 binding
wrangler d1 list

# Execute queries manually
wrangler d1 execute kanvas-db --command="SELECT * FROM sqlite_master"
```

**R2 Upload Failures**

```bash
# Verify R2 bucket
wrangler r2 list kanvas-images

# Check CORS configuration
wrangler r2 bucket list kanvas-images --cors-configuration
```

**KV Cache Issues**

```bash
# Check KV namespace
wrangler kv list KANVAS_CACHE --prefix="rooms:"

# Test KV operations
wrangler kv key get KANVAS_CACHE rooms:registry
```

### Performance Debugging

1. Use Cloudflare Analytics for request timing
2. Enable Workers Logs for real-time debugging
3. Monitor KV cache hit ratios
4. Track WebSocket disconnection rates

---

_This integration ensures your Infinite Kanvas deployment is scalable, performant, and ready for global users._
