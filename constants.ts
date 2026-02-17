
import { EditorState } from './types';

export const CANVAS_WIDTH = 360;
export const CANVAS_HEIGHT = 640;

export const FONTS = [
  { name: 'Mozza', value: "'Playfair Display', serif" },
  { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { name: 'Inter', value: "'Inter', sans-serif" }
];

export const INITIAL_COLORS = ['#E85D3D', '#2D6B58', '#C4C4C4', '#000000', '#FFFFFF', '#F5E6D3'];

export const INITIAL_STATE: EditorState = {
  pages: [
    {
      id: 'page-1',
      background: '#2D6B58',
      elements: []
    }
  ],
  currentPageIndex: 0,
  selectedElementId: null,
  themeColors: INITIAL_COLORS
};
