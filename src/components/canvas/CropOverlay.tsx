import React, { useRef, useState, useEffect } from "react";
import {
  Rect,
  Group,
  Text,
  Line,
  Image as KonvaImage,
  Transformer,
} from "react-konva";
import Konva from "konva";
import type { PlacedImage } from "@/types/canvas";

interface CropOverlayProps {
  image: PlacedImage;
  imageElement: HTMLImageElement;
  onCropChange: (crop: {
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
  }) => void;
  onCropEnd: () => void;
}

export const CropOverlay: React.FC<CropOverlayProps> = ({
  image,
  imageElement,
  onCropChange,
  onCropEnd,
}) => {
  const cropRectRef = useRef<Konva.Rect>(null);
  const cropTransformerRef = useRef<Konva.Transformer>(null);
  const [grid, setGrid] = useState<Array<{ points: number[] }>>([]);
  const [isHoveringDone, setIsHoveringDone] = useState(false);

  // Initialize crop values (default to full image if not set)
  const cropX = (image.cropX ?? 0) * image.width;
  const cropY = (image.cropY ?? 0) * image.height;
  const cropWidth = (image.cropWidth ?? 1) * image.width;
  const cropHeight = (image.cropHeight ?? 1) * image.height;

  useEffect(() => {
    if (cropRectRef.current && cropTransformerRef.current) {
      cropTransformerRef.current.nodes([cropRectRef.current]);
      cropTransformerRef.current.getLayer()?.batchDraw();
    }
  }, []);

  // Update grid lines
  const updateGrid = (width: number, height: number) => {
    const newGrid: Array<{ points: number[] }> = [];
    const stepX = width / 3;
    const stepY = height / 3;

    for (let i = 1; i <= 2; i++) {
      // Vertical lines
      newGrid.push({ points: [stepX * i, 0, stepX * i, height] });
      // Horizontal lines
      newGrid.push({ points: [0, stepY * i, width, stepY * i] });
    }

    setGrid(newGrid);
  };

  useEffect(() => {
    updateGrid(cropWidth, cropHeight);
  }, [cropWidth, cropHeight]);

  const handleTransform = () => {
    const node = cropRectRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    let newX = node.x();
    let newY = node.y();
    let newWidth = Math.max(20, node.width() * scaleX);
    let newHeight = Math.max(20, node.height() * scaleY);

    // Constrain to image bounds
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + newWidth > image.width) {
      newWidth = image.width - newX;
    }
    if (newY + newHeight > image.height) {
      newHeight = image.height - newY;
    }

    node.setAttrs({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });

    updateGrid(newWidth, newHeight);

    onCropChange({
      cropX: newX / image.width,
      cropY: newY / image.height,
      cropWidth: newWidth / image.width,
      cropHeight: newHeight / image.height,
    });
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    let newX = node.x();
    let newY = node.y();

    // Constrain to image bounds
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + node.width() > image.width) {
      newX = image.width - node.width();
    }
    if (newY + node.height() > image.height) {
      newY = image.height - node.height();
    }

    node.setAttrs({
      x: newX,
      y: newY,
    });
  };

  const handleDragEnd = () => {
    const node = cropRectRef.current;
    if (!node) return;

    onCropChange({
      cropX: node.x() / image.width,
      cropY: node.y() / image.height,
      cropWidth: node.width() / image.width,
      cropHeight: node.height() / image.height,
    });
  };

  return (
    <Group x={image.x} y={image.y} name="crop-overlay">
      {/* Semi-transparent mask */}
      <Rect
        width={image.width}
        height={image.height}
        fill="black"
        opacity={0.5}
        listening={false}
      />

      {/* Clipped image (visible crop area) */}
      <Group
        clip={{
          x: cropX,
          y: cropY,
          width: cropWidth,
          height: cropHeight,
        }}
      >
        <KonvaImage
          image={imageElement}
          width={image.width}
          height={image.height}
        />
      </Group>

      {/* Grid lines */}
      <Group x={cropX} y={cropY}>
        {grid.map((line, index) => (
          <Line
            key={index}
            points={line.points}
            stroke="white"
            strokeWidth={1}
            opacity={0.5}
          />
        ))}
      </Group>

      {/* Crop rectangle */}
      <Rect
        ref={cropRectRef}
        x={cropX}
        y={cropY}
        width={cropWidth}
        height={cropHeight}
        stroke="#3b82f6"
        strokeWidth={2}
        draggable
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransform}
      />

      {/* Transformer */}
      <Transformer
        ref={cropTransformerRef}
        boundBoxFunc={(oldBox, newBox) => {
          // Limit minimum size
          if (newBox.width < 20 || newBox.height < 20) {
            return oldBox;
          }
          return newBox;
        }}
        enabledAnchors={[
          "top-left",
          "top-center",
          "top-right",
          "middle-left",
          "middle-right",
          "bottom-left",
          "bottom-center",
          "bottom-right",
        ]}
        rotateEnabled={false}
        flipEnabled={false}
      />

      {/* Done button - styled to match our button component */}
      <Group
        x={cropX + cropWidth - 70}
        y={cropY - 45}
        onMouseEnter={() => setIsHoveringDone(true)}
        onMouseLeave={() => setIsHoveringDone(false)}
        onClick={onCropEnd}
        onTap={onCropEnd}
      >
        <Rect
          width={70}
          height={36}
          fill={isHoveringDone ? "#2563eb" : "#3b82f6"}
          cornerRadius={6}
          shadowColor="black"
          shadowBlur={8}
          shadowOpacity={0.15}
          shadowOffsetY={2}
        />
        <Text
          text="Done"
          fontSize={14}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontStyle="500"
          fill="white"
          width={70}
          height={36}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      </Group>
    </Group>
  );
};
