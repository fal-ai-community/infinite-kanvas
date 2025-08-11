import React, { useEffect, useRef } from "react";
import { VideoControls } from "./VideoControls";
import type { PlacedVideo } from "@/types/canvas";

interface VideoOverlaysProps {
  videos: PlacedVideo[];
  selectedIds: string[];
  viewport: {
    x: number;
    y: number;
    scale: number;
  };
  hiddenVideoControlsIds: Set<string>;
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
}

export const VideoOverlays: React.FC<VideoOverlaysProps> = ({
  videos,
  selectedIds,
  viewport,
  hiddenVideoControlsIds,
  setVideos,
}) => {
  // Keep track of video refs
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Handle play/pause state changes
  useEffect(() => {
    videos.forEach((video) => {
      const videoEl = videoRefs.current.get(video.id);
      if (!videoEl) return;

      // Handle play/pause - only if state doesn't match
      if (video.isPlaying && videoEl.paused) {
        videoEl.play().catch(() => {});
      } else if (!video.isPlaying && !videoEl.paused) {
        videoEl.pause();
      }

      // Only update properties if they've changed
      if (videoEl.volume !== video.volume) {
        videoEl.volume = video.volume;
      }
      if (videoEl.muted !== video.muted) {
        videoEl.muted = video.muted;
      }
      if (videoEl.loop !== (video.isLooping || false)) {
        videoEl.loop = video.isLooping || false;
      }
    });
  }, [videos]);

  return (
    <>
      {videos.map((video) => (
        <React.Fragment key={`controls-${video.id}`}>
          {/* Actual HTML video element overlaid on canvas */}
          <video
            key={`video-${video.id}`}
            id={`video-${video.id}`}
            src={video.src}
            style={{
              position: "absolute",
              top: video.y * viewport.scale + viewport.y,
              left: video.x * viewport.scale + viewport.x,
              width: video.width * viewport.scale,
              height: video.height * viewport.scale,
              zIndex: 10,
              objectFit: "cover",
              pointerEvents: selectedIds.includes(video.id) ? "auto" : "none",
              border: selectedIds.includes(video.id)
                ? "1px solid #3b82f6"
                : "none",
              transform: `rotate(${video.rotation || 0}deg)`,
              transformOrigin: "center",
            }}
            autoPlay={false}
            loop={video.isLooping}
            muted={video.muted}
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            ref={(el) => {
              if (el) {
                videoRefs.current.set(video.id, el);
              } else {
                videoRefs.current.delete(video.id);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();

              // First, select the video if not already selected
              if (!selectedIds.includes(video.id)) {
                setVideos((prev) => {
                  // This is a hack to trigger a re-render and selection update
                  // We need to find a better way to update selectedIds from here
                  return prev;
                });
              }

              // Find the Konva stage and trigger a contextmenu event at this position
              const konvaContainer = document.querySelector(".konvajs-content");
              if (konvaContainer) {
                const canvas = konvaContainer.querySelector("canvas");
                if (canvas) {
                  // Calculate the position relative to the canvas
                  const rect = canvas.getBoundingClientRect();

                  // Create a synthetic event that mimics a right-click on the Konva canvas
                  const event = new MouseEvent("contextmenu", {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    screenX: e.screenX,
                    screenY: e.screenY,
                    button: 2,
                    buttons: 2,
                  });

                  // Attach the video ID to the event so the parent can handle selection
                  (event as any).videoId = video.id;

                  // Dispatch to the canvas
                  canvas.dispatchEvent(event);
                }
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Toggle play/pause on click
              const videoEl = e.currentTarget;
              if (videoEl.paused) {
                videoEl.play();
                setVideos((prev) =>
                  prev.map((vid) =>
                    vid.id === video.id ? { ...vid, isPlaying: true } : vid,
                  ),
                );
              } else {
                videoEl.pause();
                setVideos((prev) =>
                  prev.map((vid) =>
                    vid.id === video.id ? { ...vid, isPlaying: false } : vid,
                  ),
                );
              }
            }}
            onTimeUpdate={(e) => {
              const videoEl = e.currentTarget;
              // Update more frequently for smooth seek bar, but throttle to 10 times per second
              if (!videoEl.paused) {
                const currentTenthSecond = Math.floor(videoEl.currentTime * 10);
                const storedTenthSecond = Math.floor(video.currentTime * 10);

                if (currentTenthSecond !== storedTenthSecond) {
                  setVideos((prev) =>
                    prev.map((vid) =>
                      vid.id === video.id
                        ? { ...vid, currentTime: videoEl.currentTime }
                        : vid,
                    ),
                  );
                }
              }
            }}
            onLoadedMetadata={(e) => {
              const videoEl = e.currentTarget;
              setVideos((prev) =>
                prev.map((vid) =>
                  vid.id === video.id
                    ? { ...vid, duration: videoEl.duration, isLoaded: true }
                    : vid,
                ),
              );
            }}
            onEnded={() => {
              if (!video.isLooping) {
                setVideos((prev) =>
                  prev.map((vid) =>
                    vid.id === video.id
                      ? { ...vid, isPlaying: false, currentTime: 0 }
                      : vid,
                  ),
                );
              }
            }}
          />

          {/* Video playback indicator - only visible when loaded and not playing */}
          {!video.isPlaying && video.isLoaded && (
            <div
              className="absolute bg-none text-white px-1 py-0.5"
              style={{
                position: "absolute",
                top: video.y * viewport.scale + viewport.y + 5 * viewport.scale,
                left:
                  video.x * viewport.scale + viewport.x + 5 * viewport.scale,
                zIndex: 10,
                pointerEvents: "none",
                visibility: video.isLoaded ? "visible" : "hidden",
                display: video.isLoaded ? "block" : "none",
                opacity: hiddenVideoControlsIds.has(video.id) ? 0 : 1,
                transition: "opacity 0.05s ease-in-out",
                // Non-linear scaling with min/max bounds for better visibility
                fontSize: `${Math.max(10, Math.min(20, 20 * Math.sqrt(viewport.scale)))}px`,
              }}
            >
              ▶
            </div>
          )}

          {/* Video controls - shown when video is selected */}
          {selectedIds.includes(video.id) && selectedIds.length === 1 && (
            <div
              style={{
                position: "absolute",
                top:
                  (video.y + video.height) * viewport.scale + viewport.y + 10,
                left: video.x * viewport.scale + viewport.x,
                zIndex: 10,
                width: Math.max(video.width * viewport.scale, 180),
                opacity: hiddenVideoControlsIds.has(video.id) ? 0 : 1,
                transition: "opacity 0.05s ease-in-out",
              }}
            >
              <VideoControls
                video={video}
                onChange={(newAttrs) => {
                  setVideos((prev) =>
                    prev.map((vid) =>
                      vid.id === video.id ? { ...vid, ...newAttrs } : vid,
                    ),
                  );
                }}
                className="mt-2"
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </>
  );
};
