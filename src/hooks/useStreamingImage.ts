"use client";

import { useState, useEffect, useRef } from "react";

// Custom hook for streaming images that prevents flickering
export const useStreamingImage = (src: string) => {
  const [currentImage, setCurrentImage] = useState<
    HTMLImageElement | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef<{ src: string; img: HTMLImageElement } | null>(
    null,
  );

  useEffect(() => {
    if (!src) {
      setCurrentImage(undefined);
      return;
    }

    // If we already have this image loaded, don't reload it
    if (currentImage && currentImage.src === src) {
      return;
    }

    // If we're already loading this exact URL, don't start another load
    if (loadingRef.current && loadingRef.current.src === src) {
      return;
    }

    setIsLoading(true);
    const img = new window.Image();
    img.crossOrigin = "anonymous";

    loadingRef.current = { src, img };

    img.onload = () => {
      // Only update if this is still the image we want to load
      if (loadingRef.current && loadingRef.current.src === src) {
        setCurrentImage(img);
        setIsLoading(false);
        loadingRef.current = null;
      }
    };

    img.onerror = () => {
      if (loadingRef.current && loadingRef.current.src === src) {
        setIsLoading(false);
        loadingRef.current = null;
      }
    };

    img.src = src;

    return () => {
      // Clean up if component unmounts or src changes before load completes
      if (loadingRef.current && loadingRef.current.src === src) {
        loadingRef.current = null;
      }
    };
  }, [src]);

  return [currentImage, isLoading] as const;
};
