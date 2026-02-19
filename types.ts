
export type ElementType = 'text' | 'shape' | 'image' | 'icon';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface DesignElement {
  id: string;
  type: ElementType;
  name: string;
  box: BoundingBox;
  content: string; // text content, svg path, or image src
  style: {
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
  };
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

export interface BusinessDNA {
  id: string;
  userId: string;
  brandName: string;
  websiteUrl: string;
  screenshotUrl?: string;
  brandColors: string[];
  topFonts: string[];
  brandValues: string[];
  brandToneOfVoice: string;
  brandAesthetic: string;
  businessOverview: string;
  noticeableColors: string[];
  logoUrl?: string;
  images: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  dnaId?: string;
  pageCount: number;
  prompt: string;
  designs: EditorState;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}
