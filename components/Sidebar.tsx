
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './IconLibrary.tsx';
import { DesignElement, Page } from '../types.ts';
import type { User } from 'firebase/auth';

interface SectionProps {
  title: string;
  id: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: string) => void;
}

// Section component with animated accordion
const Section: React.FC<SectionProps> = ({ title, id, icon, children, isOpen, onToggle }) => (
  <div className="border-b border-gray-200 last:border-0">
    <button
      onClick={() => onToggle(id)}
      className="w-full px-5 py-4 flex items-center justify-between text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{title}</span>
      </div>
      <Icons.ChevronDown className={`w-4 h-4 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    <div
      className={`overflow-hidden transition-all ease-in-out duration-500 ${isOpen ? 'max-h-[1000px]' : 'max-h-0'}`}
    >
      <div className="px-5 pb-5 pt-1">
        {children}
      </div>
    </div>
  </div>
);

interface SidebarProps {
  user: User | null;
  designs: any[];
  brandData: any;
  currentDesignId: string | null;
  loadDesign: (id: string) => void;
  createNewDesign: () => void;
  deleteDesign: (id: string) => void;
  importDesign: () => void;
  openBrandDna: () => void;
  selectedElement: DesignElement | null;
  themeColors: string[];
  pages: Page[];
  currentPageIndex: number;
  availableFonts: { name: string; value: string }[];
  recentImages: string[];
  updateElement: (id: string, updates: Partial<DesignElement>) => void;
  updatePage: (updates: Partial<Page>) => void;
  onAddText: (type: 'Header' | 'Subheader' | 'Paragraph') => void;
  onAddShape: (type: string) => void;
  onAddImage: (src: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onAddCustomFont: (name: string, data: ArrayBuffer) => void;
  onDeleteCustomFont: (name: string) => void;
  onUpdateColors?: (colors: string[]) => void;
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  designs,
  brandData,
  currentDesignId,
  loadDesign,
  createNewDesign,
  deleteDesign,
  importDesign,
  openBrandDna,
  selectedElement,
  themeColors,
  pages,
  currentPageIndex,
  availableFonts,
  recentImages,
  updateElement,
  updatePage,
  onAddText,
  onAddShape,
  onAddImage,
  onReorder,
  onAddCustomFont,
  onDeleteCustomFont,
  onUpdateColors,
  isMobile = false
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    history: !isMobile,
    image: !isMobile,
    media: false,
    text: !isMobile,
    appearance: false,
    layers: false,
    elements: isMobile
  });
  const [showFontList, setShowFontList] = useState(false);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const fontUploadRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedElement && selectedElement.type === 'text' && !isMobile) {
      setOpenSections(prev => ({...prev, text: true}));
    }
  }, [selectedElement, isMobile]);

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
    if (!selectedElement) return;
    triggerHaptic(5);
    const propertyToUpdate = selectedElement.type === 'text' || selectedElement.type === 'icon' ? 'color' : 'backgroundColor';
    updateElement(selectedElement.id, { style: { ...selectedElement.style, [propertyToUpdate]: color } });
  };

  const handleAddColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onUpdateColors) {
      const newColors = [...themeColors, e.target.value];
      onUpdateColors(newColors);
      triggerHaptic(20);
    }
  };

  const handleRemoveColor = (color: string) => {
    if (onUpdateColors) {
      onUpdateColors(themeColors.filter(c => c !== color));
      triggerHaptic(5);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => onAddImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (result instanceof ArrayBuffer) {
          onAddCustomFont(file.name.replace(/\.[^/.]+$/, ""), result);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const SHAPES = [
    { id: 'square', label: 'Square', icon: <div className="w-5 h-5 bg-gray-800/20 rounded-sm" /> },
    { id: 'circle', label: 'Circle', icon: <div className="w-5 h-5 bg-gray-800/20 rounded-full" /> },
    { id: 'pill', label: 'Pill', icon: <div className="w-8 h-4 bg-gray-800/20 rounded-full" /> },
    { id: 'triangle', label: 'Triangle', icon: <div className="w-5 h-5 bg-gray-800/20" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} /> },
    { id: 'diamond', label: 'Diamond', icon: <div className="w-5 h-5 bg-gray-800/20" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} /> },
    { id: 'pentagon', label: 'Pentagon', icon: <div className="w-5 h-5 bg-gray-800/20" style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }} /> },
    { id: 'hexagon', label: 'Hexagon', icon: <div className="w-5 h-5 bg-gray-800/20" style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} /> },
    { id: 'star', label: 'Star', icon: <div className="w-5 h-5 bg-gray-800/20" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} /> },
    { id: 'parallelogram', label: 'Para', icon: <div className="w-5 h-5 bg-gray-800/20" style={{ clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)' }} /> },
  ];

  const showFillColor = selectedElement && selectedElement.type !== 'text' && selectedElement.type !== 'image' && selectedElement.type !== 'icon';

  return (
    <div className={`${isMobile ? 'w-full' : 'w-[380px]'} h-full bg-white ${isMobile ? '' : 'border-l'} border-gray-200 flex flex-col select-none overflow-hidden`}>
      <input type="file" ref={imageUploadRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
      <input type="file" ref={fontUploadRef} className="hidden" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} />
      <input type="color" ref={colorPickerRef} className="hidden" onChange={handleAddColor} />

      {!isMobile && (
        <div className="p-5 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Icons.Layout className="w-5 h-5 text-lime-500" />
            <h1 className="font-semibold text-lg italic tracking-tight uppercase text-gray-800">Mockingjay</h1>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <Section title="Design History" id="history" icon={<Icons.History className="w-4 h-4" />} isOpen={openSections.history} onToggle={toggleSection}>
          <div className="space-y-3">
            <div className="flex gap-2">
                <button onClick={createNewDesign} className="w-full bg-lime-400/20 text-lime-600 h-10 rounded-lg text-xs font-bold border border-lime-500/30 hover:bg-lime-400/30 transform transition-all ease-out duration-150 hover:scale-[1.02] active:scale-[0.98] uppercase flex items-center justify-center gap-2">
                <Icons.Plus className="w-4 h-4" /> New Design
                </button>
                <button onClick={importDesign} className="w-full bg-gray-100 h-10 rounded-lg text-xs font-bold border border-gray-200 hover:border-gray-300 hover:bg-gray-200 transform transition-all ease-out duration-150 hover:scale-[1.02] active:scale-[0.98] uppercase flex items-center justify-center gap-2 text-gray-700">
                    <Icons.Upload className="w-4 h-4" /> Import
                </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {designs.map(design => (
                  <div key={design.id} className="group relative">
                    <button
                        onClick={() => loadDesign(design.id)}
                        className={`w-full aspect-[4/3] rounded-lg text-left text-xs overflow-hidden transform transition-all duration-150 ease-out hover:scale-[1.02] active:scale-[0.98] ${currentDesignId === design.id ? 'border-2 border-lime-500' : 'border border-gray-200'}`}>
                        <img src={design.thumbnail} alt="Design thumbnail" className="w-full h-full object-cover bg-gray-100"/>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="font-bold truncate text-white">{design.pages?.[0]?.elements?.[0]?.content || 'Untitled Design'}</p>
                            <p className="text-white/70 text-[10px]">{new Date(design.lastModified).toLocaleDateString()}</p>
                        </div>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); deleteDesign(design.id); }}
                        className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-red-500/50 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100">
                        <Icons.Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
              ))}
            </div>
          </div>
        </Section>
        
        <div className="px-5 py-4 border-b border-gray-200">
           <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Palette</span>
              <button onClick={() => colorPickerRef.current?.click()} className="text-lime-500 hover:scale-110 transition-transform transform"><Icons.Plus className="w-4 h-4" /></button>
           </div>
           <div className="flex gap-2 flex-wrap">
              {themeColors.map(c => (
                <div key={c} className="group relative">
                  <button
                    onClick={() => { triggerHaptic(5); updatePage({ background: c }); }}
                    onContextMenu={(e) => { e.preventDefault(); handleRemoveColor(c); }}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 transform transition-all duration-150 ease-out hover:scale-110 active:scale-95 ${currentPage?.background === c ? 'border-gray-800 shadow-[0_0_10px_rgba(0,0,0,0.2)]' : 'border-gray-200'}`}
                  />
                  <button
                    onClick={() => handleRemoveColor(c)}
                    className="absolute -top-1 -right-1 bg-gray-800/80 rounded-full text-white/70 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icons.Trash2 className="w-2 h-2 m-1" />
                  </button>
                </div>
              ))}
           </div>
            <button
                onClick={openBrandDna}
                className="mt-4 w-full h-10 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 border transition-all duration-150 ease-out active:scale-[0.98] transform"
                style={{
                    background: brandData ? 'linear-gradient(to right, #8B5CF6, #EC4899, #F59E0B, #10B981)' : '#f3f4f6',
                    borderColor: brandData ? 'transparent' : '#e5e7eb',
                    color: brandData ? 'white' : '#374151',
                    padding: '0 1rem'
                }}
            >
            {brandData ? 'Use Brand DNA' : 'Create Brand DNA'}
            </button>
        </div>

        <Section title="Media" id="media" icon={<Icons.ImageIcon className="w-4 h-4" />} isOpen={openSections.media} onToggle={toggleSection}>
           {recentImages.length > 0 ? (
             <div className="space-y-3">
               <div className="grid grid-cols-3 gap-2">
                 {recentImages.map((src, idx) => (
                   <button key={idx} onClick={() => { triggerHaptic(5); onAddImage(src); }} className="group relative aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 bg-gray-100 active:scale-95 transition-transform transform">
                     <img src={src} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={`Recent ${idx}`} />
                     <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                     {idx === 0 && <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-lime-400 text-black text-[7px] font-black uppercase rounded-[2px] tracking-tighter shadow-sm">Latest</span>}
                   </button>
                 ))}
               </div>
             </div>
           ) : (
             <div className="py-8 px-4 text-center border-2 border-dashed border-gray-200 rounded-2xl">
               <Icons.ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
               <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">No recent media</p>
             </div>
           )}
        </Section>

        <Section title="Assets" id="image" icon={<Icons.Plus className="w-4 h-4" />} isOpen={openSections.image} onToggle={toggleSection}>
           <div className="space-y-4">
              <button onClick={() => imageUploadRef.current?.click()} className="w-full bg-gray-100 p-4 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors active:scale-95 transform border border-gray-200 font-bold uppercase tracking-wider text-gray-700">
                 <Icons.ImageIcon className="w-5 h-5 text-lime-500"/> Device Image
              </button>
              <div className="grid grid-cols-3 gap-2">
                {SHAPES.map(shape => (
                  <button key={shape.id} onClick={() => { triggerHaptic(5); onAddShape(shape.id); }} className="bg-gray-100/50 p-3 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-200 transition-colors active:scale-90 transform border border-gray-200">
                    {shape.icon}
                    <span className="text-[9px] uppercase font-bold text-gray-500">{shape.label}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-2 pt-2">
                  <button onClick={() => onAddText('Header')} className="w-full h-10 bg-gray-100 rounded-lg text-sm font-bold border border-gray-200 hover:border-gray-300 hover:bg-gray-200 active:scale-[0.98] transform transition-colors uppercase text-gray-700">Add Header</button>
                  <button onClick={() => onAddText('Subheader')} className="w-full h-10 bg-gray-100 rounded-lg text-sm font-medium border border-gray-200 hover:border-gray-300 hover:bg-gray-200 active:scale-[0.98] transform transition-colors uppercase text-gray-600">Add Subheader</button>
                  <button onClick={() => onAddText('Paragraph')} className="w-full h-10 bg-gray-100 rounded-lg text-xs border border-gray-200 hover:border-gray-300 hover:bg-gray-200 active:scale-[0.98] transform transition-colors uppercase text-gray-500">Add Paragraph</button>
              </div>
           </div>
        </Section>

        {selectedElement && (
          <>
            <Section title="Element Edit" id="text" icon={<Icons.Type className="w-4 h-4" />} isOpen={openSections.text} onToggle={toggleSection}>
               <div className="space-y-4">
                  {selectedElement.type === 'text' && (
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="flex bg-white rounded-full border border-gray-200 h-11 overflow-hidden">
                           <button className="flex-1 flex items-center justify-center px-4 hover:bg-gray-100/50 border-r border-gray-200 transition-colors" onClick={() => setShowFontList(!showFontList)}>
                             <span style={{ fontFamily: selectedElement.style.fontFamily }} className="truncate text-sm font-bold italic text-gray-800">
                               {availableFonts.find(f => f.value === selectedElement.style.fontFamily)?.name || 'Default Font'}
                             </span>
                           </button>
                           <button className="w-12 flex items-center justify-center hover:bg-gray-100/50 transition-colors" onClick={() => setShowFontList(!showFontList)}>
                             <Icons.ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showFontList ? 'rotate-180' : ''}`} />
                           </button>
                        </div>
                        {showFontList && (
                          <div className="absolute z-[200] top-full mt-2 left-0 right-0 max-h-80 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-y-auto no-scrollbar py-2 animate-in slide-in-from-top-4 fade-in duration-200">
                             <div className="px-5 py-2 border-b border-gray-200 mb-2">
                                <button onClick={() => { setShowFontList(false); fontUploadRef.current?.click(); }} className="w-full bg-lime-400 h-9 rounded-lg text-black text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transform transition-transform">
                                   <Icons.Plus className="w-3 h-3" /> Upload Font
                                </button>
                             </div>
                             {availableFonts.map(font => (
                               <div key={font.value} className="group relative">
                                 <button onClick={() => { updateElement(selectedElement.id, { style: { ...selectedElement.style, fontFamily: font.value } }); setShowFontList(false); triggerHaptic(5); }} className={`w-full px-5 py-3 text-left hover:bg-gray-100 transition-colors text-gray-800 ${selectedElement.style.fontFamily === font.value ? 'bg-lime-400/20 text-lime-600' : ''}`} style={{ fontFamily: font.value }}>{font.name}</button>
                                 {font.value.startsWith("'") && !["'Debrosee'", "'Pirate One'", "'Inter'", "'Playfair Display'", "'Montserrat'"].some(b => font.value.includes(b)) && (
                                   <button onClick={(e) => { e.stopPropagation(); onDeleteCustomFont(font.name); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Icons.Trash2 className="w-4 h-4" /></button>
                                 )}
                               </div>
                             ))}
                          </div>
                        )}
                      </div>
                      <div className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 focus-within:border-lime-500/50 transition-colors">
                        <textarea value={selectedElement.content} onBlur={(e) => updateElement(selectedElement.id, { content: e.target.value })} onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} className="bg-transparent border-none outline-none w-full text-sm font-medium resize-none h-20 text-gray-800" placeholder="Type something..."/>
                      </div>
                      <div className="flex items-end gap-3">
                         <div className="flex-1 space-y-2">
                           <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold"><span>Size</span><span>{selectedElement.style.fontSize}</span></div>
                           <input type="range" min="8" max="250" step="1" value={selectedElement.style.fontSize ?? 24} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, fontSize: parseInt(e.target.value) } })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-lime-500" />
                         </div>
                         <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                            {['left', 'center', 'right'].map((align) => (
                              <button key={align} onClick={() => { triggerHaptic(2); updateElement(selectedElement.id, { style: { ...selectedElement.style, textAlign: align as any } }); }} className={`p-2 rounded-md transition-all ${selectedElement.style.textAlign === align ? 'bg-lime-400 text-black' : 'text-gray-500 hover:text-gray-800'}`}>{align[0].toUpperCase()}</button>
                            ))}
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold"><span>Line</span><span>{selectedElement.style.lineHeight?.toFixed(1) || '1.0'}</span></div>
                          <input type="range" min="0.5" max="3" step="0.1" value={selectedElement.style.lineHeight ?? 1.2} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, lineHeight: parseFloat(e.target.value) } })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-lime-500" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold"><span>Space</span><span>{selectedElement.style.letterSpacing ?? 0}</span></div>
                          <input type="range" min="-5" max="30" step="1" value={selectedElement.style.letterSpacing ?? 0} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, letterSpacing: parseInt(e.target.value) } })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-lime-500" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex gap-2 bg-gray-100 p-2 rounded-xl border border-gray-200 overflow-x-auto no-scrollbar">
                      {themeColors.map(color => (
                        <button key={color} onClick={() => handleColorClick(color)} style={{ backgroundColor: color }} className={`w-7 h-7 rounded-full shrink-0 border-2 transform transition-all active:scale-90 ${selectedElement.style.color === color || (showFillColor && selectedElement.style.backgroundColor === color) ? 'border-gray-800' : 'border-transparent'}`}/>
                      ))}
                    </div>
                  </div>
               </div>
            </Section>

            <Section title="Design" id="appearance" icon={<Icons.Sparkles className="w-4 h-4" />} isOpen={openSections.appearance} onToggle={toggleSection}>
               <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold"><span>Opacity</span><span>{Math.round((selectedElement.style.opacity ?? 1) * 100)}%</span></div>
                    <input type="range" min="0" max="1" step="0.01" value={selectedElement.style.opacity ?? 1} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, opacity: parseFloat(e.target.value) } })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-lime-500" />
                  </div>
                  {showFillColor && <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold"><span>Roundness</span><span>{selectedElement.style.borderRadius ?? 0}px</span></div>
                    <input type="range" min="0" max="200" step="1" value={selectedElement.style.borderRadius ?? 0} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, borderRadius: parseInt(e.target.value) } })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-lime-500" />
                  </div>}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold"><span>Border</span><span>{selectedElement.style.strokeWidth ?? 0}px</span></div>
                    <input type="range" min="0" max="30" step="1" value={selectedElement.style.strokeWidth ?? 0} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, strokeWidth: parseInt(e.target.value) } })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-lime-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold"><span>Perspective</span><span>{selectedElement.style.perspective ?? 1000}px</span></div>
                    <input type="range" min="0" max="2000" step="10" value={selectedElement.style.perspective ?? 1000} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, perspective: parseInt(e.target.value) } })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-lime-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold"><span>Vertical Tilt</span><span>{selectedElement.style.rotateX ?? 0}°</span></div>
                    <input type="range" min="-90" max="90" step="1" value={selectedElement.style.rotateX ?? 0} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, rotateX: parseInt(e.target.value) } })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-lime-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold"><span>Horizontal Tilt</span><span>{selectedElement.style.rotateY ?? 0}°</span></div>
                    <input type="range" min="-90" max="90" step="1" value={selectedElement.style.rotateY ?? 0} onChange={(e) => updateElement(selectedElement.id, { style: { ...selectedElement.style, rotateY: parseInt(e.target.value) } })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-lime-500" />
                  </div>
               </div>
            </Section>

            <Section title="Layers" id="layers" icon={<Icons.Layout className="w-4 h-4" />} isOpen={openSections.layers} onToggle={toggleSection}>
               <div className="space-y-2">
                 {currentPage?.elements.slice().reverse().map((el) => (
                   <div key={el.id} className={`flex items-center justify-between p-3 rounded-xl text-xs transition-colors ${selectedElement.id === el.id ? 'bg-lime-400/20 text-lime-700 border border-lime-500/30' : 'bg-gray-100 border border-gray-200 text-gray-600'}`}>
                      <span className="truncate flex-1 font-bold italic">{el.name}</span>
                      <div className="flex gap-1">
                         <button onClick={() => onReorder(el.id, 'up')} className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"><Icons.ChevronUp className="w-4 h-4" /></button>
                         <button onClick={() => onReorder(el.id, 'down')} className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"><Icons.ChevronDown className="w-4 h-4" /></button>
                      </div>
                   </div>
                 ))}
               </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
