import { useState, useEffect } from "react";

/**
 * Hook for handling streaming video
 * @param src Video source URL
 * @returns [videoElement, isLoading, error]
 */
export const useStreamingVideo = (
  src: string,
): [HTMLVideoElement | null, boolean, Error | null] => {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!src) {
      setVideoElement(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Create video element
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = src;
    video.muted = true;

    // Ensure we're at the first frame for display
    video.currentTime = 0;

    // Handle video loading
    video.onloadedmetadata = () => {
      setVideoElement(video);
      setIsLoading(false);
    };

    // Handle errors
    video.onerror = () => {
      setError(new Error("Failed to load video"));
      setIsLoading(false);
    };

    // Start loading
    video.load();

    // Cleanup
    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return [videoElement, isLoading, error];
};
