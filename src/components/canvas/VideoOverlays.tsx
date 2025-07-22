import React from "react";
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
  return (
    <>
      {videos.map((video) => (
        <React.Fragment key={`controls-${video.id}`}>
          {/* Video playback indicator - only visible when loaded and not playing */}
          {!video.isPlaying && video.isLoaded && (
            <div
              className="absolute bg-none text-white px-1 py-0.5"
              style={{
                position: "absolute",
                top: video.y * viewport.scale + viewport.y + 5 * viewport.scale,
                left:
                  video.x * viewport.scale + viewport.x + 5 * viewport.scale,
                zIndex: 40,
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
