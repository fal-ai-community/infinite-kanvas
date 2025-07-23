import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Image as KonvaImage,
  Transformer,
  Group,
  Rect,
  Path,
} from "react-konva";
import Konva from "konva";
import type { PlacedVideo } from "@/types/canvas";
import { throttle } from "@/utils/performance";

interface CanvasVideoProps {
  video: PlacedVideo;
  isSelected: boolean;
  onSelect: (e: any) => void;
  onChange: (newAttrs: Partial<PlacedVideo>) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDoubleClick?: () => void;
  selectedIds: string[];
  videos: PlacedVideo[];
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
  isDraggingVideo: boolean;
  isCroppingVideo: boolean;
  dragStartPositions: Map<string, { x: number; y: number }>;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export const CanvasVideo: React.FC<CanvasVideoProps> = ({
  video,
  isSelected,
  onSelect,
  onChange,
  onDragStart,
  onDragEnd,
  onDoubleClick,
  selectedIds,
  // videos is used in the type definition but not in the component
  setVideos,
  // isDraggingVideo is not used but kept for API compatibility
  isCroppingVideo,
  dragStartPositions,
  onResizeStart,
  onResizeEnd,
}) => {
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggable, setIsDraggable] = useState(true);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );
  // isVideoLoaded is used to track when the video is ready but not directly referenced
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  // isResizing is used to track resize state for internal component logic
  const [isResizing, setIsResizing] = useState(false);
  const lastUpdateTime = useRef<number>(0);

  // Create and set up the video element when the component mounts or video src changes
  useEffect(() => {
    const videoEl = document.createElement("video");
    videoEl.src = video.src;
    videoEl.crossOrigin = "anonymous";
    videoEl.muted = video.muted;
    videoEl.volume = video.volume;
    videoEl.currentTime = video.currentTime;
    videoEl.loop = !!video.isLooping; // Set loop property based on video state

    // Performance optimizations
    videoEl.preload = "auto"; // Need auto to ensure first frame loads
    videoEl.playsInline = true; // Prevent fullscreen on mobile
    videoEl.disablePictureInPicture = true; // Prevent UI conflicts

    // Set up event listeners
    videoEl.addEventListener("loadedmetadata", () => {
      // Update duration if it's different from what we have stored
      if (videoEl.duration !== video.duration) {
        onChange({ duration: videoEl.duration });
      }
      // Ensure video starts at the beginning when not playing
      if (!video.isPlaying) {
        videoEl.currentTime = 0;
      }

      // Set a small delay before marking the video as loaded
      // This ensures the video is fully rendered before showing the indicator
      setTimeout(() => {
        setIsVideoLoaded(true);
        // Update the parent component with the loaded state
        onChange({ isLoaded: true });
      }, 500); // 500ms delay
    });

    videoEl.addEventListener("timeupdate", () => {
      // Only update if enough time has passed to avoid excessive updates
      const now = Date.now();
      if (now - lastUpdateTime.current > 100) {
        // 100ms throttle for smooth playback
        lastUpdateTime.current = now;
        onChange({ currentTime: videoEl.currentTime });
      }
    });

    videoEl.addEventListener("ended", () => {
      // If looping is enabled, the browser's native loop will handle it
      // Only update state if not looping
      if (!video.isLooping) {
        onChange({ isPlaying: false, currentTime: 0 });
      }
    });

    // Ensure video has loaded enough data to display
    videoEl.addEventListener("loadeddata", () => {
      // Force a re-render when video data is available
      setVideoElement(videoEl);
    });

    // Set the video element in state
    setVideoElement(videoEl);
    videoRef.current = videoEl;

    // Force the video to load
    videoEl.load();

    return () => {
      // Clean up event listeners and pause the video when unmounting
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();
    };
  }, [video.src]); // Remove debouncedTimeUpdate from deps

  // Handle play/pause state changes
  useEffect(() => {
    if (!videoElement) return;

    if (video.isPlaying) {
      videoElement.play().catch((error) => {
        console.error("Error playing video:", error);
        onChange({ isPlaying: false });
      });
    } else {
      videoElement.pause();
    }
  }, [video.isPlaying, videoElement]);

  // Handle volume changes
  useEffect(() => {
    if (!videoElement) return;
    videoElement.volume = video.volume;
    videoElement.muted = video.muted;
  }, [video.volume, video.muted, videoElement]);

  // Handle seeking
  useEffect(() => {
    if (!videoElement) return;

    // Only seek if the difference is significant to avoid loops
    // Increased threshold to prevent interference with playback
    if (Math.abs(videoElement.currentTime - video.currentTime) > 2) {
      videoElement.currentTime = video.currentTime;
    }
  }, [video.currentTime, videoElement]);

  // Handle loop property changes
  useEffect(() => {
    if (!videoElement) return;
    videoElement.loop = !!video.isLooping;
  }, [video.isLooping, videoElement]);

  // Note: Videos should continue playing even when not selected
  // This allows multiple videos to loop simultaneously on the canvas

  // Handle transformer
  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      // Only show transformer if this is the only selected item or if clicking on it
      if (selectedIds.length === 1) {
        trRef.current.nodes([shapeRef.current]);
        trRef.current.getLayer()?.batchDraw();
      } else {
        trRef.current.nodes([]);
      }
    }
  }, [isSelected, selectedIds.length]);

  // Determine what to display - always use the video element
  // When playing: shows current frame
  // When paused: shows first frame (currentTime = 0)
  let displayElement: CanvasImageSource | undefined = undefined;

  if (videoElement) {
    // Use the video element directly - it will show the first frame when paused
    displayElement = videoElement as unknown as CanvasImageSource;
  }

  // Handle keyboard shortcuts for video playback
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelected) return;

      // Don't handle shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      // Prevent default actions for these keys
      if (
        [
          "Space",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "m",
        ].includes(e.code)
      ) {
        e.preventDefault();
      }

      switch (e.code) {
        case "Space": // Play/pause
          onChange({ isPlaying: !video.isPlaying });
          break;
        case "ArrowLeft": // Seek backward
          onChange({
            currentTime: Math.max(0, video.currentTime - (e.shiftKey ? 10 : 5)),
          });
          break;
        case "ArrowRight": // Seek forward
          onChange({
            currentTime: Math.min(
              video.duration,
              video.currentTime + (e.shiftKey ? 10 : 5),
            ),
          });
          break;
        case "ArrowUp": // Volume up
          if (!video.muted) {
            onChange({ volume: Math.min(1, video.volume + 0.1) });
          }
          break;
        case "ArrowDown": // Volume down
          if (!video.muted) {
            onChange({ volume: Math.max(0, video.volume - 0.1) });
          }
          break;
        case "KeyM": // Mute/unmute
          onChange({ muted: !video.muted });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isSelected,
    video.isPlaying,
    video.currentTime,
    video.duration,
    video.volume,
    video.muted,
    onChange,
  ]);

  // Memoize the drag handler to avoid recreating it on every render
  const handleDragMove = useMemo(
    () =>
      throttle((e: any) => {
        const node = e.target;

        if (selectedIds.includes(video.id) && selectedIds.length > 1) {
          // Calculate delta from drag start position
          const startPos = dragStartPositions.get(video.id);
          if (startPos) {
            const deltaX = node.x() - startPos.x;
            const deltaY = node.y() - startPos.y;

            // Update all selected items relative to their start positions
            setVideos((prev) =>
              prev.map((vid) => {
                if (vid.id === video.id) {
                  return {
                    ...vid,
                    x: node.x(),
                    y: node.y(),
                    isVideo: true as const,
                  };
                } else if (selectedIds.includes(vid.id)) {
                  const vidStartPos = dragStartPositions.get(vid.id);
                  if (vidStartPos) {
                    return {
                      ...vid,
                      x: vidStartPos.x + deltaX,
                      y: vidStartPos.y + deltaY,
                      isVideo: true as const,
                    };
                  }
                }
                return vid;
              }),
            );
          }
        } else {
          // Single item drag - just update this video
          onChange({
            x: node.x(),
            y: node.y(),
          });
        }
      }, 16), // ~60fps throttle
    [selectedIds, video.id, dragStartPositions, setVideos, onChange],
  );

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={displayElement}
        x={video.x}
        y={video.y}
        width={video.width}
        height={video.height}
        rotation={video.rotation}
        crop={
          video.cropX !== undefined && !isCroppingVideo && videoElement
            ? {
                x: (video.cropX || 0) * videoElement.videoWidth,
                y: (video.cropY || 0) * videoElement.videoHeight,
                width: (video.cropWidth || 1) * videoElement.videoWidth,
                height: (video.cropHeight || 1) * videoElement.videoHeight,
              }
            : undefined
        }
        draggable={isDraggable}
        onClick={(e) => {
          // Prevent event propagation issues
          e.cancelBubble = true;
          onSelect(e);
          // Toggle play/pause on click if already selected
          // Use setTimeout to ensure selection state is updated first
          if (isSelected) {
            setTimeout(() => {
              onChange({ isPlaying: !video.isPlaying });
            }, 0);
          }
        }}
        onTap={onSelect}
        onDblClick={onDoubleClick}
        onDblTap={onDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={(e) => {
          // Only allow dragging with left mouse button (0)
          // Middle mouse (1) and right mouse (2) should not drag videos
          const isLeftButton = e.evt.button === 0;
          setIsDraggable(isLeftButton);

          // For middle mouse button, don't stop propagation
          // Let it bubble up to the stage for canvas panning
          if (e.evt.button === 1) {
            return;
          }
        }}
        onMouseUp={() => {
          // Re-enable dragging after mouse up
          setIsDraggable(true);
        }}
        onDragStart={(e) => {
          // Stop propagation to prevent stage from being dragged
          e.cancelBubble = true;
          // Auto-select on drag if not already selected
          if (!isSelected) {
            onSelect(e);
          }
          // Hide video controls during drag
          if (onResizeStart) {
            onResizeStart();
          }
          onDragStart();
        }}
        onDragMove={handleDragMove}
        onDragEnd={() => {
          onDragEnd();
        }}
        onTransformStart={() => {
          setIsResizing(true);
          if (onResizeStart) {
            onResizeStart();
          }
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (node) {
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();

            node.scaleX(1);
            node.scaleY(1);

            onChange({
              x: node.x(),
              y: node.y(),
              width: Math.max(5, node.width() * scaleX),
              height: Math.max(5, node.height() * scaleY),
              rotation: node.rotation(),
            });
          }
          setIsResizing(false);
          if (onResizeEnd) {
            onResizeEnd();
          }
          onDragEnd();
        }}
        opacity={video.isGenerating ? 0.9 : 1}
        stroke={isSelected ? "#3b82f6" : isHovered ? "#3b82f6" : "transparent"}
        strokeWidth={isSelected || isHovered ? 2 : 0}
      />

      {isSelected && selectedIds.length === 1 && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};
