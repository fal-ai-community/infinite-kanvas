"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full px-6 py-8 text-center">
        <div className="mb-6 flex justify-center">
          <WifiOff className="h-16 w-16 text-muted-foreground" />
        </div>

        <h1 className="text-2xl font-bold mb-2">You're offline</h1>
        <p className="text-muted-foreground mb-8">
          It looks like you've lost your internet connection. Some features may
          not be available until you're back online.
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => window.location.reload()}
            variant="default"
            className="w-full"
          >
            Try Again
          </Button>

          <p className="text-sm text-muted-foreground">
            Don't worry - any changes you made are saved locally and will sync
            when you reconnect.
          </p>
        </div>
      </div>
    </div>
  );
}
