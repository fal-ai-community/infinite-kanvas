import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/share/(.*)", // Public share links
  "/api/trpc(.*)", // tRPC handles its own auth
  "/api/fal(.*)", // FAL proxy endpoints
  "/_next/static(.*)", // Next.js static files
  "/_next/image(.*)", // Next.js optimized images
  "/favicon.ico", // Favicon
  "/manifest.webmanifest", // PWA manifest
  "/offline", // PWA offline page
  "/sw.js", // Service worker
  "/workbox-(.*)", // Workbox files
]);

// Define unauthenticated-only routes (redirect to root if already signed in)
const isUnauthenticatedOnlyRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

// Define API routes for special handling
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export const authMiddleware = clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth();

  // If user is signed in and trying to access unauthenticated-only routes, redirect to root
  if (userId && isUnauthenticatedOnlyRoute(req)) {
    const url = new URL("/", req.url);
    return NextResponse.redirect(url);
  }

  // Allow public routes (accessible by both authenticated and unauthenticated users)
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // For API routes, return 401 instead of redirecting
  if (isApiRoute(req) && !userId) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // For non-public routes, ensure user is authenticated
  if (!userId) {
    return redirectToSignIn();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|css|js|map)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
