import React from "react";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useTRPC } from "@/trpc/client";
import type { ActiveVideoGeneration } from "@/types/canvas";

interface StreamingVideoProps {
  videoId: string;
  generation: ActiveVideoGeneration;
  onComplete: (videoId: string, videoUrl: string, duration: number) => void;
  onError: (videoId: string, error: string) => void;
  onProgress: (videoId: string, progress: number, status: string) => void;
  apiKey?: string;
}

export const StreamingVideo: React.FC<StreamingVideoProps> = ({
  videoId,
  generation,
  onComplete,
  onError,
  onProgress,
  apiKey,
}) => {
  // Determine which endpoint to use based on the generation type
  let subscriptionOptions;

  if (generation.videoUrl) {
    // Video-to-video transformation
    subscriptionOptions = useTRPC().transformVideo.subscriptionOptions(
      {
        videoUrl: generation.videoUrl,
        prompt: generation.prompt,
        styleId: generation.styleId,
        ...(apiKey ? { apiKey } : {}),
      },
      {
        enabled: true,
        onData: async (data: any) => {
          const eventData = data.data;

          if (eventData.type === "progress") {
            onProgress(
              videoId,
              eventData.progress || 0,
              eventData.status || "Transforming video...",
            );
          } else if (eventData.type === "complete") {
            onComplete(
              videoId,
              eventData.videoUrl,
              eventData.duration || generation.duration || 3,
            );
          } else if (eventData.type === "error") {
            onError(videoId, eventData.error);
          }
        },
        onError: (error) => {
          console.error("Video transformation error:", error);
          onError(videoId, error.message || "Video transformation failed");
        },
      },
    );
  } else if (generation.imageUrl) {
    // Image-to-video conversion
    subscriptionOptions = useTRPC().generateImageToVideo.subscriptionOptions(
      {
        imageUrl: generation.imageUrl,
        prompt: generation.prompt,
        duration: generation.duration || 5,
        modelVersion: generation.modelVersion || "lite",
        resolution: generation.resolution || "720p",
        cameraFixed: generation.cameraFixed,
        seed: generation.seed,
        ...(apiKey ? { apiKey } : {}),
      },
      {
        enabled: true,
        onData: async (data: any) => {
          const eventData = data.data;

          if (eventData.type === "progress") {
            onProgress(
              videoId,
              eventData.progress || 0,
              eventData.status || "Converting image to video...",
            );
          } else if (eventData.type === "complete") {
            onComplete(
              videoId,
              eventData.videoUrl,
              eventData.duration || generation.duration || 5,
            );
          } else if (eventData.type === "error") {
            onError(videoId, eventData.error);
          }
        },
        onError: (error) => {
          console.error("Image-to-video conversion error:", error);
          onError(videoId, error.message || "Image-to-video conversion failed");
        },
      },
    );
  } else {
    // Text-to-video generation
    subscriptionOptions = useTRPC().generateTextToVideo.subscriptionOptions(
      {
        prompt: generation.prompt,
        duration: generation.duration || 3,
        styleId: generation.styleId,
        ...(apiKey ? { apiKey } : {}),
      },
      {
        enabled: true,
        onData: async (data: any) => {
          const eventData = data.data;

          if (eventData.type === "progress") {
            onProgress(
              videoId,
              eventData.progress || 0,
              eventData.status || "Generating video from text...",
            );
          } else if (eventData.type === "complete") {
            onComplete(
              videoId,
              eventData.videoUrl,
              eventData.duration || generation.duration || 3,
            );
          } else if (eventData.type === "error") {
            onError(videoId, eventData.error);
          }
        },
        onError: (error) => {
          console.error("Text-to-video generation error:", error);
          onError(videoId, error.message || "Text-to-video generation failed");
        },
      },
    );
  }

  // Create the subscription
  useSubscription(subscriptionOptions);

  return null;
};
