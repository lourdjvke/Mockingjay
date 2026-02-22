
export interface EditorState {
    pages: Page[];
    currentPageIndex: number;
    selectedElementId: string | null;
    themeColors: string[];
    isAiCreated?: boolean;
    aiPrompt?: string;
  }
  
  export interface Page {
    id: string;
    background: string;
    elements: DesignElement[];
  }
  
  export interface DesignElement {
    id: string;
    name: string;
    type: 'text' | 'shape' | 'image' | 'icon';
    box: BoundingBox;
    content: string;
    style: ElementStyle;
    visible: boolean;
    locked: boolean;
  }
  
  export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  }
  
  export interface ElementStyle {
    color: string | null;
    backgroundColor: string | null;
    fontSize: number | null;
    fontFamily: string | null;
    fontWeight: string | null;
    textAlign: 'left' | 'center' | 'right' | null;
    letterSpacing: number | null;
    lineHeight: number | null;
    borderRadius: number | null;
    opacity: number;
    strokeColor: string | null;
    strokeWidth: number | null;
    strokePattern: 'solid' | 'dashed' | 'dotted' | null;
    clipPath: string | null;
    filter: string | null;
  }
  
