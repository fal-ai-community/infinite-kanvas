"use client";

import React from "react";
import { useState, useCallback } from "react";
import { Stage, Layer, Rect, Group, Line } from "react-konva";
import Konva from "konva";
import { canvasStorage, type CanvasState } from "@/lib/storage";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  X,
  ChevronDown,
  Check,
  Upload,
  Filter,
  Plus,
  ImageIcon,
  Trash2,
  Undo,
  Redo,
  Key,
  Star,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Logo, SpinnerIcon } from "@/components/icons";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { styleModels } from "@/lib/models";
import { useToast } from "@/hooks/use-toast";
import { LogoIcon } from "@/components/icons/logo";
import { createFalClient } from "@fal-ai/client";

// Import extracted components
import { ShortcutBadge } from "@/components/canvas/ShortcutBadge";
import { StreamingImage } from "@/components/canvas/StreamingImage";
import { CropOverlayWrapper } from "@/components/canvas/CropOverlayWrapper";
import { CanvasImage } from "@/components/canvas/CanvasImage";

// Import types
import type {
  PlacedImage,
  HistoryState,
  GenerationSettings,
  ActiveGeneration,
  SelectionBox,
} from "@/types/canvas";

import { imageToCanvasElement } from "@/utils/canvas-utils";
import { checkOS } from "@/utils/os-utils";

// Import additional extracted components
import { useFalClient } from "@/hooks/useFalClient";
import { CanvasGrid } from "@/components/canvas/CanvasGrid";
import { SelectionBoxComponent } from "@/components/canvas/SelectionBox";
import { MiniMap } from "@/components/canvas/MiniMap";
import { ZoomControls } from "@/components/canvas/ZoomControls";
import { MobileToolbar } from "@/components/canvas/MobileToolbar";
import { CanvasContextMenu } from "@/components/canvas/CanvasContextMenu";
import Image from "next/image";

// Import handlers
import {
  handleRun as handleRunHandler,
  uploadImageDirect,
  generateImage,
} from "@/lib/handlers/generation-handler";
import { handleRemoveBackground as handleRemoveBackgroundHandler } from "@/lib/handlers/background-handler";

