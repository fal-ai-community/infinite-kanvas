# Authentication Flow Guide

This document covers the authentication implementation using Clerk with Clerk Elements in the Infinite Kanvas application.

## Authentication Flow Overview

```
Unauthenticated User
         ↓
    /sign-in or /sign-up
         ↓
    Clerk Elements UI
         ↓
  Social/Email Auth
         ↓
      Clerk JWT
         ↓
   Middleware Check
         ↓
    Authenticated Area
         ↓
  Main App (/k/[roomId])
```

## Unauthenticated Routes

### Sign-In Page (`/sign-in`)

Located at `src/app/(unauthenticated)/sign-in/[[...sign-in]]/page.tsx`

Features:

- Multiple authentication methods
- Redirect to app after successful sign-in
- Social OAuth providers (Google, GitHub, etc.)
- Email/password fallback
- Magic link support

```tsx
// Page implementation
import { SignIn } from "@clerk/elements";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
            card: "shadow-lg",
          },
        }}
      />
    </div>
  );
}
```

### Sign-Up Page (`/sign-up`)

Similar structure to sign-in but for new user registration:

- Account creation flow
- Email verification if required
- Redirect to onboarding/main app

## Middleware Protection

The middleware (`src/middleware.ts`) handles route protection:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes that don't require auth
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/share/(.*)", // Shared public links
  "/(.*)\\.png", // Public assets
  "/(.*)\\.jpg",
  "/favicon.ico",
]);

