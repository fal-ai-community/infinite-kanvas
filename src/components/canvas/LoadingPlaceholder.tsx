import React from "react";
import { Rect, Group, Text } from "react-konva";
import { LogoIcon } from "@/components/icons/logo";

interface LoadingPlaceholderProps {
  x: number;
  y: number;
  width: number;
  height: number;
  message?: string;
  opacity?: number;
}

export const LoadingPlaceholder: React.FC<LoadingPlaceholderProps> = ({
  x,
  y,
  width,
  height,
  message = "Loading...",
  opacity = 0.8,
}) => {
  return (
    <Group x={x} y={y} opacity={opacity}>
      {/* Background rectangle */}
      <Rect
        width={width}
        height={height}
        fill="#f8f9fa"
        stroke="#e9ecef"
        strokeWidth={2}
        dash={[5, 5]}
        cornerRadius={8}
      />

      {/* Loading indicator circle */}
      <Rect
        x={width / 2 - 20}
        y={height / 2 - 30}
        width={40}
        height={40}
        fill="#3b82f6"
        cornerRadius={20}
        opacity={0.7}
      />

      {/* Inner pulsing circle */}
      <Rect
        x={width / 2 - 15}
        y={height / 2 - 25}
        width={30}
        height={30}
        fill="#60a5fa"
        cornerRadius={15}
        opacity={0.5}
      />

      {/* Loading text */}
      <Text
        x={0}
        y={height / 2 + 20}
        width={width}
        height={20}
        text={message}
        fontSize={12}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="#6b7280"
        align="center"
        verticalAlign="middle"
      />
    </Group>
  );
};
