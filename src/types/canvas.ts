export interface PlacedImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isGenerated?: boolean;
  parentGroupId?: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface HistoryState {
  images: PlacedImage[];
  selectedIds: string[];
}

export interface GenerationSettings {
  prompt: string;
  loraUrl: string;
  styleId?: string;
}

export interface ActiveGeneration {
  imageUrl: string;
  prompt: string;
  loraUrl?: string;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  visible: boolean;
}
