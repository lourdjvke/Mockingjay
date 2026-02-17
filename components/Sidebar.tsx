
import React, { useState } from 'react';
import { Icons } from './IconLibrary';
import { DesignElement, Page } from '../types';
import { FONTS } from '../constants';

interface Props {
  selectedElement: DesignElement | null;
  themeColors: string[];
  pages: Page[];
  currentPageIndex: number;
  updateElement: (id: string, updates: Partial<DesignElement>) => void;
  updatePage: (updates: Partial<Page>) => void;
  onAddText: (type: 'Header' | 'Subheader' | 'Paragraph') => void;
  onAddShape: (type: string) => void;
  onAddImage: (src: string) => void;
  onColorChange: (color: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  isMobile?: boolean;
}

const Sidebar: React.FC<Props> = ({
  selectedElement,
  themeColors,
  pages,
  currentPageIndex,
  updateElement,
  updatePage,
  onAddText,
  onAddShape,
  onAddImage,
  onColorChange,
  onReorder,
  isMobile = false
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    image: !isMobile,
    text: !isMobile,
    appearance: false,
    layers: false,
    elements: isMobile
  });

  const currentPage = pages[currentPageIndex];

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const Section = ({ title, id, icon, children }: any) => (
    <div className="border-b border-white/5 last:border-0">
      <button 
        onClick={() => toggleSection(id)}
        className="w-full px-5 py-4 flex items-center justify-between text-sm font-medium text-white/70 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span>{title}</span>
        </div>
        {openSections[id] ? <Icons.ChevronUp className="w-4 h-4" /> : <Icons.ChevronDown className="w-4 h-4" />}
      </button>
      {openSections[id] && (
        <div className="px-5 pb-5">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className={`${isMobile ? 'w-full' : 'w-[380px]'} h-full bg-[#111] ${isMobile ? '' : 'border-l'} border-white/10 flex flex-col select-none overflow-hidden`}>
      {!isMobile && (
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <Icons.Layout className="w-5 h-5 text-lime-400" />
            <h1 className="font-semibold text-lg">Mockingjay Editor</h1>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Background Control */}
        <div className="px-5 py-4 border-b border-white/10">
           <span className="text-[10px] text-white/40 uppercase tracking-widest block mb-2">Canvas Background</span>
           <div className="flex gap-2 flex-wrap">
              {themeColors.map(c => (
                <button 
                  key={c}
                  onClick={() => updatePage({ background: c })}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full border-2 ${currentPage.background === c ? 'border-white' : 'border-white/10'}`}
                />
              ))}
           </div>
        </div>

        <Section title="Add Assets" id="image" icon={<Icons.Plus className="w-4 h-4" />}>
           <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => onAddImage('https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400')} className="bg-zinc-800 p-2 rounded-xl text-xs flex flex-col items-center gap-1 hover:bg-zinc-700 transition-colors">
                 <Icons.ImageIcon className="w-4 h-4 text-lime-400"/> Add Image
              </button>
              <button onClick={() => onAddShape('square')} className="bg-zinc-800 p-2 rounded-xl text-xs flex flex-col items-center gap-1 hover:bg-zinc-700 transition-colors">
                 <Icons.Square className="w-4 h-4 text-lime-400"/> Add Shape
              </button>
           </div>
           <div className="space-y-2">
              <button onClick={() => onAddText('Header')} className="w-full h-10 bg-zinc-800 rounded-lg text-sm font-bold border border-white/5 hover:border-white/20">Add Header</button>
              <button onClick={() => onAddText('Subheader')} className="w-full h-10 bg-zinc-800 rounded-lg text-sm font-medium border border-white/5 hover:border-white/20">Add Subheader</button>
              <button onClick={() => onAddText('Paragraph')} className="w-full h-10 bg-zinc-800 rounded-lg text-xs border border-white/5 hover:border-white/20">Add Paragraph</button>
           </div>
        </Section>

        {selectedElement && (
          <>
            <Section title="Edit Content" id="text" icon={<Icons.Type className="w-4 h-4" />}>
               <div className="space-y-4">
                  {selectedElement.type === 'text' && (
                    <div className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3">
                      <textarea 
                        value={selectedElement.content} 
                        onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                        className="bg-transparent border-none outline-none w-full text-sm font-medium resize-none h-20"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex gap-1 bg-zinc-900 p-1 rounded-full border border-white/5 overflow-x-auto">
                      {themeColors.map(color => (
                        <button 
                          key={color}
                          onClick={() => onColorChange(color)}
                          style={{ backgroundColor: color }}
                          className={`w-6 h-6 rounded-full shrink-0 border-2 ${selectedElement.style.color === color || selectedElement.style.backgroundColor === color ? 'border-white' : 'border-transparent'}`}
                        />
                      ))}
                    </div>
                  </div>
               </div>
            </Section>

            <Section title="Appearance" id="appearance" icon={<Icons.Sparkles className="w-4 h-4" />}>
               <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-white/40 uppercase"><span>Opacity</span><span>{Math.round((selectedElement.style.opacity ?? 1) * 100)}%</span></div>
                    <input type="range" min="0" max="1" step="0.01" value={selectedElement.style.opacity ?? 1} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, opacity: parseFloat(e.target.value) } })} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-400" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-white/40 uppercase"><span>Border Radius</span><span>{selectedElement.style.borderRadius ?? 0}px</span></div>
                    <input type="range" min="0" max="100" step="1" value={selectedElement.style.borderRadius ?? 0} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, borderRadius: parseInt(e.target.value) } })} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-400" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-white/40 uppercase"><span>Border Width</span><span>{selectedElement.style.strokeWidth ?? 0}px</span></div>
                    <div className="flex items-center gap-3">
                      <input type="range" min="0" max="20" step="1" value={selectedElement.style.strokeWidth ?? 0} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, strokeWidth: parseInt(e.target.value) } })} className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-400" />
                      <div className="flex gap-1">
                        {['solid', 'dashed', 'dotted'].map(pattern => (
                          <button key={pattern} onClick={() => updateElement(selectedElement.id, { style: { ...selectedElement.style, strokePattern: pattern as any } })} className={`w-6 h-6 bg-zinc-800 border ${selectedElement.style.strokePattern === pattern ? 'border-lime-400' : 'border-white/5'} flex items-center justify-center rounded text-[8px]`}>{pattern[0]}</button>
                        ))}
                      </div>
                    </div>
                  </div>
               </div>
            </Section>

            <Section title="Layers" id="layers" icon={<Icons.Layout className="w-4 h-4" />}>
               <div className="space-y-2">
                 {currentPage.elements.map((el) => (
                   <div key={el.id} className={`flex items-center justify-between p-2 rounded-lg text-xs ${selectedElement.id === el.id ? 'bg-lime-400/10 text-lime-400' : 'bg-zinc-900/50'}`}>
                      <span className="truncate flex-1">{el.name}</span>
                      <div className="flex gap-1">
                         <button onClick={() => onReorder(el.id, 'up')} className="p-1 hover:bg-white/10 rounded"><Icons.ChevronUp className="w-3 h-3" /></button>
                         <button onClick={() => onReorder(el.id, 'down')} className="p-1 hover:bg-white/10 rounded"><Icons.ChevronDown className="w-3 h-3" /></button>
                      </div>
                   </div>
                 )).reverse()}
               </div>
            </Section>
          </>
        )}
      </div>

      {!isMobile && (
        <div className="p-5 border-t border-white/10 space-y-3">
           <button className="w-full bg-white text-black h-12 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors">
              <Icons.Download className="w-5 h-5" />
              Export Template
           </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
