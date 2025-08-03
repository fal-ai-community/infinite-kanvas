# Authentication Library

Comprehensive authentication solution using Clerk with integration for the Infinite Kanvas application.

## Structure

```
lib/auth/
├── client.ts       # Frontend authentication utilities
├── index.ts        # Main exports and types
├── keys.ts         # Key configuration for Clerk
├── middleware.ts   # Next.js route protection
└── utils.ts        # Authentication helpers
```

## Features

### Clerk Integration

- Complete user authentication flows
- Social logins (Google, GitHub, etc.)
- Passwordless email magic links
- Session management
- Multi-factor authentication support

### Clerk Elements

Modern React components for authentication:

```tsx
import { SignIn } from "@clerk/elements";

function SignInPage() {
  return <SignIn signUpUrl="/sign-up" redirectUrl="/k/new" />;
}
```

## Usage

### Client-side Authentication

```typescript
// Get current user
import { useAuth } from "@clerk/nextjs";

const { userId, isSignedIn } = useAuth();

// Access user data
const user = useUser();
const { username, imageUrl, emailAddress } = user.user;
```

### Server-side Authentication

```typescript
// API routes and Server Components
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch user data
  const user = await getUserByClerkId(userId);
}
```

## Middleware

The middleware protects routes based on authentication status:

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/share/(.*)",
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});
```

### Route Protection Levels

- **Public**: No authentication required (sign-in, sign-up, shared links)
- **Authenticated**: Must be signed in (main app, rooms)
- **Private**: Specific permissions required

## Database Integration

When users sign up, they're automatically synced to the database:

```typescript
// Webhook handler for user creation
export async function handleUserCreated(event: ClerkEvent) {
  const { id, email_addresses, username, image_url } = event.data;

  await db
    .insert(users)
    .values({
      id, // Clerk user ID as primary key
      email: email_addresses[0].email_address,
      username,
      avatar_url: image_url,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        username,
        avatar_url: image_url,
      },
    });
}
```

## Multiplayer Integration

User identity flows through the multiplayer system:

```typescript
// PartyKit authentication
function authenticateToken(token: string) {
  // Verify Clerk JWT token
  const { userId } = verifyToken(token);

  // Fetch user data from database
  const user = await getUserByClerkId(userId);

  return user;
}
```

## Environment Variables

```env
# Clerk configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Optional customization
CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_UP_URL=/sign-up
CLERK_AFTER_SIGN_IN_URL=/k/new
CLERK_AFTER_SIGN_UP_URL=/k/new
```

## Error Handling

Common authentication errors and how to handle them:

```typescript
import { useClerk } from "@clerk/nextjs";

function AuthErrorHandler() {
  const clerk = useClerk();

  useEffect(() => {
    if (error) {
      switch (error.code) {
        case "session_expired":
          clerk.signOut({});
          toast("Session expired. Please sign in again.");
          break;
        case "user_not_found":
          redirect("/sign-up");
          break;
      }
    }
  }, [error]);
}
```

## Security Features

1. **JWT Token Validation**: All session tokens validated server-side
2. **Session Management**: Automatic token refresh
3. **CSRF Protection**: Built-in to Clerk components
4. **HTTPS Required**: In production environments
5. **Secure Cookies**: All authentication cookies secure

## Customization

### Theming

```tsx
// Customize Clerk Elements appearance
<SignIn
  appearance={{
    elements: {
      formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
      card: "shadow-lg",
      rootBox: "w-full max-w-md mx-auto",
    },
  }}
/>
```

### Custom Flows

```typescript
// Custom sign-up flow with additional data
import { useSignUp } from "@clerk/nextjs";

function CustomSignUp() {
  const { isLoaded, setActive, signUp } = useSignUp();

  const handleSubmit = async (e) => {
    const result = await signUp.create({
      emailAddress: email,
      password,
    });

    // Add custom user metadata
    await signUp.update({
      publicMetadata: {
        role: "editor",
        plan: "free",
      },
    });
  };
}
```

## Testing

Mock authentication in tests:

```typescript
// Test setup
import { test as setup } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("/api/auth/test-sign-in");
  await page.waitForURL("/k/new");
});
```

## Migration Notes

- The app transitioned from NextAuth.js → Clerk for better integrations
- Clerk Elements provide ready-made auth UI components
- Database sync uses Clerk webhooks for real-time updates
- All authentication state is centralized through Clerk

## Troubleshooting

1. **Token Issues**: Clear browser cookies/localStorage
2. **CORS Errors**: Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
3. **Webhook Failures**: Check webhook signing secret
4. **Redirect Loops**: Verify middleware configuration