export default function OverlayPage() {
  const [images, setImages] = useState<PlacedImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const simpsonsStyle = styleModels.find((m) => m.id === "simpsons");
  const { toast } = useToast();

  const [generationSettings, setGenerationSettings] =
    useState<GenerationSettings>({
      prompt: simpsonsStyle?.prompt || "",
      loraUrl: simpsonsStyle?.loraUrl || "",
      styleId: simpsonsStyle?.id || "simpsons",
    });
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeGenerations, setActiveGenerations] = useState<
    Map<string, ActiveGeneration>
  >(new Map());
  const [selectionBox, setSelectionBox] = useState<SelectionBox>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    visible: false,
  });
  const [isSelecting, setIsSelecting] = useState(false);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [dragStartPositions, setDragStartPositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [canvasSize, setCanvasSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
  const [croppingImageId, setCroppingImageId] = useState<string | null>(null);
  const [viewport, setViewport] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });
  const stageRef = useRef<Konva.Stage>(null);
  const [isolateTarget, setIsolateTarget] = useState<string | null>(null);
  const [isolateInputValue, setIsolateInputValue] = useState("");
  const [isIsolating, setIsIsolating] = useState(false);
  const [isStyleDialogOpen, setIsStyleDialogOpen] = useState(false);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [tempApiKey, setTempApiKey] = useState<string>("");
  const [_, setIsSaving] = useState(false);

  // Touch event states for mobile
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(
    null,
  );
  const [lastTouchCenter, setLastTouchCenter] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isTouchingImage, setIsTouchingImage] = useState(false);

  // Create FAL client instance with proxy
  const falClient = useFalClient(customApiKey);

  const trpc = useTRPC();

  // Direct FAL upload function using proxy

  const { mutateAsync: removeBackground } = useMutation(
    trpc.removeBackground.mutationOptions(),
  );

  const { mutateAsync: isolateObject } = useMutation(
    trpc.isolateObject.mutationOptions(),
  );

  const { mutateAsync: generateTextToImage } = useMutation(
    trpc.generateTextToImage.mutationOptions(),
  );

  // Save current state to storage
  const saveToStorage = useCallback(async () => {
    try {
      setIsSaving(true);

      // Save canvas state (positions, transforms, etc.)
      const canvasState: CanvasState = {
        elements: images.map(imageToCanvasElement),
        backgroundColor: "#ffffff",
        lastModified: Date.now(),
        viewport: viewport,
      };
      canvasStorage.saveCanvasState(canvasState);

      // Save actual image data to IndexedDB
      for (const image of images) {
        // Skip if it's a placeholder for generation
        if (
          image.src.startsWith("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP")
        )
          continue;

        // Check if we already have this image stored
        const existingImage = await canvasStorage.getImage(image.id);
        if (!existingImage) {
          await canvasStorage.saveImage(image.src, image.id);
        }
      }

      // Clean up unused images
      await canvasStorage.cleanupOldData();

      // Brief delay to show the indicator
      setTimeout(() => setIsSaving(false), 300);
    } catch (error) {
      console.error("Failed to save to storage:", error);
      setIsSaving(false);
    }
  }, [images, viewport]);

  // Load state from storage
  const loadFromStorage = useCallback(async () => {
    try {
      const canvasState = canvasStorage.getCanvasState();
      if (!canvasState) {
        setIsStorageLoaded(true);
        return;
      }

      const loadedImages: PlacedImage[] = [];

      for (const element of canvasState.elements) {
        if (element.type === "image" && element.imageId) {
          const imageData = await canvasStorage.getImage(element.imageId);
          if (imageData) {
            loadedImages.push({
              id: element.id,
              src: imageData.originalDataUrl,
              x: element.transform.x,
              y: element.transform.y,
              width: element.width || 300,
              height: element.height || 300,
              rotation: element.transform.rotation,
              ...(element.transform.cropBox && {
                cropX: element.transform.cropBox.x,
                cropY: element.transform.cropBox.y,
                cropWidth: element.transform.cropBox.width,
                cropHeight: element.transform.cropBox.height,
              }),
            });
          }
        }
      }

      if (loadedImages.length > 0) {
        setImages(loadedImages);

        // Restore viewport if available
        if (canvasState.viewport) {
          setViewport(canvasState.viewport);
        }
      }
    } catch (error) {
      console.error("Failed to load from storage:", error);
      toast({
        title: "Failed to restore canvas",
        description: "Starting with a fresh canvas",
        variant: "destructive",
      });
    } finally {
      setIsStorageLoaded(true);
    }
  }, [toast]);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("fal-api-key");
    if (savedKey) {
      setCustomApiKey(savedKey);
      setTempApiKey(savedKey);
    }
  }, []);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (customApiKey) {
      localStorage.setItem("fal-api-key", customApiKey);
    } else {
      localStorage.removeItem("fal-api-key");
    }
  }, [customApiKey]);

  // Save state to history
  const saveToHistory = useCallback(() => {
    const newState = { images: [...images], selectedIds: [...selectedIds] };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [images, selectedIds, history, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setImages(prevState.images);
      setSelectedIds(prevState.selectedIds);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setImages(nextState.images);
      setSelectedIds(nextState.selectedIds);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Save initial state
  useEffect(() => {
    if (history.length === 0) {
      saveToHistory();
    }
  }, []);

  // Set canvas ready state after mount
  useEffect(() => {
    // Only set canvas ready after we have valid dimensions
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      setIsCanvasReady(true);
    }
  }, [canvasSize]);

  // Update canvas size on window resize
  useEffect(() => {
    const updateCanvasSize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial size
    updateCanvasSize();

    // Update on resize
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Prevent body scrolling on mobile
  useEffect(() => {
    // Prevent scrolling on mobile
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    };
  }, []);

  // Load from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Auto-save to storage when images change (with debounce)
  useEffect(() => {
    if (!isStorageLoaded) return; // Don't save until we've loaded
    if (activeGenerations.size > 0) return;

    const timeoutId = setTimeout(() => {
      saveToStorage();
    }, 1000); // Save after 1 second of no changes

    return () => clearTimeout(timeoutId);
  }, [
    images,
    viewport,
    isStorageLoaded,
    saveToStorage,
    activeGenerations.size,
  ]);

  // Load default images only if no saved state
  useEffect(() => {
    if (!isStorageLoaded) return;
    if (images.length > 0) return; // Already have images from storage

    const loadDefaultImages = async () => {
      const defaultImagePaths = [
        "/hat.png",
        "/man.png",
        "/og-img-compress.png",
        "/chad.png",
        "/anime.png",
        "/cat.jpg",
        "/overlay.png",
      ];
      const loadedImages: PlacedImage[] = [];

      for (let i = 0; i < defaultImagePaths.length; i++) {
        const path = defaultImagePaths[i];
        try {
          const response = await fetch(path);
          const blob = await response.blob();
          const reader = new FileReader();

          reader.onload = (e) => {
            const img = new window.Image();
            img.crossOrigin = "anonymous"; // Enable CORS
            img.onload = () => {
              const id = `default-${path.replace("/", "").replace(".png", "")}-${Date.now()}`;
              const aspectRatio = img.width / img.height;
              const maxSize = 200;
              let width = maxSize;
              let height = maxSize / aspectRatio;

              if (height > maxSize) {
                height = maxSize;
                width = maxSize * aspectRatio;
              }

              // Position images in a row at center of viewport
              const spacing = 250;
              const totalWidth = spacing * (defaultImagePaths.length - 1);
              const viewportCenterX = canvasSize.width / 2;
              const viewportCenterY = canvasSize.height / 2;
              const startX = viewportCenterX - totalWidth / 2;
              const x = startX + i * spacing - width / 2;
              const y = viewportCenterY - height / 2;

              setImages((prev) => [
                ...prev,
                {
                  id,
                  src: e.target?.result as string,
                  x,
                  y,
                  width,
                  height,
                  rotation: 0,
                },
              ]);
            };
            img.src = e.target?.result as string;
          };

          reader.readAsDataURL(blob);
        } catch (error) {
          console.error(`Failed to load default image ${path}:`, error);
        }
      }
    };

    loadDefaultImages();
  }, [isStorageLoaded, images.length]);

  // Helper function to resize image if too large
  const resizeImageIfNeeded = async (
    dataUrl: string,
    maxWidth: number = 2048,
    maxHeight: number = 2048,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Check if resize is needed
        if (img.width <= maxWidth && img.height <= maxHeight) {
          resolve(dataUrl);
          return;
        }

        // Calculate new dimensions
        let newWidth = img.width;
        let newHeight = img.height;
        const aspectRatio = img.width / img.height;

        if (newWidth > maxWidth) {
          newWidth = maxWidth;
          newHeight = newWidth / aspectRatio;
        }
        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = newHeight * aspectRatio;
        }

        // Create canvas and resize
        const canvas = document.createElement("canvas");
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to data URL with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob"));
              return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          },
          "image/jpeg",
          0.9, // 90% quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    });
  };

  // Helper function to create a cropped image
  const createCroppedImage = async (
    imageSrc: string,
    cropX: number,
    cropY: number,
    cropWidth: number,
    cropHeight: number,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous"; // Enable CORS
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Set canvas size to the natural cropped dimensions
        canvas.width = cropWidth * img.naturalWidth;
        canvas.height = cropHeight * img.naturalHeight;

        // Draw the cropped portion at full resolution
        ctx.drawImage(
          img,
          cropX * img.naturalWidth,
          cropY * img.naturalHeight,
          cropWidth * img.naturalWidth,
          cropHeight * img.naturalHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );

        // Convert to data URL
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }, "image/png");
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageSrc;
    });
  };

  // Handle file upload
  const handleFileUpload = (
    files: FileList | null,
    position?: { x: number; y: number },
  ) => {
    if (!files) return;

    Array.from(files).forEach((file, index) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const id = `img-${Date.now()}-${Math.random()}`;
          const img = new window.Image();
          img.crossOrigin = "anonymous"; // Enable CORS
          img.onload = () => {
            const aspectRatio = img.width / img.height;
            const maxSize = 300;
            let width = maxSize;
            let height = maxSize / aspectRatio;

            if (height > maxSize) {
              height = maxSize;
              width = maxSize * aspectRatio;
            }

            // Place image at position or center of current viewport
            let x, y;
            if (position) {
              // Convert screen position to canvas coordinates
              x = (position.x - viewport.x) / viewport.scale - width / 2;
              y = (position.y - viewport.y) / viewport.scale - height / 2;
            } else {
              // Center of viewport
              const viewportCenterX =
                (canvasSize.width / 2 - viewport.x) / viewport.scale;
              const viewportCenterY =
                (canvasSize.height / 2 - viewport.y) / viewport.scale;
              x = viewportCenterX - width / 2;
              y = viewportCenterY - height / 2;
            }

            // Add offset for multiple files
            if (index > 0) {
              x += index * 20;
              y += index * 20;
            }

            setImages((prev) => [
              ...prev,
              {
                id,
                src: e.target?.result as string,
                x,
                y,
                width,
                height,
                rotation: 0,
              },
            ]);
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    // Get drop position relative to the stage
    const stage = stageRef.current;
    if (stage) {
      const container = stage.container();
      const rect = container.getBoundingClientRect();
      const dropPosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      handleFileUpload(e.dataTransfer.files, dropPosition);
    } else {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Handle wheel for zoom
  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    // Check if this is a pinch gesture (ctrl key is pressed on trackpad pinch)
    if (e.evt.ctrlKey) {
      // This is a pinch-to-zoom gesture
      const oldScale = viewport.scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - viewport.x) / oldScale,
        y: (pointer.y - viewport.y) / oldScale,
      };

      // Zoom based on deltaY (negative = zoom in, positive = zoom out)
      const scaleBy = 1.01;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const steps = Math.min(Math.abs(e.evt.deltaY), 10);
      let newScale = oldScale;

      for (let i = 0; i < steps; i++) {
        newScale = direction > 0 ? newScale * scaleBy : newScale / scaleBy;
      }

      // Limit zoom (10% to 500%)
      const scale = Math.max(0.1, Math.min(5, newScale));

      const newPos = {
        x: pointer.x - mousePointTo.x * scale,
        y: pointer.y - mousePointTo.y * scale,
      };

      setViewport({ x: newPos.x, y: newPos.y, scale });
    } else {
      // This is a pan gesture (two-finger swipe on trackpad or mouse wheel)
      const deltaX = e.evt.shiftKey ? e.evt.deltaY : e.evt.deltaX;
      const deltaY = e.evt.shiftKey ? 0 : e.evt.deltaY;

      // Invert the direction to match natural scrolling
      setViewport((prev) => ({
        ...prev,
        x: prev.x - deltaX,
        y: prev.y - deltaY,
      }));
    }
  };

  // Touch event handlers for mobile
  const handleTouchStart = (e: any) => {
    const touches = e.evt.touches;
    const stage = stageRef.current;

    if (touches.length === 2) {
      // Two fingers - prepare for pinch-to-zoom
      const touch1 = { x: touches[0].clientX, y: touches[0].clientY };
      const touch2 = { x: touches[1].clientX, y: touches[1].clientY };

      const distance = Math.sqrt(
        Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2),
      );

      const center = {
        x: (touch1.x + touch2.x) / 2,
        y: (touch1.y + touch2.y) / 2,
      };

      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    } else if (touches.length === 1) {
      // Single finger - check if touching an image
      const touch = { x: touches[0].clientX, y: touches[0].clientY };

      // Check if we're touching an image
      if (stage) {
        const pos = stage.getPointerPosition();
        if (pos) {
          const canvasPos = {
            x: (pos.x - viewport.x) / viewport.scale,
            y: (pos.y - viewport.y) / viewport.scale,
          };

          // Check if touch is on any image
          const touchedImage = images.some((img) => {
            return (
              canvasPos.x >= img.x &&
              canvasPos.x <= img.x + img.width &&
              canvasPos.y >= img.y &&
              canvasPos.y <= img.y + img.height
            );
          });

          setIsTouchingImage(touchedImage);
        }
      }

      setLastTouchCenter(touch);
    }
  };

  const handleTouchMove = (e: any) => {
    const touches = e.evt.touches;

    if (touches.length === 2 && lastTouchDistance && lastTouchCenter) {
      // Two fingers - handle pinch-to-zoom
      e.evt.preventDefault();

      const touch1 = { x: touches[0].clientX, y: touches[0].clientY };
      const touch2 = { x: touches[1].clientX, y: touches[1].clientY };

      const distance = Math.sqrt(
        Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2),
      );

      const center = {
        x: (touch1.x + touch2.x) / 2,
        y: (touch1.y + touch2.y) / 2,
      };

      // Calculate scale change
      const scaleFactor = distance / lastTouchDistance;
      const newScale = Math.max(0.1, Math.min(5, viewport.scale * scaleFactor));

      // Calculate new position to zoom towards pinch center
      const stage = stageRef.current;
      if (stage) {
        const stageBox = stage.container().getBoundingClientRect();
        const stageCenter = {
          x: center.x - stageBox.left,
          y: center.y - stageBox.top,
        };

        const mousePointTo = {
          x: (stageCenter.x - viewport.x) / viewport.scale,
          y: (stageCenter.y - viewport.y) / viewport.scale,
        };

        const newPos = {
          x: stageCenter.x - mousePointTo.x * newScale,
          y: stageCenter.y - mousePointTo.y * newScale,
        };

        setViewport({ x: newPos.x, y: newPos.y, scale: newScale });
      }

      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    } else if (
      touches.length === 1 &&
      lastTouchCenter &&
      !isSelecting &&
      !isDraggingImage &&
      !isTouchingImage
    ) {
      // Single finger - handle pan (only if not selecting, dragging, or touching an image)
      // Don't prevent default if there might be system dialogs open
      const hasActiveFileInput = document.querySelector('input[type="file"]');
      if (!hasActiveFileInput) {
        e.evt.preventDefault();
      }

      const touch = { x: touches[0].clientX, y: touches[0].clientY };
      const deltaX = touch.x - lastTouchCenter.x;
      const deltaY = touch.y - lastTouchCenter.y;

      setViewport((prev) => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setLastTouchCenter(touch);
    }
  };

  const handleTouchEnd = (e: any) => {
    setLastTouchDistance(null);
    setLastTouchCenter(null);
    setIsTouchingImage(false);
  };

  // Handle selection
  const handleSelect = (id: string, e: any) => {
    if (e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
      );
    } else {
      setSelectedIds([id]);
    }
  };

  // Handle drag selection and panning
  const handleMouseDown = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    const stage = e.target.getStage();
    const mouseButton = e.evt.button; // 0 = left, 1 = middle, 2 = right

    // If middle mouse button, start panning
    if (mouseButton === 1) {
      e.evt.preventDefault();
      setIsPanningCanvas(true);
      setLastPanPosition({ x: e.evt.clientX, y: e.evt.clientY });
      return;
    }

    // If in crop mode and clicked outside, exit crop mode
    if (croppingImageId) {
      const clickedNode = e.target;
      const cropGroup = clickedNode.findAncestor((node: any) => {
        return node.attrs && node.attrs.name === "crop-overlay";
      });

      if (!cropGroup) {
        setCroppingImageId(null);
        return;
      }
    }

    // Start selection box when left-clicking on empty space
    if (clickedOnEmpty && !croppingImageId && mouseButton === 0) {
      const pos = stage.getPointerPosition();
      if (pos) {
        // Convert screen coordinates to canvas coordinates
        const canvasPos = {
          x: (pos.x - viewport.x) / viewport.scale,
          y: (pos.y - viewport.y) / viewport.scale,
        };

        setIsSelecting(true);
        setSelectionBox({
          startX: canvasPos.x,
          startY: canvasPos.y,
          endX: canvasPos.x,
          endY: canvasPos.y,
          visible: true,
        });
        setSelectedIds([]);
      }
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();

    // Handle canvas panning with middle mouse
    if (isPanningCanvas) {
      const deltaX = e.evt.clientX - lastPanPosition.x;
      const deltaY = e.evt.clientY - lastPanPosition.y;

      setViewport((prev) => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setLastPanPosition({ x: e.evt.clientX, y: e.evt.clientY });
      return;
    }

    // Handle selection
    if (!isSelecting) return;

    const pos = stage.getPointerPosition();
    if (pos) {
      // Convert screen coordinates to canvas coordinates
      const canvasPos = {
        x: (pos.x - viewport.x) / viewport.scale,
        y: (pos.y - viewport.y) / viewport.scale,
      };

      setSelectionBox((prev) => ({
        ...prev,
        endX: canvasPos.x,
        endY: canvasPos.y,
      }));
    }
  };

  const handleMouseUp = (e: any) => {
    // Stop canvas panning
    if (isPanningCanvas) {
      setIsPanningCanvas(false);
      return;
    }

    if (!isSelecting) return;

    // Calculate which images are in the selection box
    const box = {
      x: Math.min(selectionBox.startX, selectionBox.endX),
      y: Math.min(selectionBox.startY, selectionBox.endY),
      width: Math.abs(selectionBox.endX - selectionBox.startX),
      height: Math.abs(selectionBox.endY - selectionBox.startY),
    };

    // Only select if the box has some size
    if (box.width > 5 || box.height > 5) {
      const selected = images.filter((img) => {
        // Check if image intersects with selection box
        return !(
          img.x + img.width < box.x ||
          img.x > box.x + box.width ||
          img.y + img.height < box.y ||
          img.y > box.y + box.height
        );
      });

      if (selected.length > 0) {
        setSelectedIds(selected.map((img) => img.id));
      }
    }

    setIsSelecting(false);
    setSelectionBox({ ...selectionBox, visible: false });
  };

  // Note: Overlapping detection has been removed in favor of explicit "Combine Images" action
  // Users can now manually combine images via the context menu before running generation

  // Handle context menu actions
  const handleRun = async () => {
    await handleRunHandler({
      images,
      selectedIds,
      generationSettings,
      customApiKey,
      canvasSize,
      viewport,
      falClient,
      setImages,
      setSelectedIds,
      setActiveGenerations,
      setIsGenerating,
      setIsApiKeyDialogOpen,
      toast,
      generateTextToImage,
    });
  };

  const handleDelete = () => {
    // Save to history before deleting
    saveToHistory();
    setImages((prev) => prev.filter((img) => !selectedIds.includes(img.id)));
    setSelectedIds([]);
  };

  const handleDuplicate = () => {
    // Save to history before duplicating
    saveToHistory();
    const selectedImages = images.filter((img) => selectedIds.includes(img.id));
    const newImages = selectedImages.map((img) => ({
      ...img,
      id: `img-${Date.now()}-${Math.random()}`,
      x: img.x + 20,
      y: img.y + 20,
    }));
    setImages((prev) => [...prev, ...newImages]);
    setSelectedIds(newImages.map((img) => img.id));
  };

  const handleRemoveBackground = async () => {
    await handleRemoveBackgroundHandler({
      images,
      selectedIds,
      setImages,
      toast,
      saveToHistory,
      removeBackground,
      customApiKey,
      falClient,
      setIsApiKeyDialogOpen,
    });
  };

  const sendToFront = useCallback(() => {
    if (selectedIds.length === 0) return;

    saveToHistory();
    setImages((prev) => {
      // Get selected images in their current order
      const selectedImages = selectedIds
        .map((id) => prev.find((img) => img.id === id))
        .filter(Boolean) as PlacedImage[];

      // Get remaining images
      const remainingImages = prev.filter(
        (img) => !selectedIds.includes(img.id),
      );

      // Place selected images at the end (top layer)
      return [...remainingImages, ...selectedImages];
    });
  }, [selectedIds, saveToHistory]);

  const sendToBack = useCallback(() => {
    if (selectedIds.length === 0) return;

    saveToHistory();
    setImages((prev) => {
      // Get selected images in their current order
      const selectedImages = selectedIds
        .map((id) => prev.find((img) => img.id === id))
        .filter(Boolean) as PlacedImage[];

      // Get remaining images
      const remainingImages = prev.filter(
        (img) => !selectedIds.includes(img.id),
      );

      // Place selected images at the beginning (bottom layer)
      return [...selectedImages, ...remainingImages];
    });
  }, [selectedIds, saveToHistory]);

  const bringForward = useCallback(() => {
    if (selectedIds.length === 0) return;

    saveToHistory();
    setImages((prev) => {
      const result = [...prev];

      // Process selected images from back to front to maintain relative order
      for (let i = result.length - 2; i >= 0; i--) {
        if (
          selectedIds.includes(result[i].id) &&
          !selectedIds.includes(result[i + 1].id)
        ) {
          // Swap with the next image if it's not also selected
          [result[i], result[i + 1]] = [result[i + 1], result[i]];
        }
      }

      return result;
    });
  }, [selectedIds, saveToHistory]);

  const sendBackward = useCallback(() => {
    if (selectedIds.length === 0) return;

    saveToHistory();
    setImages((prev) => {
      const result = [...prev];

      // Process selected images from front to back to maintain relative order
      for (let i = 1; i < result.length; i++) {
        if (
          selectedIds.includes(result[i].id) &&
          !selectedIds.includes(result[i - 1].id)
        ) {
          // Swap with the previous image if it's not also selected
          [result[i], result[i - 1]] = [result[i - 1], result[i]];
        }
      }

      return result;
    });
  }, [selectedIds, saveToHistory]);

  const handleIsolate = async () => {
    if (!isolateTarget || !isolateInputValue.trim() || isIsolating) {
      return;
    }

    setIsIsolating(true);

    try {
      const image = images.find((img) => img.id === isolateTarget);
      if (!image) {
        setIsIsolating(false);
        return;
      }

      // Show loading state
      toast({
        title: "Processing...",
        description: `Isolating "${isolateInputValue}" from image`,
      });

      // Process the image to get the cropped/processed version
      const imgElement = new window.Image();
      imgElement.crossOrigin = "anonymous"; // Enable CORS
      imgElement.src = image.src;
      await new Promise((resolve) => {
        imgElement.onload = resolve;
      });

      // Create canvas for processing
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");

      // Get crop values
      const cropX = image.cropX || 0;
      const cropY = image.cropY || 0;
      const cropWidth = image.cropWidth || 1;
      const cropHeight = image.cropHeight || 1;

      // Set canvas size based on crop
      canvas.width = cropWidth * imgElement.naturalWidth;
      canvas.height = cropHeight * imgElement.naturalHeight;

      // Draw cropped image
      ctx.drawImage(
        imgElement,
        cropX * imgElement.naturalWidth,
        cropY * imgElement.naturalHeight,
        cropWidth * imgElement.naturalWidth,
        cropHeight * imgElement.naturalHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      // Convert to blob and upload
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/png");
      });

      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(blob);
      });

      // Upload the processed image
      const uploadResult = await uploadImageDirect(
        dataUrl,
        falClient,
        toast,
        setIsApiKeyDialogOpen,
      );

      // Isolate object using EVF-SAM2
      console.log("Calling isolateObject with:", {
        imageUrl: uploadResult?.url || "",
        textInput: isolateInputValue,
      });

      const result = await isolateObject({
        imageUrl: uploadResult?.url || "",
        textInput: isolateInputValue,
        apiKey: customApiKey || undefined,
      });

      console.log("IsolateObject result:", result);

      // Use the segmented image URL directly (backend already applied the mask)
      if (result.url) {
        console.log("Original image URL:", image.src);
        console.log("New isolated image URL:", result.url);
        console.log("Result object:", JSON.stringify(result, null, 2));

        // AUTO DOWNLOAD FOR DEBUGGING
        try {
          const link = document.createElement("a");
          link.href = result.url;
          link.download = `isolated-${isolateInputValue}-${Date.now()}.png`;
          link.target = "_blank"; // Open in new tab to see the image
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log("Auto-downloaded isolated image for debugging");
        } catch (e) {
          console.error("Failed to auto-download:", e);
        }

        // Force load the new image before updating state
        const testImg = new window.Image();
        testImg.crossOrigin = "anonymous";
        testImg.onload = () => {
          console.log(
            "New image loaded successfully:",
            testImg.width,
            "x",
            testImg.height,
          );

          // Create a test canvas to verify the image has transparency
          const testCanvas = document.createElement("canvas");
          testCanvas.width = testImg.width;
          testCanvas.height = testImg.height;
          const testCtx = testCanvas.getContext("2d");
          if (testCtx) {
            // Fill with red background
            testCtx.fillStyle = "red";
            testCtx.fillRect(0, 0, testCanvas.width, testCanvas.height);
            // Draw the image on top
            testCtx.drawImage(testImg, 0, 0);

            // Get a pixel from what should be transparent area (corner)
            const pixelData = testCtx.getImageData(0, 0, 1, 1).data;
            console.log("Corner pixel (should show red if transparent):", {
              r: pixelData[0],
              g: pixelData[1],
              b: pixelData[2],
              a: pixelData[3],
            });
          }

          // Update the image in place with the segmented image
          saveToHistory();

          // Create a completely new image URL with timestamp
          const newImageUrl = `${result.url}${result.url.includes("?") ? "&" : "?"}t=${Date.now()}&cache=no`;

          // Get the current image to preserve position
          const currentImage = images.find((img) => img.id === isolateTarget);
          if (!currentImage) {
            console.error("Could not find current image!");
            return;
          }

          // Create new image with isolated- prefix ID
          const newImage: PlacedImage = {
            ...currentImage,
            id: `isolated-${Date.now()}-${Math.random()}`,
            src: newImageUrl,
            // Remove crop values since we've applied them
            cropX: undefined,
            cropY: undefined,
            cropWidth: undefined,
            cropHeight: undefined,
          };

          setImages((prev) => {
            // Replace old image with new one at same index
            const newImages = [...prev];
            const index = newImages.findIndex(
              (img) => img.id === isolateTarget,
            );
            if (index !== -1) {
              newImages[index] = newImage;
            }
            return newImages;
          });

          // Update selection
          setSelectedIds([newImage.id]);

          toast({
            title: "Success",
            description: `Isolated "${isolateInputValue}" successfully`,
          });
        };

        testImg.onerror = (e) => {
          console.error("Failed to load new image:", e);
          toast({
            title: "Failed to load isolated image",
            description: "The isolated image could not be loaded",
            variant: "destructive",
          });
        };

        testImg.src = result.url;
      } else {
        toast({
          title: "No object found",
          description: `Could not find "${isolateInputValue}" in the image`,
          variant: "destructive",
        });
      }

      // Reset the isolate input
      setIsolateTarget(null);
      setIsolateInputValue("");
      setIsIsolating(false);
    } catch (error) {
      console.error("Error isolating object:", error);
      toast({
        title: "Failed to isolate object",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setIsolateTarget(null);
      setIsolateInputValue("");
      setIsIsolating(false);
    }
  };

  const handleCombineImages = async () => {
    if (selectedIds.length < 2) return;

    // Save to history before combining
    saveToHistory();

    // Get selected images and sort by layer order
    const selectedImages = selectedIds
      .map((id) => images.find((img) => img.id === id))
      .filter((img) => img !== undefined) as PlacedImage[];

    const sortedImages = [...selectedImages].sort((a, b) => {
      const indexA = images.findIndex((img) => img.id === a.id);
      const indexB = images.findIndex((img) => img.id === b.id);
      return indexA - indexB;
    });

    // Load all images to calculate scale factors
    const imageElements: {
      img: PlacedImage;
      element: HTMLImageElement;
      scale: number;
    }[] = [];
    let maxScale = 1;

    for (const img of sortedImages) {
      const imgElement = new window.Image();
      imgElement.crossOrigin = "anonymous"; // Enable CORS
      imgElement.src = img.src;
      await new Promise((resolve) => {
        imgElement.onload = resolve;
      });

      // Calculate scale factor (original size / display size)
      // Account for crops if they exist
      const effectiveWidth = img.cropWidth
        ? imgElement.naturalWidth * img.cropWidth
        : imgElement.naturalWidth;
      const effectiveHeight = img.cropHeight
        ? imgElement.naturalHeight * img.cropHeight
        : imgElement.naturalHeight;

      const scaleX = effectiveWidth / img.width;
      const scaleY = effectiveHeight / img.height;
      const scale = Math.min(scaleX, scaleY); // Use min to maintain aspect ratio

      maxScale = Math.max(maxScale, scale);
      imageElements.push({ img, element: imgElement, scale });
    }

    // Use a reasonable scale - not too large to avoid memory issues
    const optimalScale = Math.min(maxScale, 4); // Cap at 4x to prevent huge images

    // Calculate bounding box of all selected images
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    sortedImages.forEach((img) => {
      minX = Math.min(minX, img.x);
      minY = Math.min(minY, img.y);
      maxX = Math.max(maxX, img.x + img.width);
      maxY = Math.max(maxY, img.y + img.height);
    });

    const combinedWidth = maxX - minX;
    const combinedHeight = maxY - minY;

    // Create canvas at higher resolution
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get canvas context");
      return;
    }

    canvas.width = Math.round(combinedWidth * optimalScale);
    canvas.height = Math.round(combinedHeight * optimalScale);

    console.log(
      `Creating combined image at ${canvas.width}x${canvas.height} (scale: ${optimalScale.toFixed(2)}x)`,
    );

    // Draw each image in order using the pre-loaded elements
    for (const { img, element: imgElement } of imageElements) {
      // Calculate position relative to the combined canvas, scaled up
      const relX = (img.x - minX) * optimalScale;
      const relY = (img.y - minY) * optimalScale;
      const scaledWidth = img.width * optimalScale;
      const scaledHeight = img.height * optimalScale;

      ctx.save();

      // Handle rotation if needed
      if (img.rotation) {
        ctx.translate(relX + scaledWidth / 2, relY + scaledHeight / 2);
        ctx.rotate((img.rotation * Math.PI) / 180);
        ctx.drawImage(
          imgElement,
          -scaledWidth / 2,
          -scaledHeight / 2,
          scaledWidth,
          scaledHeight,
        );
      } else {
        // Handle cropping if exists
        if (
          img.cropX !== undefined &&
          img.cropY !== undefined &&
          img.cropWidth !== undefined &&
          img.cropHeight !== undefined
        ) {
          ctx.drawImage(
            imgElement,
            img.cropX * imgElement.naturalWidth,
            img.cropY * imgElement.naturalHeight,
            img.cropWidth * imgElement.naturalWidth,
            img.cropHeight * imgElement.naturalHeight,
            relX,
            relY,
            scaledWidth,
            scaledHeight,
          );
        } else {
          ctx.drawImage(
            imgElement,
            0,
            0,
            imgElement.naturalWidth,
            imgElement.naturalHeight,
            relX,
            relY,
            scaledWidth,
            scaledHeight,
          );
        }
      }

      ctx.restore();
    }

    // Convert to blob and create data URL
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), "image/png");
    });

    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(blob);
    });

    // Create new combined image
    const combinedImage: PlacedImage = {
      id: `combined-${Date.now()}-${Math.random()}`,
      src: dataUrl,
      x: minX,
      y: minY,
      width: combinedWidth,
      height: combinedHeight,
      rotation: 0,
    };

    // Remove the original images and add the combined one
    setImages((prev) => [
      ...prev.filter((img) => !selectedIds.includes(img.id)),
      combinedImage,
    ]);

    // Select the new combined image
    setSelectedIds([combinedImage.id]);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if target is an input element
      const isInputElement =
        e.target && (e.target as HTMLElement).matches("input, textarea");

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.metaKey || e.ctrlKey) &&
        ((e.key === "z" && e.shiftKey) || e.key === "y")
      ) {
        e.preventDefault();
        redo();
      }
      // Select all
      else if ((e.metaKey || e.ctrlKey) && e.key === "a" && !isInputElement) {
        e.preventDefault();
        setSelectedIds(images.map((img) => img.id));
      }
      // Delete
      else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !isInputElement
      ) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleDelete();
        }
      }
      // Duplicate
      else if ((e.metaKey || e.ctrlKey) && e.key === "d" && !isInputElement) {
        e.preventDefault();
        if (selectedIds.length > 0) {
          handleDuplicate();
        }
      }
      // Run generation
      else if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "Enter" &&
        !isInputElement
      ) {
        e.preventDefault();
        if (!isGenerating && generationSettings.prompt.trim()) {
          handleRun();
        }
      }
      // Layer ordering shortcuts
      else if (e.key === "]" && !isInputElement) {
        e.preventDefault();
        if (selectedIds.length > 0) {
          if (e.metaKey || e.ctrlKey) {
            sendToFront();
          } else {
            bringForward();
          }
        }
      } else if (e.key === "[" && !isInputElement) {
        e.preventDefault();
        if (selectedIds.length > 0) {
          if (e.metaKey || e.ctrlKey) {
            sendToBack();
          } else {
            sendBackward();
          }
        }
      }
      // Escape to exit crop mode
      else if (e.key === "Escape" && croppingImageId) {
        e.preventDefault();
        setCroppingImageId(null);
      }
      // Zoom in
      else if ((e.key === "+" || e.key === "=") && !isInputElement) {
        e.preventDefault();
        const newScale = Math.min(5, viewport.scale * 1.2);
        const centerX = canvasSize.width / 2;
        const centerY = canvasSize.height / 2;

        const mousePointTo = {
          x: (centerX - viewport.x) / viewport.scale,
          y: (centerY - viewport.y) / viewport.scale,
        };

        setViewport({
          x: centerX - mousePointTo.x * newScale,
          y: centerY - mousePointTo.y * newScale,
          scale: newScale,
        });
      }
      // Zoom out
      else if (e.key === "-" && !isInputElement) {
        e.preventDefault();
        const newScale = Math.max(0.1, viewport.scale / 1.2);
        const centerX = canvasSize.width / 2;
        const centerY = canvasSize.height / 2;

        const mousePointTo = {
          x: (centerX - viewport.x) / viewport.scale,
          y: (centerY - viewport.y) / viewport.scale,
        };

        setViewport({
          x: centerX - mousePointTo.x * newScale,
          y: centerY - mousePointTo.y * newScale,
          scale: newScale,
        });
      }
      // Reset zoom
      else if (e.key === "0" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setViewport({ x: 0, y: 0, scale: 1 });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Currently no key up handlers needed
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    selectedIds,
    images,
    generationSettings,
    undo,
    redo,
    handleDelete,
    handleDuplicate,
    handleRun,
    croppingImageId,
    viewport,
    canvasSize,
    sendToFront,
    sendToBack,
    bringForward,
    sendBackward,
  ]);

  return (
    <div
      className="bg-background text-foreground font-focal relative flex flex-col w-full overflow-hidden h-screen"
      style={{ height: "100dvh" }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => e.preventDefault()}
      onDragLeave={(e) => e.preventDefault()}
    >
      {/* Render streaming components for active generations */}
      {Array.from(activeGenerations.entries()).map(([imageId, generation]) => (
        <StreamingImage
          key={imageId}
          imageId={imageId}
          generation={generation}
          apiKey={customApiKey}
          onStreamingUpdate={(id, url) => {
            setImages((prev) =>
              prev.map((img) => (img.id === id ? { ...img, src: url } : img)),
            );
          }}
          onComplete={(id, finalUrl) => {
            setImages((prev) =>
              prev.map((img) =>
                img.id === id ? { ...img, src: finalUrl } : img,
              ),
            );
            setActiveGenerations((prev) => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
            setIsGenerating(false);

            // Immediately save after generation completes
            setTimeout(() => {
              saveToStorage();
            }, 100); // Small delay to ensure state updates are processed
          }}
          onError={(id, error) => {
            console.error(`Generation error for ${id}:`, error);
            // Remove the failed image
            setImages((prev) => prev.filter((img) => img.id !== id));
            setActiveGenerations((prev) => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
            setIsGenerating(false);
            toast({
              title: "Generation failed",
              description: error.toString(),
              variant: "destructive",
            });
          }}
        />
      ))}

      {/* Main content */}
      <main className="flex-1 relative flex items-center justify-center w-full">
        <div className="relative w-full h-full">
          {/* Gradient Overlays */}
          <div
            className="pointer-events-none absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background to-transparent z-10"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute top-0 bottom-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10"
            aria-hidden="true"
          />
          <ContextMenu
            onOpenChange={(open) => {
              if (!open) {
                // Reset isolate state when context menu closes
                setIsolateTarget(null);
                setIsolateInputValue("");
              }
            }}
          >
            <ContextMenuTrigger asChild>
              <div
                className="relative bg-white overflow-hidden w-full h-full"
                style={{
                  minHeight: `${canvasSize.height}px`,
                  minWidth: `${canvasSize.width}px`,
                  cursor: isPanningCanvas ? "grabbing" : "default",
                  touchAction: "none", // Allow override for specific elements
                }}
              >
                {isCanvasReady && (
                  <Stage
                    ref={stageRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    x={viewport.x}
                    y={viewport.y}
                    scaleX={viewport.scale}
                    scaleY={viewport.scale}
                    draggable={false}
                    onDragStart={(e) => {
                      e.evt?.preventDefault();
                    }}
                    onDragEnd={(e) => {
                      e.evt?.preventDefault();
                    }}
                    onMouseDown={handleMouseDown}
                    onMousemove={handleMouseMove}
                    onMouseup={handleMouseUp}
                    onMouseLeave={() => {
                      // Stop panning if mouse leaves the stage
                      if (isPanningCanvas) {
                        setIsPanningCanvas(false);
                      }
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onContextMenu={(e) => {
                      // Get clicked position
                      const stage = e.target.getStage();
                      if (!stage) return;

                      const point = stage.getPointerPosition();
                      if (!point) return;

                      // Convert to canvas coordinates
                      const canvasPoint = {
                        x: (point.x - viewport.x) / viewport.scale,
                        y: (point.y - viewport.y) / viewport.scale,
                      };

                      // Check if we clicked on an image (check in reverse order for top-most image)
                      const clickedImage = [...images].reverse().find((img) => {
                        // Simple bounding box check
                        // TODO: Could be improved to handle rotation
                        return (
                          canvasPoint.x >= img.x &&
                          canvasPoint.x <= img.x + img.width &&
                          canvasPoint.y >= img.y &&
                          canvasPoint.y <= img.y + img.height
                        );
                      });

                      if (clickedImage) {
                        if (!selectedIds.includes(clickedImage.id)) {
                          // If clicking on unselected image, select only that image
                          setSelectedIds([clickedImage.id]);
                        }
                        // If already selected, keep current selection for multi-select context menu
                      }
                    }}
                    onWheel={handleWheel}
                  >
                    <Layer>
                      {/* Grid background */}
                      <CanvasGrid viewport={viewport} canvasSize={canvasSize} />

                      {/* Selection box */}
                      <SelectionBoxComponent selectionBox={selectionBox} />

                      {/* Render images */}
                      {images
                        .filter((image) => {
                          // Performance optimization: only render visible images
                          const buffer = 100; // pixels buffer
                          const viewBounds = {
                            left: -viewport.x / viewport.scale - buffer,
                            top: -viewport.y / viewport.scale - buffer,
                            right:
                              (canvasSize.width - viewport.x) / viewport.scale +
                              buffer,
                            bottom:
                              (canvasSize.height - viewport.y) /
                                viewport.scale +
                              buffer,
                          };

                          return !(
                            image.x + image.width < viewBounds.left ||
                            image.x > viewBounds.right ||
                            image.y + image.height < viewBounds.top ||
                            image.y > viewBounds.bottom
                          );
                        })
                        .map((image) => (
                          <CanvasImage
                            key={image.id}
                            image={image}
                            isSelected={selectedIds.includes(image.id)}
                            onSelect={(e) => handleSelect(image.id, e)}
                            onChange={(newAttrs) => {
                              setImages((prev) =>
                                prev.map((img) =>
                                  img.id === image.id
                                    ? { ...img, ...newAttrs }
                                    : img,
                                ),
                              );
                            }}
                            onDoubleClick={() => {
                              setCroppingImageId(image.id);
                            }}
                            onDragStart={() => {
                              // If dragging a selected item in a multi-selection, keep the selection
                              // If dragging an unselected item, select only that item
                              let currentSelectedIds = selectedIds;
                              if (!selectedIds.includes(image.id)) {
                                currentSelectedIds = [image.id];
                                setSelectedIds(currentSelectedIds);
                              }

                              setIsDraggingImage(true);
                              // Save positions of all selected items
                              const positions = new Map<
                                string,
                                { x: number; y: number }
                              >();
                              currentSelectedIds.forEach((id) => {
                                const img = images.find((i) => i.id === id);
                                if (img) {
                                  positions.set(id, { x: img.x, y: img.y });
                                }
                              });
                              setDragStartPositions(positions);
                            }}
                            onDragEnd={() => {
                              setIsDraggingImage(false);
                              saveToHistory();
                              setDragStartPositions(new Map());
                            }}
                            selectedIds={selectedIds}
                            images={images}
                            setImages={setImages}
                            isDraggingImage={isDraggingImage}
                            isCroppingImage={croppingImageId === image.id}
                            dragStartPositions={dragStartPositions}
                          />
                        ))}

                      {/* Crop overlay */}
                      {croppingImageId &&
                        (() => {
                          const croppingImage = images.find(
                            (img) => img.id === croppingImageId,
                          );
                          if (!croppingImage) return null;

                          return (
                            <CropOverlayWrapper
                              image={croppingImage}
                              onCropChange={(crop) => {
                                setImages((prev) =>
                                  prev.map((img) =>
                                    img.id === croppingImageId
                                      ? { ...img, ...crop }
                                      : img,
                                  ),
                                );
                              }}
                              onCropEnd={async () => {
                                // Apply crop to image dimensions
                                if (croppingImage) {
                                  const cropWidth =
                                    croppingImage.cropWidth || 1;
                                  const cropHeight =
                                    croppingImage.cropHeight || 1;
                                  const cropX = croppingImage.cropX || 0;
                                  const cropY = croppingImage.cropY || 0;

                                  try {
                                    // Create the cropped image at full resolution
                                    const croppedImageSrc =
                                      await createCroppedImage(
                                        croppingImage.src,
                                        cropX,
                                        cropY,
                                        cropWidth,
                                        cropHeight,
                                      );

                                    setImages((prev) =>
                                      prev.map((img) =>
                                        img.id === croppingImageId
                                          ? {
                                              ...img,
                                              // Replace with cropped image
                                              src: croppedImageSrc,
                                              // Update position to the crop area's top-left
                                              x: img.x + cropX * img.width,
                                              y: img.y + cropY * img.height,
                                              // Update dimensions to match crop size
                                              width: cropWidth * img.width,
                                              height: cropHeight * img.height,
                                              // Remove crop values completely
                                              cropX: undefined,
                                              cropY: undefined,
                                              cropWidth: undefined,
                                              cropHeight: undefined,
                                            }
                                          : img,
                                      ),
                                    );
                                  } catch (error) {
                                    console.error(
                                      "Failed to create cropped image:",
                                      error,
                                    );
                                  }
                                }

                                setCroppingImageId(null);
                                saveToHistory();
                              }}
                            />
                          );
                        })()}
                    </Layer>
                  </Stage>
                )}
              </div>
            </ContextMenuTrigger>
            <CanvasContextMenu
              selectedIds={selectedIds}
              images={images}
              isGenerating={isGenerating}
              generationSettings={generationSettings}
              isolateInputValue={isolateInputValue}
              isIsolating={isIsolating}
              handleRun={handleRun}
              handleDuplicate={handleDuplicate}
              handleRemoveBackground={handleRemoveBackground}
              handleCombineImages={handleCombineImages}
              handleDelete={handleDelete}
              handleIsolate={handleIsolate}
              setCroppingImageId={setCroppingImageId}
              setIsolateInputValue={setIsolateInputValue}
              setIsolateTarget={setIsolateTarget}
              sendToFront={sendToFront}
              sendToBack={sendToBack}
              bringForward={bringForward}
              sendBackward={sendBackward}
            />
          </ContextMenu>

          <div className="absolute top-4 left-4 z-20 flex flex-col items-start gap-2">
            {/* Fal logo */}
            <div className="border bg-background/80 p-2 flex flex-row rounded gap-2 items-center">
              <Link
                href="https://fal.ai"
                target="_blank"
                className="block hover:opacity-80 transition-opacity"
              >
                <Logo className="h-8 w-16 text-foreground" />
              </Link>
            </div>

            {/* Mobile tool icons - animated based on selection */}
            <MobileToolbar
              selectedIds={selectedIds}
              images={images}
              isGenerating={isGenerating}
              generationSettings={generationSettings}
              handleRun={handleRun}
              handleDuplicate={handleDuplicate}
              handleRemoveBackground={handleRemoveBackground}
              handleCombineImages={handleCombineImages}
              handleDelete={handleDelete}
              setCroppingImageId={setCroppingImageId}
              sendToFront={sendToFront}
              sendToBack={sendToBack}
              bringForward={bringForward}
              sendBackward={sendBackward}
            />
          </div>

          <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-4 md:left-1/2 md:transform md:-translate-x-1/2 z-20 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:p-0 md:pb-0 md:max-w-[600px]">
            <div className="bg-card/95 backdrop-blur-sm border border-border rounded shadow">
              <div className="flex flex-col gap-3 px-3 md:px-6 py-2 md:py-3 relative">
                {/* Active generations indicator */}
                {activeGenerations.size > 0 && (
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-3 py-1 rounded text-sm font-medium flex items-center gap-2 ">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
                    <span>
                      Generating {activeGenerations.size} image
                      {activeGenerations.size > 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                {/* Action buttons row */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="h-8 w-8 p-0"
                    title="Undo"
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="h-8 w-8 p-0"
                    title="Redo"
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      if (
                        confirm("Clear all saved data? This cannot be undone.")
                      ) {
                        await canvasStorage.clearAll();
                        setImages([]);
                        setViewport({ x: 0, y: 0, scale: 1 });
                        toast({
                          title: "Storage cleared",
                          description: "All saved data has been removed",
                        });
                      }
                    }}
                    className="h-8 px-2 bg-destructive/10 border border-destructive/20 gap-1 text-destructive hover:bg-destructive/20"
                    title="Clear storage"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="text-xs">Clear</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsApiKeyDialogOpen(true)}
                    className={cn(
                      "h-8 px-3 gap-2",
                      customApiKey &&
                        "border-green-500/50 bg-green-500/10 hover:border-green-500/70 hover:bg-green-500/20",
                    )}
                    title={
                      customApiKey
                        ? "Using custom API key"
                        : "Add your FAL API key"
                    }
                  >
                    <Key
                      className={cn(
                        "h-4 w-4",
                        customApiKey && "text-green-500",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm",
                        customApiKey && "text-green-500",
                      )}
                    >
                      {customApiKey ? "Custom Key" : "API Key"}
                    </span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      // Create file input with better mobile support
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.multiple = true;

                      // Add to DOM for mobile compatibility
                      input.style.position = "fixed";
                      input.style.top = "-1000px";
                      input.style.left = "-1000px";
                      input.style.opacity = "0";
                      input.style.pointerEvents = "none";
                      input.style.width = "1px";
                      input.style.height = "1px";

                      // Add event handlers
                      input.onchange = (e) => {
                        try {
                          handleFileUpload(
                            (e.target as HTMLInputElement).files,
                          );
                        } catch (error) {
                          console.error("File upload error:", error);
                          toast({
                            title: "Upload failed",
                            description: "Failed to process selected files",
                            variant: "destructive",
                          });
                        } finally {
                          // Clean up
                          if (input.parentNode) {
                            document.body.removeChild(input);
                          }
                        }
                      };

                      input.onerror = () => {
                        console.error("File input error");
                        if (input.parentNode) {
                          document.body.removeChild(input);
                        }
                      };

                      // Add to DOM and trigger
                      document.body.appendChild(input);

                      // Use setTimeout to ensure the input is properly attached
                      setTimeout(() => {
                        try {
                          input.click();
                        } catch (error) {
                          console.error(
                            "Failed to trigger file dialog:",
                            error,
                          );
                          toast({
                            title: "Upload unavailable",
                            description:
                              "File upload is not available. Try using drag & drop instead.",
                            variant: "destructive",
                          });
                          if (input.parentNode) {
                            document.body.removeChild(input);
                          }
                        }
                      }, 10);

                      // Cleanup after timeout in case dialog was cancelled
                      setTimeout(() => {
                        if (input.parentNode) {
                          document.body.removeChild(input);
                        }
                      }, 30000); // 30 second cleanup
                    }}
                    className="h-8 px-3 gap-2"
                    title="Upload images"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Upload</span>
                  </Button>
                </div>

                <div className="relative">
                  <Textarea
                    value={generationSettings.prompt}
                    onChange={(e) =>
                      setGenerationSettings({
                        ...generationSettings,
                        prompt: e.target.value,
                      })
                    }
                    placeholder={`Enter a prompt... (${checkOS("Win") || checkOS("Linux") ? "Ctrl" : "⌘"}+Enter to run)`}
                    className="w-full h-20 resize-none bg-background/50 pr-36"
                    style={{ fontSize: "16px" }}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        if (!isGenerating && generationSettings.prompt.trim()) {
                          handleRun();
                        }
                      }
                    }}
                  />

                  {selectedIds.length > 0 && (
                    <div className="absolute top-1 right-2 flex items-center justify-end">
                      <div className="relative h-12 w-20">
                        {selectedIds.slice(0, 3).map((id, index) => {
                          const image = images.find((img) => img.id === id);
                          if (!image) return null;

                          const isLast =
                            index === Math.min(selectedIds.length - 1, 2);
                          const offset = index * 8;
                          // Make each card progressively smaller
                          const size = 40 - index * 4;
                          const topOffset = index * 2; // Offset from top to maintain visual alignment

                          return (
                            <div
                              key={id}
                              className="absolute rounded border bg-background overflow-hidden"
                              style={{
                                right: `${offset}px`,
                                top: `${topOffset}px`,
                                zIndex: 3 - index,
                                width: `${size}px`,
                                height: `${size}px`,
                              }}
                            >
                              <img
                                src={image.src}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                              {/* Show count on last visible card if more than 3 selected */}
                              {isLast && selectedIds.length > 3 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="text-white text-xs font-medium">
                                    +{selectedIds.length - 3}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mode indicator badge */}
                  <div className="absolute bottom-2 right-2 text-[10px] font-medium pointer-events-none">
                    {selectedIds.length > 0 ? (
                      <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-600 px-2 py-1 rounded-sm border border-blue-500/20">
                        <ImageIcon className="w-3 h-3" />
                        <span>Image to Image</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-600 px-2 py-1 rounded-sm border border-orange-500/20">
                        <span className="font-bold">T</span>
                        <span>Text to Image</span>
                      </div>
                    )}
                  </div>
                </div>

                {generationSettings.styleId === "custom" && (
                  <Input
                    value={generationSettings.loraUrl}
                    onChange={(e) =>
                      setGenerationSettings({
                        ...generationSettings,
                        loraUrl: e.target.value,
                      })
                    }
                    placeholder="Kontext LoRA URL (optional)"
                    className="w-full bg-background/50"
                    style={{ fontSize: "16px" }}
                  />
                )}

                {/* Style dropdown and Run button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Left side - Style selector button */}
                    <Button
                      variant="secondary"
                      className="flex items-center gap-2"
                      onClick={() => setIsStyleDialogOpen(true)}
                    >
                      {(() => {
                        if (generationSettings.styleId === "custom") {
                          return (
                            <>
                              <div className="w-5 h-5 rounded flex items-center justify-center">
                                <Plus className="h-3 w-3" />
                              </div>
                              <span className="text-sm">Custom</span>
                            </>
                          );
                        }
                        const selectedModel =
                          styleModels.find(
                            (m) => m.id === generationSettings.styleId,
                          ) || styleModels.find((m) => m.id === "simpsons");
                        return (
                          <>
                            <img
                              src={selectedModel?.imageSrc}
                              alt={selectedModel?.name}
                              className="w-5 h-5 rounded object-cover"
                            />
                            <span className="text-sm">
                              {selectedModel?.name || "Simpsons Style"}
                            </span>
                          </>
                        );
                      })()}
                      <ChevronDown className="h-4 w-4" />
                    </Button>

                    {/* Right side - Run button */}
                    <Button
                      onClick={handleRun}
                      variant="primary"
                      disabled={
                        isGenerating || !generationSettings.prompt.trim()
                      }
                      className="gap-2 font-medium transition-all"
                    >
                      {isGenerating ? (
                        <>
                          <SpinnerIcon className="h-4 w-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>Run</span>
                          <ShortcutBadge
                            variant="alpha"
                            size="xs"
                            shortcut={
                              checkOS("Win") || checkOS("Linux")
                                ? "ctrl+enter"
                                : "meta+enter"
                            }
                          />
                        </div>
                      )}
                    </Button>
                  </div>

                  {/* GitHub button */}
                  <Link
                    className={cn(
                      buttonVariants({
                        variant: "secondary",
                        className: "gap-2",
                        size: "sm",
                      }),
                      "hidden xl:flex",
                    )}
                    href={"https://github.com/fal-ai-community/infinite-kanvas"}
                    target="_blank"
                    title="Star on GitHub"
                  >
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    Star on GitHub
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Mini-map */}
          <MiniMap
            images={images}
            viewport={viewport}
            canvasSize={canvasSize}
          />

          {/* {isSaving && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-background/95 border rounded-md px-3 py-2 flex items-center gap-2 shadow-sm">
              <SpinnerIcon className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Saving...</span>
            </div>
          )} */}

          {/* Zoom controls */}
          <ZoomControls
            viewport={viewport}
            setViewport={setViewport}
            canvasSize={canvasSize}
          />
        </div>
      </main>

      {/* Style Selection Dialog */}
      <Dialog open={isStyleDialogOpen} onOpenChange={setIsStyleDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Choose a Style</DialogTitle>
            <DialogDescription>
              Select a style to apply to your images or choose Custom to use
              your own LoRA
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            {/* Fixed gradient overlays outside scrollable area */}
            <div className="pointer-events-none absolute -top-[1px] left-0 right-0 z-30 h-4 md:h-12 bg-gradient-to-b from-background via-background/90 to-transparent" />
            <div className="pointer-events-none absolute -bottom-[1px] left-0 right-0 z-30 h-4 md:h-12 bg-gradient-to-t from-background via-background/90 to-transparent" />

            {/* Scrollable content container */}
            <div className="overflow-y-auto max-h-[60vh] px-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-4 pb-6 md:pt-8 md:pb-12">
                {/* Custom option */}
                <button
                  onClick={() => {
                    setGenerationSettings({
                      ...generationSettings,
                      loraUrl: "",
                      prompt: "",
                      styleId: "custom",
                    });
                    setIsStyleDialogOpen(false);
                  }}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 p-3 rounded border",
                    generationSettings.styleId === "custom"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="w-full aspect-square rounded-md bg-muted flex items-center justify-center">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">Custom</span>
                </button>

                {/* Predefined styles */}
                {styleModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setGenerationSettings({
                        ...generationSettings,
                        loraUrl: model.loraUrl || "",
                        prompt: model.prompt,
                        styleId: model.id,
                      });
                      setIsStyleDialogOpen(false);
                    }}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 p-3 rounded border",
                      generationSettings.styleId === model.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <div className="relative w-full aspect-square rounded-md overflow-hidden">
                      <Image
                        src={model.imageSrc}
                        alt={model.name}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                      {generationSettings.styleId === model.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"></div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-center">
                      {model.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>FAL API Key</DialogTitle>
            <DialogDescription>
              Add your own FAL API key to bypass rate limits and use your own
              quota.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your API key"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="font-mono"
                style={{ fontSize: "16px" }}
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <Link
                  href="https://fal.ai/dashboard/keys"
                  target="_blank"
                  className="underline hover:text-foreground"
                >
                  fal.ai/dashboard/keys
                </Link>
              </p>
            </div>

            {customApiKey && (
              <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>Currently using custom API key</span>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setCustomApiKey("");
                  setTempApiKey("");
                  setIsApiKeyDialogOpen(false);
                  toast({
                    title: "API key removed",
                    description: "Using default rate-limited API",
                  });
                }}
                disabled={!customApiKey}
              >
                Remove Key
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTempApiKey(customApiKey);
                    setIsApiKeyDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const trimmedKey = tempApiKey.trim();
                    if (trimmedKey) {
                      setCustomApiKey(trimmedKey);
                      setIsApiKeyDialogOpen(false);
                      toast({
                        title: "API key saved",
                        description: "Your custom API key is now active",
                      });
                    } else if (trimmedKey) {
                      toast({
                        title: "Invalid API key",
                        description: "FAL API keys should start with 'fal_'",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={!tempApiKey.trim()}
                >
                  Save Key
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
