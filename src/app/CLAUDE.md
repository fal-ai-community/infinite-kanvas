# App Router

This directory contains the Next.js 15 application using the App Router pattern.

## Structure

```
app/
├── (authenticated)/    # Protected routes requiring authentication
│   ├── k/[roomId]/      # Multiplayer room pages
│   └── layout.tsx       # Layout for authenticated users
├── (public)/            # Public routes (no authentication required)
│   └── share/[token]/   # Shared canvas links
└── (unauthenticated)/   # Authentication-only pages
    ├── sign-in/         # Sign in flows
    └── sign-up/         # Sign up flows

├── api/                 # API routes
│   ├── fal/            # fal.ai proxy endpoint
│   └── trpc/           # tRPC server endpoint
├── core-providers.tsx   # App-wide providers
├── globals.css          # Global styles
├── layout.tsx          # Root layout
├── manifest.ts         # PWA manifest
├── not-found.tsx       # 404 page
├── offline/            # Offline fallback page
└── sw.ts              # Service worker registration
```

## Route Groups

### (authenticated)

All routes in this group require authentication via Clerk middleware:

- `k/[roomId]` - Individual room pages with multiplayer canvas
- Layout includes navigation, user menu, and authentication check

### (public)

Routes accessible without authentication:

- `share/[token]` - Shared canvas viewing (read-only access)
- Useful for sharing individual images or canvases

### (unauthenticated)

Routes only accessible when not authenticated:

- `sign-in` - Multiple sign-in methods supported
- `sign-up` - Registration flows
- Redirects to authenticated area after login

## API Routes

### /api/fal

Proxy endpoint for fal.ai API calls:

- Handles large file uploads bypassing Vercel limits
- Implements rate limiting for anonymous users
- Supports both anonymous and authenticated requests

### /api/trpc/[trpc]

tRPC server endpoint:

- Type-safe API procedures
- Handles canvas operations, authentication, multiplayer
- Integrates with Cloudflare services

## Special Pages

### Offline Page

PWA fallback page shown when offline:

- Displays cached content when available
- Offers retry functionality
- Maintains consistent branding

### Service Worker

Implements PWA features:

- Caching static assets
- Offline support
- Push notifications (future)
- Background sync

## Layouts

### Root Layout

- Sets up theme provider
- Includes navigation elements
- Handles app-wide error boundaries
- Includes service worker registration

### Authenticated Layout

- User profile and sign out
- Main navigation (if applicable)
- Authentication state checks

## Middleware

The `middleware.ts` file handles route protection:

- Redirects unauthenticated users from protected routes
- Handles Clerk authentication state
- Implements route-specific logic

## Development Notes

- All routes are server-side rendered by default
- Dynamic imports used for code splitting
- Loading states handled universally
- Error boundaries at all levels
