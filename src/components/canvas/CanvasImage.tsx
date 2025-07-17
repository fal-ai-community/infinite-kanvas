import React, { useRef, useState, useEffect } from "react";
import { Image as KonvaImage, Transformer } from "react-konva";
import Konva from "konva";
import useImage from "use-image";
import { useStreamingImage } from "@/hooks/useStreamingImage";
import type { PlacedImage } from "@/types/canvas";

interface CanvasImageProps {
  image: PlacedImage;
  isSelected: boolean;
  onSelect: (e: any) => void;
  onChange: (newAttrs: Partial<PlacedImage>) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDoubleClick?: () => void;
  selectedIds: string[];
  images: PlacedImage[];
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  isDraggingImage: boolean;
  isCroppingImage: boolean;
  dragStartPositions: Map<string, { x: number; y: number }>;
}

export const CanvasImage: React.FC<CanvasImageProps> = ({
  image,
  isSelected,
  onSelect,
  onChange,
  onDragStart,
  onDragEnd,
  onDoubleClick,
  selectedIds,
  images,
  setImages,
  isDraggingImage,
  isCroppingImage,
  dragStartPositions,
}) => {
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);
  // Use streaming image hook for generated images to prevent flicker
  const [streamingImg] = useStreamingImage(image.isGenerated ? image.src : "");
  const [normalImg] = useImage(image.isGenerated ? "" : image.src, "anonymous");
  const img = image.isGenerated ? streamingImg : normalImg;
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggable, setIsDraggable] = useState(true);

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

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        id={image.id}
        image={img}
        x={image.x}
        y={image.y}
        width={image.width}
        height={image.height}
        rotation={image.rotation}
        crop={
          image.cropX !== undefined && !isCroppingImage
            ? {
                x: (image.cropX || 0) * (img?.naturalWidth || 0),
                y: (image.cropY || 0) * (img?.naturalHeight || 0),
                width: (image.cropWidth || 1) * (img?.naturalWidth || 0),
                height: (image.cropHeight || 1) * (img?.naturalHeight || 0),
              }
            : undefined
        }
        draggable={isDraggable}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={onDoubleClick}
        onDblTap={onDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={(e) => {
          // Block ALL non-standard mouse buttons (anything that isn't left or right click)
          if (e.evt.button !== 0 && e.evt.button !== 2) {
            e.evt.preventDefault();
            e.evt.stopPropagation();
            return;
          }

          // Only allow dragging with left mouse button (0)
          // Right mouse (2) should not drag images
          const isLeftButton = e.evt.button === 0;
          setIsDraggable(isLeftButton);
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
          onDragStart();
        }}
        onDragMove={(e) => {
          const node = e.target;

          if (selectedIds.includes(image.id) && selectedIds.length > 1) {
            // Calculate delta from drag start position
            const startPos = dragStartPositions.get(image.id);
            if (startPos) {
              const deltaX = node.x() - startPos.x;
              const deltaY = node.y() - startPos.y;

              // Update all selected items relative to their start positions
              setImages((prev) =>
                prev.map((img) => {
                  if (img.id === image.id) {
                    return { ...img, x: node.x(), y: node.y() };
                  } else if (selectedIds.includes(img.id)) {
                    const imgStartPos = dragStartPositions.get(img.id);
                    if (imgStartPos) {
                      return {
                        ...img,
                        x: imgStartPos.x + deltaX,
                        y: imgStartPos.y + deltaY,
                      };
                    }
                  }
                  return img;
                }),
              );
            }
          } else {
            onChange({
              x: node.x(),
              y: node.y(),
            });
          }
        }}
        onDragEnd={(e) => {
          onDragEnd();
        }}
        onTransformEnd={(e) => {
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
          onDragEnd();
        }}
        opacity={image.isGenerated ? 0.9 : 1}
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
