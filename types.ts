
export type ElementType = 'text' | 'shape' | 'image' | 'icon';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface ElementStyle {
    color?: string;
    backgroundColor?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    borderRadius?: number;
    opacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
    strokePattern?: 'solid' | 'dashed' | 'dotted';
    letterSpacing?: number;
    lineHeight?: number;
    clipPath?: string;
    filter?: string | null;
    perspective?: number;
    rotateX?: number;
    rotateY?: number;
}

export interface DesignElement {
  id: string;
  type: ElementType;
  name: string;
  box: BoundingBox;
  content: string; // text content, svg path, or image src
  style: ElementStyle;
  visible: boolean;
  locked: boolean;
}

export interface Page {
  id: string;
  background: string; // HEX or image URL
  elements: DesignElement[];
}

export interface EditorState {
  pages: Page[];
  currentPageIndex: number;
  selectedElementId: string | null;
  themeColors: string[];
}
