import { useEffect, useRef, useCallback, useState } from "react";
import { useSetAtom, useAtomValue, atom } from "jotai";
import { PartyKitConnection } from "@/lib/multiplayer/adapter";
import type { PlacedImage } from "@/types/canvas";
import type { ViewportState } from "@/types/multiplayer";
import {
  syncAdapterAtom,
  roomIdAtom,
  setImagesAtom,
  updateImageAtom,
  addImageAtom,
  removeImageAtom,
  updatePresenceAtom,
  removePresenceAtom,
  clearPresenceAtom,
  imagesAtom,
  presenceMapAtom,
  chatMessagesAtom,
  setChatMessagesAtom,
  addChatMessageAtom,
  setViewportAtom,
} from "@/atoms/multiplayer";
import { useToast } from "@/hooks/use-toast";
import { useFalClient } from "@/hooks/useFalClient";
import { throttle, debounce } from "@/lib/utils";
import {
  BASE_DELAY_MS,
  BACKOFF_MULTIPLIER,
  MAX_BACKOFF_DELAY_MS,
  CURSOR_THROTTLE_MS,
  VIEWPORT_DEBOUNCE_MS,
} from "@/lib/constants";

// Connection state atom
export type ConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";
export const connectionStateAtom = atom<ConnectionState>("disconnected");

// Following user atom
export const followingUserIdAtom = atom<string | null>(null);