export default clerkMiddleware((auth, req) => {
  // Protect all non-public routes
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

## Authenticated Routes

### Route Group Structure

Authenticated routes are wrapped in `(authenticated)` group:

- Layout includes navigation, user menu, auth state
- All routes automatically protected by middleware
- User context available throughout

### Main App Layout (`src/app/(authenticated)/layout.tsx`)

```tsx
import { UserButton } from "@clerk/nextjs";
import { CurrentUserProvider } from "@/components/current-user-provider";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex items-center justify-between h-16">
          <Logo />
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-8 h-8",
                },
              }}
            />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <CurrentUserProvider>{children}</CurrentUserProvider>
      </main>
    </div>
  );
}
```

## Clerk Elements Integration

### Component Usage

Clerk Elements provides pre-built React components:

```tsx
// User Profile Button
<UserButton>
  <UserButton.MenuItems>
    <UserButton.Link label="Settings" href="/settings" />
    <UserButton.Action label="Sign out" onClick={handleSignOut} />
  </UserButton.MenuItems>
</UserButton>

// Sign In/Up components
<SignIn redirectUrl="/k/new" />
<SignUp redirectUrl="/k/new" afterSignUpUrl="/k/new" />
```

### Customizing Appearance

All Clerk Elements components support theme customization:

```tsx
<SignIn
  appearance={{
    variables: {
      colorPrimary: "#3b82f6",
      colorBackground: "#ffffff",
    },
    elements: {
      card: "shadow-xl rounded-2xl",
      formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm",
      socialButtonsBlockButton: "border-gray-200 hover:bg-gray-50",
      dividerLine: "bg-gray-200",
      dividerText: "text-gray-500",
    },
  }}
/>
```

## Server-Side Authentication

### Server Components

Access auth data in Server Components:

```tsx
// app/page.tsx
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch user data
  const user = await getUserByClerkId(userId);

  return <HomePage user={user} />;
}
```

### API Routes

Secure API endpoints with Clerk:

```tsx
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/api/root";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
  });

export { handler as GET, handler as POST };
```

## User Data Management

### Clerk Webhook for User Sync

When users sign up, sync data to your database:

```typescript
// app/api/clerk/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const payload = await req.json();
  const headersList = headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

  try {
    const evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as any;

    if (evt.type === "user.created") {
      await syncUserToDatabase(evt.data);
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

async function syncUserToDatabase(clerkUser: any) {
  await db.insert(users).values({
    id: clerkUser.id,
    email: clerkUser.email_addresses[0].email_address,
    name: clerkUser.first_name
      ? `${clerkUser.first_name} ${clerkUser.last_name || ""}`.trim()
      : clerkUser.username,
    avatar_url: clerkUser.image_url,
  });
}
```

## Client-Side Hooks

### Using Clerk Hooks in Components

```tsx
// components/user-avatar.tsx
import { useUser, useClerk } from "@clerk/nextjs";

export function UserAvatar() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) return <div className="w-8 h-8 bg-gray-200 rounded-full" />;

  return (
    <div className="flex items-center gap-2">
      <img
        src={user?.imageUrl}
        alt={user?.fullName || "User"}
        className="w-8 h-8 rounded-full"
      />
      <span className="text-sm">{user?.fullName}</span>
      <button
        onClick={() => signOut(() => (window.location.href = "/sign-in"))}
        className="text-xs text-gray-500 hover:text-gray-700"
      >
        Sign out
      </button>
    </div>
  );
}
```

### Protected Component Wrapper

```tsx
// components/require-auth.tsx
import { useAuth } from "@clerk/nextjs";

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return fallback || <Redirect to="/sign-in" />;
  }

  return <>{children}</>;
}
```

## Environment Configuration

```env
# Required Clerk variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxx

# Optional - webhook for user sync
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Optional - customization
CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_UP_URL=/sign-up
CLERK_AFTER_SIGN_IN_URL=/k/new
CLERK_AFTER_SIGN_UP_URL=/k/new
CLERK_SIGN_IN_FORCE_REDIRECT_URL=/k/new
CLERK_SIGN_UP_FORCE_REDIRECT_URL=/k/new

# Session settings
CLERK_SESSION_MAX_INACTIVITY_SECONDS=1800  // 30 minutes
CLERK_SESSION_MAX_LIFETIME_SECONDS=2592000  // 30 days
```

## Error Handling

### Common Authentication Errors

```tsx
// components/auth-error-boundary.tsx
import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";

export function AuthErrorHandler() {
  const clerk = useClerk();

  useEffect(() => {
    const handleUnauthorized = () => {
      clerk.signOut(() => {
        window.location.href = "/sign-in?reason=session_expired";
      });
    };

    window.addEventListener("clerk:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("clerk:unauthorized", handleUnauthorized);
    };
  }, [clerk]);

  return null;
}
```

### Custom Error Pages

```tsx
// app/(unauthenticated)/sign-in/error/page.tsx
export default function SignInErrorPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const error = searchParams.error as string;

  let errorMessage = "An error occurred during sign in.";

  switch (error) {
    case "session_expired":
      errorMessage = "Your session has expired. Please sign in again.";
      break;
    case "oauth_signin":
      errorMessage = "Error signing in with OAuth provider.";
      break;
    case "access_denied":
      errorMessage = "Access denied. Please check your permissions.";
      break;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Sign In Error</h1>
      <p className="text-gray-600 mb-4">{errorMessage}</p>
      <Link href="/sign-in" className="text-blue-600 hover:underline">
        Try Again
      </Link>
    </div>
  );
}
```

## Security Considerations

1. **JWT Validation**: All Clerk tokens validated server-side
2. **Session Management**: Automatic token refresh and expiry
3. **CORS**: Properly configured for Clerk domains
4. **HTTPS Required**: In production environments
5. **Token Storage**: Secure cookies with SameSite and HttpOnly flags

## Debugging Authentication

### Debug Mode

Enable debug logging during development:

```env
NEXT_PUBLIC_DEBUG_CLERK=true
```

### Common Debug Commands

```bash
# Check Clerk configuration
npx clerk env ls

# Test webhook endpoints
npx clerk webhook testing

# View active sessions
npx clerk users list
```

## Testing Authentication

### Mocking in Tests

```tsx
// test-setup.tsx
import { ClerkProvider } from "@clerk/nextjs";

const mockUser = {
  id: "test-user-id",
  emailAddress: "test@example.com",
  firstName: "Test",
  lastName: "User",
};

export function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      frontendApi={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      initialOptions={{
        tokenCache: {
          getToken: () => ({ jwt: "test-token" }),
        },
      }}
    >
      <SignedIn>
        <UserContext.Provider value={createTestUser(mockUser)}>
          {children}
        </UserContext.Provider>
      </SignedIn>
    </ClerkProvider>
  );
}
```

---

This authentication flow provides a secure, user-friendly experience with proper protection of routes and seamless integration with the multiplayer features of Infinite Kanvas.
