"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useMultiplayer } from "@/hooks/use-multiplayer";
import { Loader } from "lucide-react";

// Dynamically import the canvas to avoid SSR issues
const Canvas = dynamic(() => import("@/components/canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <Loader className="h-8 w-8 animate-spin" />
    </div>
  ),
});

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return <Canvas roomId={roomId} />;
}
