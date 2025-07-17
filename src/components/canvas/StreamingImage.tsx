import React from "react";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useTRPC } from "@/trpc/client";
import type { ActiveGeneration } from "@/types/canvas";

interface StreamingImageProps {
  imageId: string;
  generation: ActiveGeneration;
  onComplete: (imageId: string, finalUrl: string) => void;
  onError: (imageId: string, error: string) => void;
  onStreamingUpdate: (imageId: string, url: string) => void;
  apiKey?: string;
}

export const StreamingImage: React.FC<StreamingImageProps> = ({
  imageId,
  generation,
  onComplete,
  onError,
  onStreamingUpdate,
  apiKey,
}) => {
  const subscription = useSubscription(
    useTRPC().generateImageStream.subscriptionOptions(
      {
        imageUrl: generation.imageUrl,
        prompt: generation.prompt,
        ...(generation.loraUrl ? { loraUrl: generation.loraUrl } : {}),
        ...(apiKey ? { apiKey } : {}),
      },
      {
        enabled: true,
        onData: (data: any) => {
          const eventData = data.data;

          if (eventData.type === "progress") {
            const event = eventData.data;
            if (event.images && event.images.length > 0) {
              onStreamingUpdate(imageId, event.images[0].url);
            }
          } else if (eventData.type === "complete") {
            onComplete(imageId, eventData.imageUrl);
          } else if (eventData.type === "error") {
            onError(imageId, eventData.error);
          }
        },
        onError: (error) => {
          console.error("Subscription error:", error);
          onError(imageId, error.message || "Generation failed");
        },
      },
    ),
  );

  return null;
};
