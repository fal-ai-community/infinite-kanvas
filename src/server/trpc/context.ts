import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function createContext(req?: NextRequest) {
  const { userId } = await auth();

  return {
    req,
    userId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
