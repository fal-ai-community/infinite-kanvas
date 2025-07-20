import { atom, useAtomValue, useSetAtom } from "jotai";
import type { PlacedImage } from "@/types/canvas";
import type {
  ViewportState,
  PresenceData,
  SyncAdapter,
  ChatMessage,
} from "@/lib/sync/types";

// Base atoms for state
export const imagesAtom = atom<PlacedImage[]>([]);
export const viewportAtom = atom<ViewportState>({ x: 0, y: 0, scale: 1 });
export const presenceMapAtom = atom<Map<string, PresenceData>>(new Map());

// Sync adapter and room atoms
export const syncAdapterAtom = atom<SyncAdapter | null>(null);
export const roomIdAtom = atom<string | undefined>(undefined);

// Chat atoms
export const chatMessagesAtom = atom<ChatMessage[]>([]);

// Derived atom for checking if multiplayer
export const isMultiplayerAtom = atom((get) => !!get(roomIdAtom));

// Write-only atoms for actions
export const setImagesAtom = atom(null, (_get, set, images: PlacedImage[]) => {
  set(imagesAtom, images);
});

export const updateImageAtom = atom(
  null,
  (
    get,
    set,
    { id, updates }: { id: string; updates: Partial<PlacedImage> },
  ) => {
    const currentImages = get(imagesAtom);
    const newImages = currentImages.map((img) =>
      img.id === id ? { ...img, ...updates } : img,
    );
    set(imagesAtom, newImages);
  },
);

export const addImageAtom = atom(null, (get, set, image: PlacedImage) => {
  const currentImages = get(imagesAtom);
  set(imagesAtom, [...currentImages, image]);
});

export const removeImageAtom = atom(null, (get, set, id: string) => {
  const currentImages = get(imagesAtom);
  set(
    imagesAtom,
    currentImages.filter((img) => img.id !== id),
  );
});

export const setViewportAtom = atom(
  null,
  (_get, set, viewport: ViewportState) => {
    set(viewportAtom, viewport);
  },
);

// Presence actions
export const updatePresenceAtom = atom(
  null,
  (get, set, { userId, data }: { userId: string; data: PresenceData }) => {
    const currentMap = get(presenceMapAtom);
    const newMap = new Map(currentMap);
    newMap.set(userId, data);
    console.log("[atoms/multiplayer] Updated presence map:", newMap.size, "users");
    console.log("[atoms/multiplayer] Presence map contents:", Array.from(newMap.entries()).map(([k, v]) => ({ key: k, userId: v.userId, name: v.name })));
    set(presenceMapAtom, newMap);
  },
);

export const removePresenceAtom = atom(null, (get, set, userId: string) => {
  const currentMap = get(presenceMapAtom);
  const newMap = new Map(currentMap);
  newMap.delete(userId);
  set(presenceMapAtom, newMap);
});

export const clearPresenceAtom = atom(null, (_get, set) => {
  set(presenceMapAtom, new Map());
});

// Chat actions
export const setChatMessagesAtom = atom(null, (_get, set, messages: ChatMessage[]) => {
  set(chatMessagesAtom, messages);
});

export const addChatMessageAtom = atom(null, (get, set, message: ChatMessage) => {
  const currentMessages = get(chatMessagesAtom);
  set(chatMessagesAtom, [...currentMessages, message]);
});

// Hook that provides similar interface to the old Zustand store
export const useMultiplayerStore = () => {
  const images = useAtomValue(imagesAtom);
  const viewport = useAtomValue(viewportAtom);
  const presenceMap = useAtomValue(presenceMapAtom);

  const setImages = useSetAtom(setImagesAtom);
  const updateImage = useSetAtom(updateImageAtom);
  const addImage = useSetAtom(addImageAtom);
  const removeImage = useSetAtom(removeImageAtom);
  const setViewport = useSetAtom(setViewportAtom);
  const updatePresence = useSetAtom(updatePresenceAtom);
  const removePresence = useSetAtom(removePresenceAtom);
  const clearPresence = useSetAtom(clearPresenceAtom);

  return {
    // State
    images,
    viewport,
    presenceMap,

    // Actions
    setImages,
    updateImage: (id: string, updates: Partial<PlacedImage>) =>
      updateImage({ id, updates }),
    addImage,
    removeImage,
    setViewport,
    updatePresence: (userId: string, data: PresenceData) =>
      updatePresence({ userId, data }),
    removePresence,
    clearPresence,
  };
};
