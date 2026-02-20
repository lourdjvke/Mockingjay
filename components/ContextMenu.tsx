import React from 'react';
import { Icons } from './IconLibrary';
import { DesignElement } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  isMobile: boolean;
  onClose: () => void;
  onMoveForward: () => void;
  onMoveBackward: () => void;
  onCut: () => void;
  onApplyEffect: (effect: string) => void;
  show: boolean;
  selectedElement: DesignElement | null;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ show, x, y, isMobile, onClose, onMoveForward, onMoveBackward, onCut, onApplyEffect, selectedElement }) => {
  if (!show) return null;

  const isImage = selectedElement?.type === 'image';

  const menuContent = (
    <>
        <button onClick={onMoveForward} className="flex items-center gap-3 text-white text-lg py-3 text-left rounded-lg px-3 hover:bg-white/5 w-full">
            <Icons.ChevronUp className="w-5 h-5" /> Move Forward
        </button>
        <button onClick={onMoveBackward} className="flex items-center gap-3 text-white text-lg py-3 text-left rounded-lg px-3 hover:bg-white/5 w-full">
            <Icons.ChevronDown className="w-5 h-5" /> Move Backward
        </button>
        <button onClick={onCut} className="flex items-center gap-3 text-white text-lg py-3 text-left rounded-lg px-3 hover:bg-white/5 w-full">
            <Icons.Scissors className="w-5 h-5" /> Cut
        </button>

        {isImage && (
            <>
                <div className="w-full h-[1px] bg-white/10 my-1" />
                <div className="text-white/50 text-sm px-3 pt-2 pb-1">Effects</div>
                <div className="grid grid-cols-3 gap-2 p-2">
                    <button onClick={() => onApplyEffect('grayscale')} className="flex flex-col items-center gap-1 text-white/70 hover:text-white"><Icons.Palette className="w-5 h-5" /><span className="text-xs">Grayscale</span></button>
                    <button onClick={() => onApplyEffect('sepia')} className="flex flex-col items-center gap-1 text-white/70 hover:text-white"><Icons.Palette className="w-5 h-5" /><span className="text-xs">Sepia</span></button>
                    <button onClick={() => onApplyEffect('invert')} className="flex flex-col items-center gap-1 text-white/70 hover:text-white"><Icons.Palette className="w-5 h-5" /><span className="text-xs">Invert</span></button>
                    <button onClick={() => onApplyEffect('motion-blur')} className="flex flex-col items-center gap-1 text-white/70 hover:text-white"><Icons.Wind className="w-5 h-5" /><span className="text-xs">Blur</span></button>
                </div>
            </>
        )}
    </>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div 
          className="absolute bottom-0 left-0 right-0 bg-[#111] rounded-t-[20px] bottom-sheet-transition flex flex-col p-4 border-t-2 border-green-500" 
          style={{ height: '40vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-2 mb-4 shrink-0" />
          {menuContent}
        </div>
      </div>
    );
  }

  return (
    <div 
        onContextMenu={(e) => e.preventDefault()}
        className="fixed z-[120] bg-[#1a1a1a] border border-green-500 rounded-md shadow-lg w-48 py-1"
        style={{ top: y, left: x }}
    >
      {menuContent}
    </div>
  );
};

export default ContextMenu;
