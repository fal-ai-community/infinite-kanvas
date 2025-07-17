import type { PlacedImage } from "@/types/canvas";
import type { CanvasElement } from "@/lib/storage";

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

// Helper to convert PlacedImage to storage format
export const imageToCanvasElement = (image: PlacedImage): CanvasElement => ({
  id: image.id,
  type: "image",
  imageId: image.id, // We'll use the same ID for both
  transform: {
    x: image.x,
    y: image.y,
    scale: 1, // We store width/height separately, so scale is 1
    rotation: image.rotation,
    ...(image.cropX !== undefined && {
      cropBox: {
        x: image.cropX,
        y: image.cropY || 0,
        width: image.cropWidth || 1,
        height: image.cropHeight || 1,
      },
    }),
  },
  zIndex: 0, // We'll use array order instead
  width: image.width,
  height: image.height,
});

// Convert canvas coordinates to screen coordinates
export const canvasToScreen = (
  canvasX: number,
  canvasY: number,
  viewport: Viewport,
): { x: number; y: number } => {
  return {
    x: canvasX * viewport.scale + viewport.x,
    y: canvasY * viewport.scale + viewport.y,
  };
};

// Calculate bounding box for an image considering rotation
export const calculateBoundingBox = (
  image: PlacedImage,
): { x: number; y: number; width: number; height: number } => {
  const { x, y, width, height, rotation } = image;

  // If no rotation, return simple bounding box
  if (!rotation || rotation === 0) {
    return {
      x,
      y,
      width,
      height,
    };
  }

  // Convert rotation from degrees to radians
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Calculate the four corners of the original rectangle
  const corners = [
    { x: 0, y: 0 }, // top-left
    { x: width, y: 0 }, // top-right
    { x: width, y: height }, // bottom-right
    { x: 0, y: height }, // bottom-left
  ];

  // Rotate each corner around the top-left corner (0,0)
  const rotatedCorners = corners.map((corner) => ({
    x: corner.x * cos - corner.y * sin,
    y: corner.x * sin + corner.y * cos,
  }));

  // Find the bounding box of the rotated corners
  const xs = rotatedCorners.map((c) => c.x);
  const ys = rotatedCorners.map((c) => c.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: x + minX,
    y: y + minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};
