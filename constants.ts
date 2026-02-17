
import { EditorState } from './types';

export const CANVAS_WIDTH = 360;
export const CANVAS_HEIGHT = 640;

export const FONTS = [
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Mozza', value: "'Playfair Display', serif" },
  { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { name: 'Bangers', value: "'Bangers', cursive" },
  { name: 'Lobster', value: "'Lobster', cursive" },
  { name: 'Marker', value: "'Permanent Marker', cursive" },
  { name: 'Sacramento', value: "'Sacramento', cursive" },
  { name: 'Arcade', value: "'Press Start 2P', cursive" },
  { name: 'Monoton', value: "'Monoton', cursive" },
  { name: 'Alfa Slab', value: "'Alfa Slab One', cursive" },
  { name: 'Cinzel', value: "'Cinzel Decorative', cursive" },
  { name: 'Faster', value: "'Faster One', cursive" },
  { name: 'Righteous', value: "'Righteous', cursive" },
  { name: 'Fredoka', value: "'Fredoka One', cursive" },
  { name: 'Orbitron', value: "'Orbitron', sans-serif" },
  { name: 'Elite', value: "'Special Elite', cursive" },
  { name: 'Cookie', value: "'Cookie', cursive" },
  { name: 'Satisfy', value: "'Satisfy', cursive" },
  { name: 'Kaushan', value: "'Kaushan Script', cursive" },
  { name: 'Pinyon', value: "'Pinyon Script', cursive" },
  { name: 'Rochester', value: "'Rochester', cursive" },
  { name: 'Abril', value: "'Abril Fatface', cursive" },
  { name: 'Comfortaa', value: "'Comfortaa', cursive" },
  { name: 'Maguntia', value: "'UnifrakturMaguntia', cursive" },
  { name: 'Creepster', value: "'Creepster', cursive" },
  { name: 'Nosifer', value: "'Nosifer', cursive" },
  { name: 'Bungee', value: "'Bungee Shade', cursive" }
];

export const INITIAL_COLORS = ['#E85D3D', '#2D6B58', '#C4C4C4', '#000000', '#FFFFFF', '#F5E6D3', '#BEE3DB', '#FFD6BA', '#89B0AE'];

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
