import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import {
  Rect,
  Group,
  Text,
  Line,
  Image as KonvaImage,
  Transformer,
} from 'react-konva';
import Konva from 'konva';
import type { PlacedImage } from '@/types/canvas';

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
  const [stageScale, setStageScale] = useState(1);
  const [scaleInitialized, setScaleInitialized] = useState(false);

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

  // Get initial stage scale synchronously to prevent twitching
  useLayoutEffect(() => {
    const stage = cropRectRef.current?.getStage();
    if (stage) {
      const initialScale = stage.scaleX();
      setStageScale(initialScale);
      setScaleInitialized(true);
    }
  }, []);

  // Get stage scale for proper button sizing
  useEffect(() => {
    const updateScale = () => {
      const stage = cropRectRef.current?.getStage();
      if (stage) {
        const newScale = stage.scaleX();
        setStageScale(newScale);
      }
    };

    // Set up event listeners for scale changes
    const stage = cropRectRef.current?.getStage();
    if (stage) {
      // Listen for events that change the scale
      stage.on('wheel', updateScale);
      stage.on('dragend', updateScale);
      stage.on('transformend', updateScale);

      return () => {
        stage.off('wheel', updateScale);
        stage.off('dragend', updateScale);
        stage.off('transformend', updateScale);
      };
    }
  }, []);

  // Calculate button position - always at upper right corner (fixed positioning)
  const getButtonPosition = () => {
    // Use the same scaled dimensions as the button render
    const buttonWidth = 80 / stageScale;
    const buttonHeight = 40 / stageScale;
    const padding = 15 / stageScale;

    // Calculate absolute positions on stage (accounting for image position)
    const absoluteCropX = image.x + cropX;
    const absoluteCropY = image.y + cropY;
    const absoluteCropRight = absoluteCropX + cropWidth;
    const absoluteCropTop = absoluteCropY;

    // Always position button at upper right corner of crop area
    // Use scaled dimensions to match the rendered button size
    const buttonX = absoluteCropRight - buttonWidth;
    const buttonY = absoluteCropTop - buttonHeight - padding;

    return { x: buttonX, y: buttonY };
  };

  const buttonPos = getButtonPosition();

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
    <>
      {/* Crop overlay group */}
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
            'top-left',
            'top-center',
            'top-right',
            'middle-left',
            'middle-right',
            'bottom-left',
            'bottom-center',
            'bottom-right',
          ]}
          rotateEnabled={false}
          flipEnabled={false}
        />
      </Group>

      {/* Done button - positioned in absolute stage coordinates */}
      {scaleInitialized && (
        <Group
          x={buttonPos.x}
          y={buttonPos.y}
          onMouseEnter={() => setIsHoveringDone(true)}
          onMouseLeave={() => setIsHoveringDone(false)}
          onClick={onCropEnd}
          onTap={onCropEnd}
        >
          <Rect
            width={80 / stageScale}
            height={40 / stageScale}
            fill={isHoveringDone ? '#8b5cf6' : '#a855f7'}
            stroke="#6b7280"
            strokeWidth={1 / stageScale}
            cornerRadius={6 / stageScale}
            shadowColor="black"
            shadowBlur={4 / stageScale}
            shadowOpacity={0.15}
            shadowOffsetY={2 / stageScale}
          />
          <Text
            text="Done"
            fontSize={14 / stageScale}
            fontFamily="system-ui, -apple-system, sans-serif"
            fontStyle="500"
            fill="white"
            width={80 / stageScale}
            height={40 / stageScale}
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        </Group>
      )}
    </>
  );
};
