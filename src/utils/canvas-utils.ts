import type { PlacedImage } from "@/types/canvas";
import type { CanvasElement } from "@/lib/storage";

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
