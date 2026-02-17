
import React, { useState, useRef } from 'react';
import { Icons } from './IconLibrary.tsx';
import { DesignElement, Page } from '../types.ts';
import { FONTS } from '../constants.ts';

interface SectionProps {
  title: string;
  id: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: string) => void;
}

const Section: React.FC<SectionProps> = ({ title, id, icon, children, isOpen, onToggle }) => (
  <div className="border-b border-white/5 last:border-0">
    <button 
      onClick={() => onToggle(id)}
      className="w-full px-5 py-4 flex items-center justify-between text-sm font-medium text-white/70 hover:text-white transition-colors"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{title}</span>
      </div>
      {isOpen ? <Icons.ChevronUp className="w-4 h-4" /> : <Icons.ChevronDown className="w-4 h-4" />}
    </button>
    {isOpen && (
      <div className="px-5 pb-5">
        {children}
      </div>
    )}
  </div>
);

interface SidebarProps {
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

const Sidebar: React.FC<SidebarProps> = ({
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
  const [showFontList, setShowFontList] = useState(false);
  const imageUploadRef = useRef<HTMLInputElement>(null);

  const triggerHaptic = (intensity = 10) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(intensity);
    }
  };

  const currentPage = pages[currentPageIndex];

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleColorClick = (color: string) => {
    triggerHaptic(5);
    onColorChange(color);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onAddImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const SHAPES = [
    { id: 'square', label: 'Square', icon: <div className="w-5 h-5 bg-white/20 rounded-sm" /> },
    { id: 'circle', label: 'Circle', icon: <div className="w-5 h-5 bg-white/20 rounded-full" /> },
    { id: 'pill', label: 'Pill', icon: <div className="w-8 h-4 bg-white/20 rounded-full" /> },
    { id: 'triangle', label: 'Triangle', icon: <div className="w-5 h-5 bg-white/20" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} /> },
    { id: 'diamond', label: 'Diamond', icon: <div className="w-5 h-5 bg-white/20" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} /> },
    { id: 'pentagon', label: 'Pentagon', icon: <div className="w-5 h-5 bg-white/20" style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }} /> },
    { id: 'hexagon', label: 'Hexagon', icon: <div className="w-5 h-5 bg-white/20" style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} /> },
    { id: 'star', label: 'Star', icon: <div className="w-5 h-5 bg-white/20" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} /> },
    { id: 'parallelogram', label: 'Para', icon: <div className="w-5 h-5 bg-white/20" style={{ clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' }} /> },
  ];

  return (
    <div className={`${isMobile ? 'w-full' : 'w-[380px]'} h-full bg-[#111] ${isMobile ? '' : 'border-l'} border-white/10 flex flex-col select-none overflow-hidden`}>
      <input 
        type="file" 
        ref={imageUploadRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload} 
      />

      {!isMobile && (
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <Icons.Layout className="w-5 h-5 text-lime-400" />
            <h1 className="font-semibold text-lg italic tracking-tight">Mockingjay</h1>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4 border-b border-white/10">
           <span className="text-[10px] text-white/40 uppercase tracking-widest block mb-2">Canvas Background</span>
           <div className="flex gap-2 flex-wrap">
              {themeColors.map(c => (
                <button 
                  key={c}
                  onClick={() => { triggerHaptic(5); updatePage({ background: c }); }}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full border-2 ${currentPage.background === c ? 'border-white' : 'border-white/10'} active:scale-90 transition-transform`}
                />
              ))}
           </div>
        </div>

        <Section title="Add Assets" id="image" icon={<Icons.Plus className="w-4 h-4" />} isOpen={openSections.image} onToggle={toggleSection}>
           <div className="space-y-4">
              <button 
                onClick={() => imageUploadRef.current?.click()} 
                className="w-full bg-zinc-800 p-4 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors active:scale-95 border border-white/5"
              >
                 <Icons.ImageIcon className="w-5 h-5 text-lime-400"/> Device Image
              </button>
              
              <div className="grid grid-cols-3 gap-2">
                {SHAPES.map(shape => (
                  <button 
                    key={shape.id}
                    onClick={() => { triggerHaptic(5); onAddShape(shape.id); }}
                    className="bg-zinc-800/50 p-3 rounded-xl flex flex-col items-center gap-2 hover:bg-zinc-700 transition-colors active:scale-90 border border-white/5"
                  >
                    {shape.icon}
                    <span className="text-[9px] uppercase font-bold text-white/40">{shape.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                  <button onClick={() => onAddText('Header')} className="w-full h-10 bg-zinc-800 rounded-lg text-sm font-bold border border-white/5 hover:border-white/20 active:scale-[0.98]">Add Header</button>
                  <button onClick={() => onAddText('Subheader')} className="w-full h-10 bg-zinc-800 rounded-lg text-sm font-medium border border-white/5 hover:border-white/20 active:scale-[0.98]">Add Subheader</button>
                  <button onClick={() => onAddText('Paragraph')} className="w-full h-10 bg-zinc-800 rounded-lg text-xs border border-white/5 hover:border-white/20 active:scale-[0.98]">Add Paragraph</button>
              </div>
           </div>
        </Section>

        {selectedElement && (
          <>
            <Section title="Edit Content" id="text" icon={<Icons.Type className="w-4 h-4" />} isOpen={openSections.text} onToggle={toggleSection}>
               <div className="space-y-4">
                  {selectedElement.type === 'text' && (
                    <div className="space-y-4">
                      {/* Pill Font Selector */}
                      <div className="relative">
                        <div className="flex bg-zinc-900 rounded-full border border-white/10 h-11 overflow-hidden">
                           <button 
                            className="flex-1 flex items-center justify-center px-4 hover:bg-white/5 border-r border-white/10 transition-colors"
                            onClick={() => setShowFontList(!showFontList)}
                           >
                             <span style={{ fontFamily: selectedElement.style.fontFamily }} className="truncate text-sm">
                               {FONTS.find(f => f.value === selectedElement.style.fontFamily)?.name || 'Default Font'}
                             </span>
                           </button>
                           <button 
                            className="w-12 flex items-center justify-center hover:bg-white/5 transition-colors"
                            onClick={() => setShowFontList(!showFontList)}
                           >
                             <Icons.ChevronDown className={`w-4 h-4 transition-transform ${showFontList ? 'rotate-180' : ''}`} />
                           </button>
                        </div>
                        
                        {showFontList && (
                          <div className="absolute z-[200] top-full mt-2 left-0 right-0 max-h-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-y-auto no-scrollbar py-2">
                             {FONTS.map(font => (
                               <button 
                                 key={font.value}
                                 onClick={() => {
                                   updateElement(selectedElement.id, { style: { ...selectedElement.style, fontFamily: font.value } });
                                   setShowFontList(false);
                                   triggerHaptic(5);
                                 }}
                                 className={`w-full px-5 py-3 text-left hover:bg-white/5 transition-colors ${selectedElement.style.fontFamily === font.value ? 'bg-lime-400/10 text-lime-400' : ''}`}
                                 style={{ fontFamily: font.value }}
                               >
                                 {font.name}
                               </button>
                             ))}
                          </div>
                        )}
                      </div>

                      {/* Text Input */}
                      <div className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 focus-within:border-lime-400/50 transition-colors">
                        <textarea 
                          key={`text-edit-${selectedElement.id}`}
                          defaultValue={selectedElement.content} 
                          onBlur={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                          onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                          className="bg-transparent border-none outline-none w-full text-sm font-medium resize-none h-20 text-white"
                          placeholder="Type something..."
                        />
                      </div>

                      {/* Size and Alignment Control Row */}
                      <div className="flex items-end gap-3">
                         <div className="flex-1 space-y-2">
                           <div className="flex justify-between text-[10px] text-white/40 uppercase"><span>Size</span><span>{selectedElement.style.fontSize}</span></div>
                           <input type="range" min="8" max="200" step="1" value={selectedElement.style.fontSize ?? 24} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, fontSize: parseInt(e.target.value) } })} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-400" />
                         </div>
                         <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/10">
                            {['left', 'center', 'right'].map((align) => (
                              <button 
                                key={align} 
                                onClick={() => { triggerHaptic(2); updateElement(selectedElement.id, { style: { ...selectedElement.style, textAlign: align as any } }); }}
                                className={`p-2 rounded-md transition-all ${selectedElement.style.textAlign === align ? 'bg-lime-400 text-black' : 'text-white/40 hover:text-white'}`}
                              >
                                {align === 'left' && <Icons.MoreHorizontal className="w-4 h-4 rotate-180" />}
                                {align === 'center' && <Icons.MoreHorizontal className="w-4 h-4" />}
                                {align === 'right' && <Icons.MoreHorizontal className="w-4 h-4" />}
                              </button>
                            ))}
                         </div>
                      </div>

                      {/* Weight Selector */}
                      <div className="space-y-2">
                          <div className="text-[10px] text-white/40 uppercase"><span>Font Weight</span></div>
                          <div className="flex gap-2">
                            {['300', '400', '600', '700', '900'].map(weight => (
                              <button 
                                key={weight}
                                onClick={() => { triggerHaptic(2); updateElement(selectedElement.id, { style: { ...selectedElement.style, fontWeight: weight } }); }}
                                className={`flex-1 h-9 rounded-lg border text-xs font-bold ${selectedElement.style.fontWeight === weight ? 'bg-lime-400 border-lime-400 text-black' : 'bg-zinc-900 border-white/10 text-white/40'}`}
                              >
                                {weight}
                              </button>
                            ))}
                          </div>
                      </div>

                      {/* Line Height & Letter Spacing */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] text-white/40 uppercase"><span>Line</span><span>{selectedElement.style.lineHeight?.toFixed(1) || '1.0'}</span></div>
                          <input type="range" min="0.5" max="3" step="0.1" value={selectedElement.style.lineHeight ?? 1.2} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, lineHeight: parseFloat(e.target.value) } })} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-400" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] text-white/40 uppercase"><span>Space</span><span>{selectedElement.style.letterSpacing ?? 0}</span></div>
                          <input type="range" min="-5" max="30" step="1" value={selectedElement.style.letterSpacing ?? 0} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, letterSpacing: parseInt(e.target.value) } })} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-400" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex gap-2 bg-zinc-900 p-2 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                      {themeColors.map(color => (
                        <button 
                          key={color}
                          onClick={() => handleColorClick(color)}
                          style={{ backgroundColor: color }}
                          className={`w-7 h-7 rounded-full shrink-0 border-2 ${selectedElement.style.color === color || selectedElement.style.backgroundColor === color ? 'border-white' : 'border-transparent'} active:scale-90 transition-transform`}
                        />
                      ))}
                    </div>
                  </div>
               </div>
            </Section>

            <Section title="Appearance" id="appearance" icon={<Icons.Sparkles className="w-4 h-4" />} isOpen={openSections.appearance} onToggle={toggleSection}>
               <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-white/40 uppercase"><span>Opacity</span><span>{Math.round((selectedElement.style.opacity ?? 1) * 100)}%</span></div>
                    <input type="range" min="0" max="1" step="0.01" value={selectedElement.style.opacity ?? 1} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, opacity: parseFloat(e.target.value) } })} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-400" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-white/40 uppercase"><span>Border Radius</span><span>{selectedElement.style.borderRadius ?? 0}px</span></div>
                    <input type="range" min="0" max="100" step="1" value={selectedElement.style.borderRadius ?? 0} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, borderRadius: parseInt(e.target.value) } })} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-400" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-white/40 uppercase"><span>Border Width</span><span>{selectedElement.style.strokeWidth ?? 0}px</span></div>
                    <div className="flex items-center gap-3">
                      <input type="range" min="0" max="20" step="1" value={selectedElement.style.strokeWidth ?? 0} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, strokeWidth: parseInt(e.target.value) } })} className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-lime-400" />
                      <div className="flex gap-1">
                        {['solid', 'dashed', 'dotted'].map(pattern => (
                          <button key={pattern} onClick={() => { triggerHaptic(3); updateElement(selectedElement.id, { style: { ...selectedElement.style, strokePattern: pattern as any } }); }} className={`w-8 h-8 bg-zinc-800 border ${selectedElement.style.strokePattern === pattern ? 'border-lime-400 text-lime-400' : 'border-white/5 text-white/40'} flex items-center justify-center rounded-lg text-[10px] font-bold uppercase transition-all`}>{pattern[0]}</button>
                        ))}
                      </div>
                    </div>
                  </div>
               </div>
            </Section>

            <Section title="Layers" id="layers" icon={<Icons.Layout className="w-4 h-4" />} isOpen={openSections.layers} onToggle={toggleSection}>
               <div className="space-y-2">
                 {[...currentPage.elements].reverse().map((el) => (
                   <div key={el.id} className={`flex items-center justify-between p-3 rounded-xl text-xs ${selectedElement.id === el.id ? 'bg-lime-400/10 text-lime-400 border border-lime-400/20' : 'bg-zinc-900/50 border border-white/5'}`}>
                      <span className="truncate flex-1 font-medium">{el.name}</span>
                      <div className="flex gap-1">
                         <button onClick={() => onReorder(el.id, 'up')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><Icons.ChevronUp className="w-4 h-4" /></button>
                         <button onClick={() => onReorder(el.id, 'down')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><Icons.ChevronDown className="w-4 h-4" /></button>
                      </div>
                   </div>
                 ))}
               </div>
            </Section>
          </>
        )}
      </div>

      {!isMobile && (
        <div className="p-5 border-t border-white/10 space-y-3">
           <button 
             onClick={() => (window as any).dispatchEvent(new CustomEvent('open-export-modal'))}
             className="w-full bg-lime-400 text-black h-12 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-lime-300 transition-all active:scale-95 shadow-lg italic"
           >
              <Icons.Download className="w-5 h-5" />
              EXPORT WORK
           </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
