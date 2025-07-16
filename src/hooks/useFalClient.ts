import React from "react";
import { createFalClient } from "@fal-ai/client";

// Custom hook for FAL client
export const useFalClient = (apiKey?: string) => {
  return React.useMemo(() => {
    return createFalClient({
      credentials: apiKey ?? undefined,
      proxyUrl: "/api/fal",
    });
  }, [apiKey]);
};
