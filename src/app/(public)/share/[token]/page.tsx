import { trpcServerCaller } from "@/trpc/server";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import ShareCanvasClient from "./client";

interface SharePageProps {
  params: Promise<{
    token: string;
  }>;
}

// Generate metadata for social sharing
export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  try {
    const { token } = await params;
    const api = await trpcServerCaller();
    const canvas = await api.canvas.getByShareToken({ shareToken: token });

    return {
      title: `${canvas.title} - Infinite Kanvas`,
      description: "View this shared canvas on Infinite Kanvas",
      openGraph: {
        title: canvas.title,
        description: "Shared canvas on Infinite Kanvas",
        type: "website",
        images: canvas.thumbnail_url ? [canvas.thumbnail_url] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: canvas.title,
        description: "Shared canvas on Infinite Kanvas",
        images: canvas.thumbnail_url ? [canvas.thumbnail_url] : undefined,
      },
    };
  } catch (error) {
    return {
      title: "Shared Canvas - Infinite Kanvas",
      description: "View shared canvas",
    };
  }
}

export default async function SharePage({ params }: SharePageProps) {
  try {
    // Verify the share link is valid
    const { token } = await params;
    const api = await trpcServerCaller();
    const canvas = await api.canvas.getByShareToken({ shareToken: token });

    // For now, render the canvas with the ID
    // TODO: Implement read-only mode in Canvas component
    return <ShareCanvasClient roomId={canvas.id} />;
  } catch (error) {
    notFound();
  }
}
