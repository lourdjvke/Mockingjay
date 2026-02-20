import React from 'react';
import { Icons } from './IconLibrary';
import { DesignElement, Page } from '../types';

interface QuickToolsProps {
  selectedElement: DesignElement | null;
  onQuickToolAction: (action: string) => void;
  onDelete: () => void;
  onAdd: () => void;
  themeColors: string[];
  currentPage: Page | undefined;
  onUpdatePage: (updates: Partial<Page>) => void;
}

const QuickTools: React.FC<QuickToolsProps> = ({ selectedElement, onQuickToolAction, onDelete, onAdd, themeColors, currentPage, onUpdatePage }) => {
  const getToolsForElement = () => {
      switch (selectedElement?.type) {
          case 'text':
              return (
                  <>
                      <button onClick={() => onQuickToolAction('font')} className="flex flex-col items-center gap-1 text-lime-400 p-2 min-w-[50px]"><Icons.Type className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Font</span></button>
                      <button onClick={() => onQuickToolAction('size')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Scaling className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Size</span></button>
                      <button onClick={() => onQuickToolAction('color')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Palette className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Color</span></button>
                      <button onClick={() => onQuickToolAction('format')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.AlignLeft className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Format</span></button>
                      <button onClick={() => onQuickToolAction('layer')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Layers className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Layer</span></button>
                      <button onClick={onDelete} className="flex flex-col items-center gap-1 text-red-400/70 p-2 min-w-[50px]"><Icons.Trash2 className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Delete</span></button>
                  </>
              );
          case 'image':
               return (
                  <>
                      <button onClick={() => onQuickToolAction('effects')} className="flex flex-col items-center gap-1 text-lime-400 p-2 min-w-[50px]"><Icons.Wand2 className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Effects</span></button>
                      <button onClick={() => onQuickToolAction('style')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Crop className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Style</span></button>
                       <button onClick={() => onQuickToolAction('layer')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Layers className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Layer</span></button>
                       <button onClick={onDelete} className="flex flex-col items-center gap-1 text-red-400/70 p-2 min-w-[50px]"><Icons.Trash2 className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Delete</span></button>
                  </>
              );
          default: // for shapes and other elements
              return (
                  <>
                      <button onClick={() => onQuickToolAction('color')} className="flex flex-col items-center gap-1 text-lime-400 p-2 min-w-[50px]"><Icons.Palette className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Color</span></button>
                      <button onClick={() => onQuickToolAction('style')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Sparkles className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Style</span></button>
                      <button onClick={() => onQuickToolAction('layer')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Layers className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Layer</span></button>
                      <button onClick={onDelete} className="flex flex-col items-center gap-1 text-red-400/70 p-2 min-w-[50px]"><Icons.Trash2 className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Delete</span></button>
                  </>
              );
      }
  };

  return (
      <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {selectedElement ? getToolsForElement() : (
                  <>
                      <button onClick={onAdd} className="flex flex-col items-center gap-1 text-lime-400 p-2 min-w-[50px]"><Icons.Plus className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Add</span></button>
                      <div className="flex gap-2 items-center">
                          {themeColors.slice(0, 3).map(c => (
                              <button key={c} onClick={() => onUpdatePage({ background: c })} className={`w-8 h-8 rounded-full border-2 ${currentPage?.background === c ? 'border-white' : 'border-white/20'}`} style={{ backgroundColor: c }} />
                          ))}
                      </div>
                  </>
              )}
          </div>
      </div>
  )
}

export default QuickTools;
