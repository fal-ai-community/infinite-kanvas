import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { createContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/routers/_app";
import { checkBotId } from "botid/server";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

const protectedHandler = async (req: NextRequest) => {
  // Only check for bots on POST requests (mutations)
  if (req.method === "POST") {
    const verification = await checkBotId();
    if (verification.isBot) {
      return new Response("Access denied", { status: 403 });
    }
  }
  return handler(req);
};

export { handler as GET, protectedHandler as POST };
