"use client";

import { useAtomValue } from "jotai";
import {
  syncAdapterAtom,
  presenceMapAtom,
  roomIdAtom,
  isMultiplayerAtom,
} from "@/atoms/multiplayer";

// Keep SyncContext export for compatibility during migration
export const SyncContext = null;

export const useSyncContext = () => {
  const syncAdapter = useAtomValue(syncAdapterAtom);
  const presenceMap = useAtomValue(presenceMapAtom);
  const roomId = useAtomValue(roomIdAtom);

  return {
    syncAdapter,
    presenceMap,
    roomId,
  };
};

export const useMultiplayer = () => {
  const syncAdapter = useAtomValue(syncAdapterAtom);
  const presenceMap = useAtomValue(presenceMapAtom);
  const roomId = useAtomValue(roomIdAtom);
  const isMultiplayer = useAtomValue(isMultiplayerAtom);

  return {
    syncAdapter,
    presenceMap,
    isMultiplayer,
    roomId,
  };
};
