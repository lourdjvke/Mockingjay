import React from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  isMobile: boolean;
  onClose: () => void;
  onMoveForward: () => void;
  onMoveBackward: () => void;
  onCut: () => void;
  show: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ show, x, y, isMobile, onClose, onMoveForward, onMoveBackward, onCut }) => {
  if (!show) return null;

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div 
          className="absolute bottom-0 left-0 right-0 bg-[#111] rounded-t-[20px] bottom-sheet-transition flex flex-col p-4 border-t-2 border-green-500" 
          style={{ height: '40vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-2 mb-4 shrink-0" />
          <button onClick={onMoveForward} className="text-white text-lg py-3 text-left rounded-lg px-3 hover:bg-white/5">Move Forward</button>
          <button onClick={onMoveBackward} className="text-white text-lg py-3 text-left rounded-lg px-3 hover:bg-white/5">Move Backward</button>
          <button onClick={onCut} className="text-white text-lg py-3 text-left rounded-lg px-3 hover:bg-white/5">Cut</button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed z-[120] bg-[#1a1a1a] border border-green-500 rounded-md shadow-lg"
      style={{ top: y, left: x }}
    >
      <ul className="py-1">
        <li><button onClick={onMoveForward} className="block w-full text-left px-4 py-2 text-white hover:bg-[#333]">Move Forward</button></li>
        <li><button onClick={onMoveBackward} className="block w-full text-left px-4 py-2 text-white hover:bg-[#333]">Move Backward</button></li>
        <li><button onClick={onCut} className="block w-full text-left px-4 py-2 text-white hover:bg-[#333]">Cut</button></li>
      </ul>
    </div>
  );
};

export default ContextMenu;