// Hook that combines connection management and canvas operations
export function useMultiplayer(roomId?: string) {
  // Optional to allow child components to access state
  const { toast } = useToast();
  const [customApiKey] = [""]; // Replace with actual state if needed
  const falClient = useFalClient(customApiKey);

  // Connection state
  const setConnectionState = useSetAtom(connectionStateAtom);
  const connectionState = useAtomValue(connectionStateAtom);

  // Core atoms
  const setConnectionAtom = useSetAtom(syncAdapterAtom);
  const setConnection = (connection: PartyKitConnection | null) => {
    setConnectionAtom(connection);
  };
  const setRoomId = useSetAtom(roomIdAtom);
  const connection = useAtomValue(syncAdapterAtom) as PartyKitConnection | null;
  const storedRoomId = useAtomValue(roomIdAtom);
  const presenceMap = useAtomValue(presenceMapAtom);
  const images = useAtomValue(imagesAtom);
  const chatMessages = useAtomValue(chatMessagesAtom);

  // Actions
  const setImages = useSetAtom(setImagesAtom);
  const updateImage = useSetAtom(updateImageAtom);
  const addImage = useSetAtom(addImageAtom);
  const removeImage = useSetAtom(removeImageAtom);
  const updatePresence = useSetAtom(updatePresenceAtom);
  const removePresence = useSetAtom(removePresenceAtom);
  const clearPresence = useSetAtom(clearPresenceAtom);
  const setChatMessages = useSetAtom(setChatMessagesAtom);
  const addChatMessage = useSetAtom(addChatMessageAtom);
  const setViewport = useSetAtom(setViewportAtom);

  // Following state
  const followingUserId = useAtomValue(followingUserIdAtom);
  const setFollowingUserId = useSetAtom(followingUserIdAtom);

  // Refs for cleanup and throttling
  const connectionRef = useRef<PartyKitConnection | null>(null);
  const mountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Connection management with StrictMode fix
  useEffect(() => {
    // Skip if no roomId provided (child components just accessing state)
    if (!roomId) {
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let cleanupExecuted = false;

    // Update room ID
    setRoomId(roomId);

    console.log(`[useMultiplayer] Setting up connection for room ${roomId}`);
    setConnectionState("connecting");

    // Use a setup flag to prevent double connections
    const setupConnection = () => {
      if (cleanupExecuted || connectionRef.current) return;

      const partyConnection = new PartyKitConnection({
        roomId,
        falClient,
        toast,
        setIsApiKeyDialogOpen: () => {},
        onConnectionStateChange: (
          state: "connected" | "disconnected" | "error",
        ) => {
          // Connection state changed: state
          if (state === "connected") {
            setConnectionState("connected");
            reconnectAttemptsRef.current = 0;
            toast({
              title: "Connected",
              description: "Joined multiplayer room",
              duration: 2000,
            });
          } else if (state === "disconnected") {
            if (mountedRef.current) {
              setConnectionState("reconnecting");
              scheduleReconnect();
            }
          } else if (state === "error") {
            setConnectionState("error");
          }
        },
      });

      connectionRef.current = partyConnection;
      setConnection(partyConnection);
      // Connection created and stored

      unsubscribe = partyConnection.subscribe({
        onFullSync: (state) => {
          console.log("Full sync received:", state);
          setImages(state.images);
        },

        onImageUpdate: (image) => {
          console.log("Image update received:", image);
          updateImage({ id: image.id, updates: image });
        },

        onImageAdd: (image) => {
          console.log("Image add received:", image);
          addImage(image);
        },

        onImageRemove: (imageId) => {
          console.log("Image remove received:", imageId);
          removeImage(imageId);
        },

        onPresenceUpdate: (data) => {
          console.log("[useMultiplayer] Presence update received:", data);
          if (data.type === "leave") {
            removePresence(data.userId);
            if (data.userId === followingUserId) {
              setFollowingUserId(null);
            }
            toast({
              description: `${data.name || "User"} left`,
              duration: 2000,
            });
          } else {
            // Check if this is our own connection
            const isCurrentUser =
              data.userId === partyConnection.getConnectionId();

            // Skip if we already have this user and it's a join event (not move)
            const existingUser = presenceMap.get(data.userId);
            if (existingUser && data.type === "join") {
              console.log(
                "[useMultiplayer] User already exists, skipping duplicate join:",
                data.userId,
              );
              return;
            }

            // Create presence data with userId included
            const presenceData = {
              userId: data.userId,
              cursor: data.cursor,
              color: data.color || existingUser?.color || "#FF6B6B",
              name: data.name || existingUser?.name || "Anonymous",
              lastActive:
                data.type === "move"
                  ? Date.now()
                  : existingUser?.lastActive || Date.now(),
            };

            console.log(
              "[useMultiplayer] Updating presence for user:",
              data.userId,
              "type:",
              data.type,
              "cursor:",
              data.cursor,
            );
            updatePresence({ userId: data.userId, data: presenceData });

            if (data.type === "join" && !isCurrentUser) {
              toast({
                description: `${data.name || "User"} joined`,
                duration: 2000,
              });
            }
          }
        },

        onViewportChange: (userId: string, viewport: ViewportState) => {
          // Update user's viewport in presence
          const user = presenceMap.get(userId);
          if (user) {
            updatePresence({
              userId,
              data: { ...user, viewport },
            });
          }

          // If we're following this user, sync our viewport
          if (followingUserId === userId) {
            setViewport(viewport);
          }
        },

        onChatHistory: (messages) => {
          console.log(
            "[useMultiplayer] Chat history received:",
            messages.length,
          );
          setChatMessages(messages);
        },

        onChatMessage: (message) => {
          console.log("[useMultiplayer] Chat message received:", message);
          addChatMessage(message);
        },
      });
    };

    // Exponential backoff reconnection
    const scheduleReconnect = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      const delay = Math.min(
        BASE_DELAY_MS *
          Math.pow(BACKOFF_MULTIPLIER, reconnectAttemptsRef.current),
        MAX_BACKOFF_DELAY_MS,
      );
      reconnectAttemptsRef.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && !cleanupExecuted) {
          console.log(
            `[useMultiplayer] Attempting reconnect (attempt ${reconnectAttemptsRef.current})`,
          );
          setupConnection();
        }
      }, delay);
    };

    // Small delay to handle StrictMode
    const setupTimeout = setTimeout(setupConnection, 50);

    // Cleanup
    return () => {
      console.log("[useMultiplayer] Cleaning up...");
      cleanupExecuted = true;
      mountedRef.current = false;

      clearTimeout(setupTimeout);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (unsubscribe) {
        unsubscribe();
      }

      if (connectionRef.current) {
        connectionRef.current = null;
      }

      clearPresence();
      setConnection(null);
      setRoomId(undefined);
      setConnectionState("disconnected");
    };
  }, [roomId]);

  // Update page title with user count
  useEffect(() => {
    if (presenceMap.size > 0) {
      document.title = `(${presenceMap.size}) Infinite Canvas`;
    } else {
      document.title = "Infinite Canvas";
    }
  }, [presenceMap.size]);

  // Canvas operation wrappers with optimistic updates
  const handleImageUpdate = useCallback(
    async (id: string, updates: Partial<PlacedImage>) => {
      // Optimistic update
      updateImage({ id, updates });

      // Sync
      if (connection) {
        const updatedImage = images.find((img) => img.id === id);
        if (updatedImage) {
          try {
            await connection.onImageUpdate({ ...updatedImage, ...updates });
          } catch (error) {
            console.error("Failed to sync image update:", error);
            // Revert on failure
            updateImage({ id, updates: updatedImage });
          }
        }
      }
    },
    [images, updateImage, connection],
  );

  const handleImageAdd = useCallback(
    async (image: PlacedImage) => {
      // Optimistic add
      addImage(image);

      // Sync if multiplayer
      if (connection) {
        try {
          await connection.onImageAdd(image);
        } catch (error) {
          console.error("Failed to sync image addition:", error);
          // Remove on failure
          removeImage(image.id);
        }
      }
    },
    [addImage, removeImage, connection],
  );

  const handleImageRemove = useCallback(
    (imageId: string) => {
      // Store removed image for potential revert
      const removedImage = images.find((img) => img.id === imageId);

      // Optimistic remove
      removeImage(imageId);

      // Sync if multiplayer
      if (connection) {
        connection.onImageRemove(imageId);
      }
    },
    [images, removeImage, connection],
  );

  // Store current values in refs to avoid closure issues
  const connectionRefForThrottle = useRef<PartyKitConnection | null>(null);
  const connectionStateRef = useRef(connectionState);

  // Update refs when values change
  useEffect(() => {
    connectionRefForThrottle.current = connection;
  }, [connection]);

  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  // Throttled cursor position broadcasting (60fps)
  const handleCursorMove = useRef(
    throttle((position: { x: number; y: number }) => {
      if (
        connectionRefForThrottle.current &&
        connectionStateRef.current === "connected"
      ) {
        connectionRefForThrottle.current.onCursorMove(position);
      }
    }, CURSOR_THROTTLE_MS), // ~60fps
  ).current;

  // Debounced viewport change broadcasting
  const handleViewportChange = useRef(
    debounce((viewport: ViewportState) => {
      if (
        connectionRefForThrottle.current &&
        connectionStateRef.current === "connected"
      ) {
        connectionRefForThrottle.current.onViewportChange(viewport);
      }
    }, VIEWPORT_DEBOUNCE_MS),
  ).current;

  // Generation event handlers
  const handleGenerationStart = useCallback(
    (imageId: string) => {
      if (connection) {
        connection.onGenerationStart(imageId);
      }
    },
    [connection],
  );

  const handleGenerationComplete = useCallback(
    (imageId: string) => {
      if (connection) {
        connection.onGenerationComplete(imageId);
      }
    },
    [connection],
  );

  // Follow user functionality
  const followUser = useCallback(
    (userId: string | null) => {
      setFollowingUserId(userId);
      if (userId) {
        toast({
          description: `Following ${presenceMap.get(userId)?.name || "user"}`,
          duration: 2000,
        });
      }
    },
    [setFollowingUserId, presenceMap, toast],
  );

  // Chat functionality
  const sendChatMessage = useCallback(
    (text: string) => {
      if (connection && connectionState === "connected") {
        connection.sendChatMessage?.(text);
      }
    },
    [connection, connectionState],
  );

  return {
    // State
    isMultiplayer: !!roomId, // True if roomId is provided
    connectionState,
    presenceMap,
    images,
    roomId: roomId || storedRoomId, // Use provided roomId or stored one
    chatMessages,

    // Following
    followingUserId,
    followUser,

    // Chat
    sendChatMessage,

    // Canvas operations
    handleImageUpdate,
    handleImageAdd,
    handleImageRemove,
    handleCursorMove,
    handleViewportChange,
    handleGenerationStart,
    handleGenerationComplete,

    // Direct connection access for advanced operations
    syncAdapter: connection,
  };
}
