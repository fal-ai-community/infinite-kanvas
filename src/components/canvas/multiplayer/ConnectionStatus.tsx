"use client";

import React from "react";
import { useAtomValue } from "jotai";
import { connectionStateAtom } from "@/hooks/use-multiplayer";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Loader } from "lucide-react";

export function ConnectionStatus() {
  const connectionState = useAtomValue(connectionStateAtom);
  
  // Hide "Connected" status after 3 seconds
  const [showConnected, setShowConnected] = React.useState(true);
  React.useEffect(() => {
    if (connectionState === 'connected') {
      const timer = setTimeout(() => setShowConnected(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowConnected(true);
    }
  }, [connectionState]);

  if (connectionState === 'disconnected') return null;
  if (connectionState === 'connected' && !showConnected) return null;

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connecting':
        return {
          icon: <Loader className="h-3 w-3 animate-spin" />,
          text: 'Connecting...',
          className: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        };
      case 'connected':
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: 'Connected',
          className: 'text-green-600 bg-green-50 border-green-200',
        };
      case 'reconnecting':
        return {
          icon: <Loader className="h-3 w-3 animate-spin" />,
          text: 'Reconnecting...',
          className: 'text-orange-600 bg-orange-50 border-orange-200',
        };
      case 'error':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Connection error',
          className: 'text-red-600 bg-red-50 border-red-200',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-20",
        "flex items-center gap-2 px-3 py-2",
        "text-xs font-medium rounded-md border",
        "transition-all duration-200",
        config.className
      )}
    >
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}