"use client";

import dynamic from "next/dynamic";

// Dynamically import the canvas to avoid SSR issues
const Canvas = dynamic(() => import("@/components/canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
});

interface ShareCanvasClientProps {
  roomId: string;
}

export default function ShareCanvasClient({ roomId }: ShareCanvasClientProps) {
  return (
    <div className="h-screen w-screen">
      <Canvas roomId={roomId} />
    </div>
  );
}
