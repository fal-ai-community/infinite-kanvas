# Storage Setup - R2 & KV Integration

This guide covers the setup and configuration of Cloudflare R2 and KV services for Infinite Kanvas.

## Overview

Infinite Kanvas uses two primary Cloudflare storage services:

- **R2**: Object storage for images and binary files
- **KV**: Distributed key-value store for caching and state

## R2 Setup

### 1. Create R2 Bucket

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create R2 bucket
wrangler r2 bucket create kanvas-images

# Verify bucket creation
wrangler r2 bucket list
```

### 2. Configure Bucket

In `wrangler.toml`:

```toml
# R2 bucket binding
[[r2_buckets]]
binding = "KANVAS_IMAGES"
bucket_name = "kanvas-images"

# Optional: Configure CORS for web access
[[r2_buckets]]
binding = "KANVAS_IMAGES"
bucket_name = "kanvas-images"
cors_rules = [
  { allowed_origins = ["*"], allowed_methods = ["GET", "PUT", "POST"] }
]
```

### 3. Upload Operations

Basic R2 operations:

```typescript
// Upload image to R2
async function uploadToR2(file: File, userId: string) {
  const key = `images/${userId}/${Date.now()}-${file.name}`;

  const object = await env.KANVAS_IMAGES.put(key, file, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000", // 1 year
    },
    customMetadata: {
      userId,
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  return {
    key,
    url: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.dev/${key}`,
    size: object.size,
    etag: object.etag,
  };
}
```

### 4. Advanced Upload Features

#### Multipart Upload for Large Files

```typescript
async function uploadLargeFile(file: File, userId: string) {
  const chunkSize = 100 * 1024 * 1024; // 100MB chunks
  const uploadId = await env.KANVAS_IMAGES.createMultipartUpload(key, {
    httpMetadata: { contentType: file.type },
  });

  const parts = [];
  for (let i = 0; i < file.size; i += chunkSize) {
    const chunk = file.slice(i, i + chunkSize);
    const partNumber = Math.floor(i / chunkSize) + 1;

    const upload = await env.KANVAS_IMAGES.uploadPart(
      key,
      uploadId,
      partNumber,
      chunk,
    );

    parts.push({ partNumber, etag: upload.etag });
  }

  return await env.KANVAS_IMAGES.completeMultipartUpload(key, uploadId, parts);
}
```

#### Generate Signed URLs

```typescript
// Private access with signed URLs
async function getSignedUrl(key: string, expiresIn = 3600) {
  const signed = await env.KANVAS_IMAGES.sign(key, {
    expiresIn: expiresIn * 1000, // Convert to milliseconds
  });

  return signed.url;
}

// Usage in client components
const imageUrl = await getSignedUrl(image.key, 3600); // 1 hour expiry
```

### 5. List and Delete Operations

```typescript
// List user's images
async function listUserImages(userId: string, prefix?: string) {
  const prefix = prefix || `images/${userId}/`;
  const objects = await env.KANVAS_IMAGES.list({
    prefix,
    limit: 1000,
  });

  return objects.objects.filter((obj) => !obj.key.endsWith("/"));
}

// Delete image
async function deleteImage(key: string) {
  await env.KANVAS_IMAGES.delete(key);
}
```

## KV Setup

### 1. Create KV Namespace

```bash
# Create KV namespace
wrangler kv namespace create KANVAS_CACHE --preview=false

# Note the returned namespace ID
# Add to wrangler.toml
```

### 2. Configure KV

In `wrangler.toml`:

```toml
# KV namespace binding
[[kv_namespaces]]
binding = "KANVAS_CACHE"
id = "ee2d9571c831496e912c66126eb38782"  # Your namespace ID
```

### 3. KV Operations

#### Basic Operations

```typescript
// Set key with TTL
await env.KANVAS_CACHE.put(
  `user:${userId}:session`,
  JSON.stringify(sessionData),
  { expirationTtl: 3600 }, // 1 hour TTL
);

// Get value
const sessionData = await env.KANVAS_CACHE.get(
  `user:${userId}:session`,
  { type: "json" }, // Automatically parse JSON
);

// Delete key
await env.KANVAS_CACHE.delete(`user:${userId}:session`);
```

#### Room Registry Implementation

```typescript
// Room discovery cache
interface RoomRegistry {
  [roomId: string]: {
    name: string;
    participantCount: number;
    isPublic: boolean;
    lastUpdated: number;
  };
}

async function updateRoomRegistry(roomId: string, data: RoomData) {
  const registryKey = "rooms:registry";

  // Get current registry
  const current =
    (await env.KANVAS_CACHE.get(registryKey, { type: "json" })) || {};

  // Update room data
  current[roomId] = {
    name: data.name,
    participantCount: data.participantCount,
    isPublic: data.isPublic,
    lastUpdated: Date.now(),
  };

  // Save updated registry with TTL
  await env.KANVAS_CACHE.put(
    registryKey,
    JSON.stringify(current),
    { expirationTtl: 300 }, // 5 minutes
  );
}

async function getPublicRooms(): Promise<RoomRegistry> {
  const registry = await env.KANVAS_CACHE.get("rooms:registry", {
    type: "json",
  });
  return registry || {};
}
```

#### Rate Limiting Pattern

```typescript
// Rate limiting with KV
import { createServerClient } from "@supabase/ssr";

class RateLimiter {
  constructor(private kv: any) {}

  async checkRateLimit(
    userId: string,
    action: string,
    limit: number,
    window: string,
  ) {
    const key = `rate_limit:${userId}:${action}:${this.getWindowKey(window)}`;
    const current = parseInt((await this.kv.get(key)) || "0");

    if (current >= limit) {
      return { allowed: false, remaining: 0 };
    }

    await this.kv.put(key, (current + 1).toString(), {
      expirationTtl: this.parseWindow(window),
    });

    return { allowed: true, remaining: limit - current - 1 };
  }

  private getWindowKey(window: string): string {
    const now = new Date();
    switch (window) {
      case "1m":
        return `${now.getUTCMinutes()}`;
      case "1h":
        return `${now.getUTCHours()}`;
      case "1d":
        return `${now.getUTCDate()}`;
      default:
        return window;
    }
  }

  private parseWindow(window: string): number {
    const units = { m: 60, h: 3600, d: 86400 };
    const value = parseInt(window);
    const unit = window.slice(-1);
    return value * (units[unit as keyof typeof units] || 1);
  }
}

// Usage
const limiter = new RateLimiter(env.KANVAS_CACHE);
const { allowed, remaining } = await limiter.checkRateLimit(
  userId,
  "ai_generate",
  10,
  "1m",
);

if (!allowed) {
  throw new Error("Rate limit exceeded. Try again later.");
}
```

## Storage Configuration

### Environment Variables

```env
# .env.local

# Cloudflare credentials
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# Optional: Override wrangler.toml bindings
KANVAS_IMAGES_BUCKET_NAME=kanvas-images
KANVAS_CACHE_NAMESPACE_ID=your_namespace_id

# R2 custom domain (optional)
R2_CUSTOM_DOMAIN=assets.yourdomain.com
```

### Local Development Setup

For local development without Cloudflare:

```typescript
// lib/storage/local.ts
export const localStorage = {
  // Simulate R2 with filesystem
  r2: {
    put: async (key: string, value: any, options?: any) => {
      const path = `./storage/r2/${key}`;
      await fs.ensureDir(path.dirname(path));
      await fs.writeFile(path, Buffer.from(value));

      return { size: value.length };
    },

    get: async (key: string) => {
      const path = `./storage/r2/${key}`;
      if (await fs.pathExists(path)) {
        return fs.readFile(path);
      }
      return null;
    },
  },

  // Simulate KV with in-memory Map
  kv: {
    data: new Map(),

    put: async (
      key: string,
      value: string,
      options?: { expirationTtl?: number },
    ) => {
      this.data.set(key, value);

      if (options?.expirationTtl) {
        setTimeout(() => this.data.delete(key), options.expirationTtl * 1000);
      }
    },

    get: async (key: string, options?: { type?: "text" | "json" }) => {
      const value = this.data.get(key);

      if (!value) return null;

      if (options?.type === "json") {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }

      return value;
    },
  },
};
```

## Storage Patterns

### 1. File Organization

```
R2 Bucket Structure:
├── images/
│   ├── {userId}/
│   │   ├── originals/
│   │   ├── processed/
│   │   └── thumbnails/
│   └── shared/
│       └── public/
├── videos/
│   └── {userId}/
├── exports/
│   └── {roomId}/
└── backups/
    ├── daily/
    └── weekly/
```

### 2. Key Naming Conventions

```typescript
// KV Keys Pattern
const KEYS = {
  // User data
  userSession: (userId: string) => `user:${userId}:session`,
  userPreferences: (userId: string) => `user:${userId}:preferences`,

  // Room data
  roomState: (roomId: string) => `room:${roomId}:state`,
  roomParticipants: (roomId: string) => `room:${roomId}:participants`,
  roomRegistry: () => "rooms:registry",

  // Rate limiting
  rateLimit: (userId: string, action: string, window: string) =>
    `rate_limit:${userId}:${action}:${window}`,

  // Cache invalidation
  cacheInvalidation: (type: string, id: string) =>
    `cache:invalidation:${type}:${id}`,

  // Presence
  userPresence: (userId: string) => `presence:${userId}`,
  cursorPosition: (userId: string, roomId: string) =>
    `cursor:${roomId}:${userId}`,
};
```

### 3. Storage Abstraction Layer

```typescript
// lib/storage/index.ts
export interface StorageService {
  // R2 operations
  upload(file: File, options?: UploadOptions): Promise<UploadResult>;
  download(key: string): Promise<ArrayBuffer>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<ListResult>;

  // KV operations
  get(key: string, options?: GetOptions): Promise<any>;
  put(key: string, value: string, options?: PutOptions): Promise<void>;
  delete(key: string): Promise<void>;

  // Utility methods
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

// Cloudflare implementation
export class CloudflareStorage implements StorageService {
  constructor(
    private r2: R2Bucket,
    private kv: KVNamespace,
  ) {}

  // ... implementation ...
}

// Local development implementation
export class LocalStorage implements StorageService {
  constructor(private basePath: string = "./storage") {}

  // ... implementation ...
}
```

## Monitoring and Analytics

### Storage Metrics

```typescript
// Track storage operations
class StorageMonitor {
  static trackR2Operation(operation: string, size?: number) {
    metrics.increment("storage.r2.operations", {
      operation,
      size: size ? Math.floor(size / 1024) : undefined,
    });
  }

  static trackKVOperation(operation: string, hit: boolean) {
    metrics.increment("storage.kv.operations", {
      operation,
      hit,
    });
  }
}

// Usage in storage layer
await env.KANVAS_IMAGES.put(key, data);
StorageMonitor.trackR2Operation("upload", data.byteLength);

const cached = await env.KANVAS_CACHE.get(key);
StorageMonitor.trackKVOperation("get", !!cached);
```

## Cleanup and Maintenance

### 1. Automated Cleanup Jobs

```typescript
// scripts/cleanup-old-files.ts
export async function cleanupOldFiles() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

  const objects = await env.KANVAS_IMAGES.list({
    prefix: "images/",
  });

  for (const obj of objects.objects) {
    if (new Date(obj.uploaded) < cutoff) {
      await env.KANVAS_IMAGES.delete(obj.key);
    }
  }
}
```

### 2. Storage Quotas

```typescript
// Check user storage usage
async function getUserStorageUsage(userId: string) {
  const objects = await env.KANVAS_IMAGES.list({
    prefix: `images/${userId}/`,
  });

  const totalSize = objects.objects.reduce((sum, obj) => sum + obj.size, 0);
  const count = objects.objects.length;

  return { totalSize, count, quota: 1024 * 1024 * 1024 }; // 1GB quota
}
```

## Security Considerations

### 1. Access Control

- Always validate user permissions before R2 operations
- Use signed URLs for private content
- Set appropriate CORS policies

### 2. Data Validation

```typescript
// Validate file types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function validateFileType(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed`);
  }
}

// Sanitize file names
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}
```

### 3. Encryption Sensitive Data

```typescript
// Encrypt sensitive metadata before storing
async function encryptMetadata(data: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  const secretBuffer = encoder.encode(secret);

  const key = await crypto.subtle.importKey(
    "raw",
    secretBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, dataBuffer);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
```

---

This storage setup provides a scalable, performant foundation for storing user content and caching data across Infinite Kanvas.
