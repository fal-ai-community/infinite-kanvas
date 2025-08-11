import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlacedVideo } from "@/types/canvas";

interface VideoControlsProps {
  video: PlacedVideo;
  onChange: (newAttrs: Partial<PlacedVideo>) => void;
  className?: string;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  video,
  onChange,
  className = "",
}) => {
  const [currentTime, setCurrentTime] = useState(video.currentTime);
  const [isDraggingSeekBar, setIsDraggingSeekBar] = useState(false);
  const seekBarRef = useRef<HTMLDivElement>(null);

  // Update local state when video props change
  useEffect(() => {
    if (!isDraggingSeekBar) {
      setCurrentTime(video.currentTime);
    }
  }, [video.currentTime, isDraggingSeekBar]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle play/pause toggle
  const togglePlayPause = () => {
    // Get the actual video element and control it directly
    const videoEl = document.getElementById(
      `video-${video.id}`,
    ) as HTMLVideoElement;
    if (videoEl) {
      if (videoEl.paused) {
        videoEl.play();
      } else {
        videoEl.pause();
      }
    }
    onChange({ isPlaying: !video.isPlaying });
  };

  // Handle mute toggle
  const toggleMute = () => {
    const videoEl = document.getElementById(
      `video-${video.id}`,
    ) as HTMLVideoElement;
    if (videoEl) {
      videoEl.muted = !videoEl.muted;
    }
    onChange({ muted: !video.muted });
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    const videoEl = document.getElementById(
      `video-${video.id}`,
    ) as HTMLVideoElement;
    if (videoEl) {
      videoEl.volume = volume;
    }
    onChange({ volume });
  };

  // Handle seek bar click
  const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!seekBarRef.current) return;

    const rect = seekBarRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(
      0,
      Math.min(position * video.duration, video.duration),
    );

    setCurrentTime(newTime);

    // Directly seek the video element
    const videoEl = document.getElementById(
      `video-${video.id}`,
    ) as HTMLVideoElement;
    if (videoEl) {
      videoEl.currentTime = newTime;
    }

    onChange({ currentTime: newTime });
  };

  // Handle seek bar drag
  const handleSeekBarDragStart = () => {
    setIsDraggingSeekBar(true);
  };

  const handleSeekBarDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSeekBar || !seekBarRef.current) return;

    const rect = seekBarRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(
      0,
      Math.min(position * video.duration, video.duration),
    );

    setCurrentTime(newTime);
  };

  const handleSeekBarDragEnd = () => {
    setIsDraggingSeekBar(false);
    // Directly seek the video element
    const videoEl = document.getElementById(
      `video-${video.id}`,
    ) as HTMLVideoElement;
    if (videoEl) {
      videoEl.currentTime = currentTime;
    }
    onChange({ currentTime });
  };

  // Handle skip forward/backward
  const skipForward = () => {
    const newTime = Math.min(video.currentTime + 5, video.duration);
    // Directly seek the video element
    const videoEl = document.getElementById(
      `video-${video.id}`,
    ) as HTMLVideoElement;
    if (videoEl) {
      videoEl.currentTime = newTime;
    }
    onChange({ currentTime: newTime });
  };

  const skipBackward = () => {
    const newTime = Math.max(video.currentTime - 5, 0);
    // Directly seek the video element
    const videoEl = document.getElementById(
      `video-${video.id}`,
    ) as HTMLVideoElement;
    if (videoEl) {
      videoEl.currentTime = newTime;
    }
    onChange({ currentTime: newTime });
  };

  // Handle loop toggle
  const toggleLoop = () => {
    const videoEl = document.getElementById(
      `video-${video.id}`,
    ) as HTMLVideoElement;
    if (videoEl) {
      videoEl.loop = !videoEl.loop;
    }
    onChange({ isLooping: !video.isLooping });
  };

  return (
    <div
      className={`flex flex-col bg-background border border-border rounded-lg shadow-sm dark:shadow-none p-1.5 z-[60] ${className}`}
      onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling to canvas
    >
      {/* Seek bar with time display */}
      <div className="relative">
        {/* Seek bar */}
        <div
          ref={seekBarRef}
          className="relative h-1.5 bg-muted rounded-full cursor-pointer"
          onClick={handleSeekBarClick}
          onMouseDown={handleSeekBarDragStart}
          onMouseMove={handleSeekBarDragMove}
          onMouseUp={handleSeekBarDragEnd}
          onMouseLeave={handleSeekBarDragEnd}
        >
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
            style={{ width: `${(currentTime / video.duration) * 100}%` }}
          />
        </div>

        {/* Time display split under seek bar */}
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(video.duration)}</span>
        </div>
      </div>

      {/* All controls centered */}
      <div className="flex items-center justify-center space-x-1 mt-1">
        {/* Skip backward */}
        <Button size="sm" className="h-6 w-6 p-0" onClick={skipBackward}>
          <SkipBack className="h-3 w-3" />
        </Button>

        {/* Play/Pause */}
        <Button size="sm" className="h-6 w-6 p-0" onClick={togglePlayPause}>
          {video.isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>

        {/* Loop button next to play */}
        <Button size="sm" className="h-6 w-6 p-0" onClick={toggleLoop}>
          <Repeat
            className={`h-3 w-3 ${video.isLooping ? "text-purple-500" : ""}`}
          />
        </Button>

        {/* Skip forward */}
        <Button size="sm" className="h-6 w-6 p-0" onClick={skipForward}>
          <SkipForward className="h-3 w-3" />
        </Button>

        {/* Mute button - hidden but preserved */}
        <Button size="sm" className="h-6 w-6 p-0 hidden" onClick={toggleMute}>
          {video.muted ? (
            <VolumeX className="h-3 w-3" />
          ) : (
            <Volume2 className="h-3 w-3" />
          )}
        </Button>

        {/* Volume slider - hidden but preserved */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={video.volume}
          onChange={handleVolumeChange}
          className="w-16 h-1 hidden"
          disabled={video.muted}
        />
      </div>
    </div>
  );
};
