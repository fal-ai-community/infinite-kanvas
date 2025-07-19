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
    onChange({ isPlaying: !video.isPlaying });
  };

  // Handle mute toggle
  const toggleMute = () => {
    onChange({ muted: !video.muted });
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
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
    onChange({ currentTime });
  };

  // Handle skip forward/backward
  const skipForward = () => {
    const newTime = Math.min(video.currentTime + 5, video.duration);
    onChange({ currentTime: newTime });
  };

  const skipBackward = () => {
    const newTime = Math.max(video.currentTime - 5, 0);
    onChange({ currentTime: newTime });
  };

  // Handle loop toggle
  const toggleLoop = () => {
    onChange({ isLooping: !video.isLooping });
  };

  return (
    <div
      className={`flex flex-col bg-white/90 backdrop-blur-sm rounded-md shadow-md p-2 z-[60] ${className}`}
      onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling to canvas
    >
      {/* Seek bar */}
      <div
        ref={seekBarRef}
        className="relative h-2 bg-gray-200 rounded-full cursor-pointer mb-2"
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

      {/* Time display */}
      <div className="flex justify-between text-xs text-gray-600 mb-2">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(video.duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Skip backward */}
          <Button size="sm" className="h-8 w-8 p-0" onClick={skipBackward}>
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Play/Pause */}
          <Button size="sm" className="h-8 w-8 p-0" onClick={togglePlayPause}>
            {video.isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          {/* Skip forward */}
          <Button size="sm" className="h-8 w-8 p-0" onClick={skipForward}>
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Loop button */}
          <Button size="sm" className="h-8 w-8 p-0" onClick={toggleLoop}>
            <Repeat
              className={`h-4 w-4 ${video.isLooping ? "text-purple-500" : ""}`}
            />
          </Button>
        </div>

        {/* Volume controls */}
        <div className="flex items-center space-x-2">
          <Button size="sm" className="h-8 w-8 p-0" onClick={toggleMute}>
            {video.muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={video.volume}
            onChange={handleVolumeChange}
            className="w-16 h-1"
            disabled={video.muted}
          />
        </div>
      </div>
    </div>
  );
};
