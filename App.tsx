
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EditorState, DesignElement, BoundingBox, Page } from './types.ts';
import { INITIAL_STATE, CANVAS_WIDTH, CANVAS_HEIGHT, FONTS } from './constants.ts';
import { generateId, downloadTemplate } from './utils.ts';
import Sidebar from './components/Sidebar.tsx';
import ElementRenderer from './components/ElementRenderer.tsx';
import { Icons } from './components/IconLibrary.tsx';

interface SnapLine {
  type: 'vertical' | 'horizontal';
  position: number;
}

const App: React.FC = () => {
  const [state, setState] = useState<EditorState>(INITIAL_STATE);
  const [dragStart, setDragStart] = useState<{ x: number, y: number, type: 'move' | 'resize' | 'rotate', handle?: string, initialAngle?: number } | null>(null);
  const [elementStartPos, setElementStartPos] = useState<BoundingBox | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updateScale = () => {
      if (!workspaceRef.current) return;
      const ws = workspaceRef.current;
      const padding = isMobile ? 40 : 120;
      const availableWidth = ws.clientWidth - padding;
      const availableHeight = ws.clientHeight - padding;
      const sx = availableWidth / CANVAS_WIDTH;
      const sy = availableHeight / CANVAS_HEIGHT;
      setScale(Math.min(sx, sy, 1));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isMobile]);

  const currentPage = state.pages[state.currentPageIndex];
  const selectedElement = currentPage.elements.find(e => e.id === state.selectedElementId) || null;

  const triggerHaptic = useCallback((intensity = 10) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(intensity);
    }
  }, []);

  const deleteElement = (id: string) => {
    setState(prev => {
      const newPages = [...prev.pages];
      newPages[prev.currentPageIndex].elements = newPages[prev.currentPageIndex].elements.filter(el => el.id !== id);
      return { ...prev, pages: newPages, selectedElementId: null };
    });
  };

  const updateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    setState(prev => {
      const newPages = [...prev.pages];
      const page = newPages[prev.currentPageIndex];
      page.elements = page.elements.map(el => el.id === id ? { ...el, ...updates, style: { ...el.style, ...updates.style } } : el);
      return { ...prev, pages: newPages };
    });
  }, []);

  const updatePage = (updates: Partial<Page>) => {
    setState(prev => {
      const newPages = [...prev.pages];
      newPages[prev.currentPageIndex] = { ...newPages[prev.currentPageIndex], ...updates };
      return { ...prev, pages: newPages };
    });
  };

  const handleSelect = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    if (state.selectedElementId !== id) {
      triggerHaptic(5);
    }
    setState(prev => ({ ...prev, selectedElementId: id }));
    
    const element = currentPage.elements.find(el => el.id === id);
    if (element && !element.locked) {
      setDragStart({ x: e.clientX, y: e.clientY, type: 'move' });
      setElementStartPos({ ...element.box });
    }
  }, [currentPage.elements, state.selectedElementId, triggerHaptic]);

  const deselectAll = () => setState(prev => ({ ...prev, selectedElementId: null }));

  const addElement = (element: Partial<DesignElement>) => {
    const newElement: DesignElement = {
      id: generateId(),
      name: element.name || (element.type ? `${element.type.charAt(0).toUpperCase() + element.type.slice(1)}` : 'Element'),
      type: (element.type as any) || 'shape',
      box: { x: (CANVAS_WIDTH - 200) / 2, y: (CANVAS_HEIGHT - 200) / 2, width: 200, height: 200, rotation: 0 },
      content: '',
      style: { backgroundColor: '#FFFFFF', color: '#000000', borderRadius: 0, opacity: 1, strokeWidth: 0, strokePattern: 'solid', strokeColor: '#000000', letterSpacing: 0, lineHeight: 1.2, fontFamily: FONTS[0].value },
      visible: true,
      locked: false,
      ...element
    };
    setState(prev => {
      const newPages = [...prev.pages];
      newPages[prev.currentPageIndex].elements.push(newElement);
      return { ...prev, pages: newPages, selectedElementId: newElement.id };
    });
    triggerHaptic(15);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragStart || !elementStartPos || !state.selectedElementId) return;

    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;

    if (dragStart.type === 'move') {
      let nextX = elementStartPos.x + dx;
      let nextY = elementStartPos.y + dy;
      
      const centerX = nextX + elementStartPos.width / 2;
      const centerY = nextY + elementStartPos.height / 2;
      
      const activeLines: SnapLine[] = [];
      const threshold = 5;

      if (Math.abs(centerX - CANVAS_WIDTH / 2) < threshold) {
        nextX = CANVAS_WIDTH / 2 - elementStartPos.width / 2;
        activeLines.push({ type: 'vertical', position: CANVAS_WIDTH / 2 });
      }
      if (Math.abs(centerY - CANVAS_HEIGHT / 2) < threshold) {
        nextY = CANVAS_HEIGHT / 2 - elementStartPos.height / 2;
        activeLines.push({ type: 'horizontal', position: CANVAS_HEIGHT / 2 });
      }

      if (activeLines.length > snapLines.length) triggerHaptic(8);
      setSnapLines(activeLines);

      updateElement(state.selectedElementId, { 
        box: { ...elementStartPos, x: nextX, y: nextY } 
      });
    } else if (dragStart.type === 'resize' && dragStart.handle) {
      let { x, y, width, height } = elementStartPos;
      if (dragStart.handle.includes('e')) width += dx;
      if (dragStart.handle.includes('s')) height += dy;
      if (dragStart.handle.includes('w')) { x += dx; width -= dx; }
      if (dragStart.handle.includes('n')) { y += dy; height -= dy; }
      width = Math.max(10, width);
      height = Math.max(10, height);
      updateElement(state.selectedElementId, { box: { ...elementStartPos, x, y, width, height } });
    } else if (dragStart.type === 'rotate') {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const centerX = rect.left + (elementStartPos.x + elementStartPos.width / 2) * scale;
        const centerY = rect.top + (elementStartPos.y + elementStartPos.height / 2) * scale;
        
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        const initialPointerAngle = dragStart.initialAngle ?? 0;
        const deltaAngle = currentAngle - initialPointerAngle;
        
        let newRotation = elementStartPos.rotation + deltaAngle;
        
        if (Math.abs(newRotation % 45) < 3 || Math.abs(newRotation % 45) > 42) {
          const snapped = Math.round(newRotation / 45) * 45;
          if (snapped !== Math.round(state.pages[state.currentPageIndex].elements.find(el => el.id === state.selectedElementId)?.box.rotation)) {
            triggerHaptic(5);
          }
          newRotation = snapped;
        }

        updateElement(state.selectedElementId, { box: { ...elementStartPos, rotation: newRotation } });
    }
  }, [dragStart, elementStartPos, state, updateElement, scale, snapLines.length, triggerHaptic]);

  const handlePointerUp = useCallback(() => {
    setDragStart(null);
    setElementStartPos(null);
    setSnapLines([]);
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const onReorder = (id: string, direction: 'up' | 'down') => {
    setState(prev => {
      const newPages = [...prev.pages];
      const elements = [...newPages[prev.currentPageIndex].elements];
      const index = elements.findIndex(el => el.id === id);
      if (index === -1) return prev;
      const newIndex = direction === 'up' ? index + 1 : index - 1;
      if (newIndex < 0 || newIndex >= elements.length) return prev;
      const [moved] = elements.splice(index, 1);
      elements.splice(newIndex, 0, moved);
      newPages[prev.currentPageIndex].elements = elements;
      return { ...prev, pages: newPages };
    });
    triggerHaptic(5);
  };

  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedState = JSON.parse(content);
        if (importedState.pages) {
          setState(importedState);
          triggerHaptic(20);
        }
      } catch (err) {
        console.error("Failed to import template:", err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-screen w-full bg-black overflow-hidden select-none touch-none">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="application/json" 
        onChange={handleImportTemplate} 
      />
      
      <div className="flex-1 flex flex-col relative canvas-container overflow-hidden">
        {/* Header Controls */}
        <div className={`absolute top-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-6 bg-zinc-900/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/10 shadow-2xl transition-opacity ${isBottomSheetOpen && isMobile ? 'opacity-0' : 'opacity-100'}`}>
           <button className="p-1 hover:text-white/60 transition-colors"><Icons.ArrowLeft className="w-5 h-5"/></button>
           <span className="text-xs font-bold text-white/40">{state.currentPageIndex + 1}/{state.pages.length}</span>
           <button className="p-1 hover:text-white/60 transition-colors"><Icons.ArrowRight className="w-5 h-5"/></button>
           <div className="w-[1px] h-4 bg-white/10 mx-2" />
           <button className="p-1 hover:text-lime-400 transition-colors" onClick={() => fileInputRef.current?.click()}><Icons.Plus className="w-5 h-5"/></button>
           <button className="p-1 hover:text-red-400 transition-colors" onClick={() => selectedElement && deleteElement(selectedElement.id)}><Icons.Trash2 className="w-5 h-5"/></button>
        </div>

        {/* Workspace */}
        <div ref={workspaceRef} className="flex-1 flex items-center justify-center relative overflow-hidden">
           {snapLines.map((line, i) => (
             <div 
               key={i}
               className="absolute bg-lime-400 z-[100] pointer-events-none"
               style={{
                 left: line.type === 'vertical' ? `calc(50% + (${line.position - CANVAS_WIDTH / 2}px * ${scale}))` : 0,
                 top: line.type === 'horizontal' ? `calc(50% + (${line.position - CANVAS_HEIGHT / 2}px * ${scale}))` : 0,
                 width: line.type === 'vertical' ? '1px' : '100%',
                 height: line.type === 'horizontal' ? '1px' : '100%',
                 opacity: 0.6
               }}
             />
           ))}

           <div 
             id="design-canvas"
             ref={canvasRef}
             onPointerDown={deselectAll}
             className="relative shadow-[0_0_120px_rgba(0,0,0,0.8)] transition-all duration-300 origin-center"
             style={{ 
               width: CANVAS_WIDTH, 
               height: CANVAS_HEIGHT, 
               transform: `scale(${scale})`,
               backgroundColor: currentPage.background.startsWith('#') ? currentPage.background : undefined,
               backgroundImage: !currentPage.background.startsWith('#') ? `url(${currentPage.background})` : undefined,
               backgroundSize: 'cover',
               backgroundPosition: 'center'
             }}
           >
              {currentPage.elements.map(el => (
                <div key={el.id}>
                  <ElementRenderer 
                    element={el}
                    isSelected={state.selectedElementId === el.id}
                    onSelect={handleSelect}
                  />
                  {state.selectedElementId === el.id && (
                    <div 
                      className="absolute pointer-events-none" 
                      style={{ 
                        left: el.box.x, top: el.box.y, width: el.box.width, height: el.box.height, 
                        transform: `rotate(${el.box.rotation}deg)`, zIndex: 60,
                        border: '2px solid #bef264'
                      }}
                    >
                      {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map(h => {
                        let positionStyles: React.CSSProperties = {};
                        if (h === 'nw') positionStyles = { top: '-12px', left: '-12px' };
                        if (h === 'ne') positionStyles = { top: '-12px', right: '-12px' };
                        if (h === 'sw') positionStyles = { bottom: '-12px', left: '-12px' };
                        if (h === 'se') positionStyles = { bottom: '-12px', right: '-12px' };
                        if (h === 'n') positionStyles = { top: '-12px', left: '50%', transform: 'translateX(-50%)' };
                        if (h === 's') positionStyles = { bottom: '-12px', left: '50%', transform: 'translateX(-50%)' };
                        if (h === 'e') positionStyles = { right: '-12px', top: '50%', transform: 'translateY(-50%)' };
                        if (h === 'w') positionStyles = { left: '-12px', top: '50%', transform: 'translateY(-50%)' };

                        const isCorner = h.length === 2;
                        return (
                          <div 
                            key={h}
                            onPointerDown={(e) => { 
                              e.stopPropagation(); 
                              setDragStart({ x: e.clientX, y: e.clientY, type: 'resize', handle: h }); 
                              setElementStartPos({...el.box}); 
                              triggerHaptic(5);
                            }}
                            style={positionStyles}
                            className={`absolute bg-white border-2 border-lime-400 pointer-events-auto shadow-lg ${isCorner ? 'w-6 h-6 rounded-full' : 'w-10 h-3 rounded-sm'} z-50 hover:scale-110 active:scale-95 transition-transform`}
                          />
                        );
                      })}

                      <div 
                        onPointerDown={(e) => { 
                          e.stopPropagation(); 
                          const rect = canvasRef.current?.getBoundingClientRect();
                          if (!rect) return;
                          const centerX = rect.left + (el.box.x + el.box.width / 2) * scale;
                          const centerY = rect.top + (el.box.y + el.box.height / 2) * scale;
                          const initialAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
                          
                          setDragStart({ x: e.clientX, y: e.clientY, type: 'rotate', initialAngle }); 
                          setElementStartPos({...el.box}); 
                          triggerHaptic(10);
                        }}
                        className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-14 h-14 bg-zinc-900 border border-white/20 rounded-full flex items-center justify-center pointer-events-auto cursor-pointer hover:bg-zinc-800 active:scale-90 transition-all shadow-2xl"
                      >
                         <Icons.RotateCw className="w-7 h-7 text-lime-400" />
                      </div>

                      <div 
                        onPointerDown={(e) => handleSelect(el.id, e)}
                        className="absolute -top-24 left-1/2 -translate-x-1/2 bg-lime-400 px-6 py-2.5 rounded-full flex items-center gap-3 text-[12px] text-black font-bold uppercase tracking-widest shadow-xl animate-bounce pointer-events-auto cursor-grab active:cursor-grabbing"
                      >
                         <Icons.Move className="w-5 h-5" /> Move
                      </div>
                    </div>
                  )}
                </div>
              ))}
           </div>
        </div>

        {/* Footer Navigation / Bottom Sheet Trigger */}
        {!isMobile ? (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-4 bg-zinc-900/90 backdrop-blur rounded-3xl border border-white/10 shadow-2xl">
            <button className="text-white/40 hover:text-white" onClick={() => triggerHaptic(5)}><Icons.Undo2 className="w-5 h-5"/></button>
            <button className="text-white/40 hover:text-white" onClick={() => triggerHaptic(5)}><Icons.Redo2 className="w-5 h-5"/></button>
            <div className="w-[1px] h-6 bg-white/10" />
            <button 
              onClick={() => downloadTemplate(state)}
              className="flex items-center gap-2 bg-lime-400 text-black px-6 py-2 rounded-full font-bold hover:bg-lime-300 transition-all text-sm"
            >
              <Icons.Download className="w-4 h-4" /> Export Template
            </button>
          </div>
        ) : (
          <div className={`absolute bottom-0 left-0 right-0 z-[100] transition-transform duration-300 ${isBottomSheetOpen ? 'translate-y-full' : 'translate-y-0'}`}>
            <div className="mx-4 mb-4 bg-zinc-900/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                  {selectedElement ? (
                    <>
                      <button onClick={() => setIsBottomSheetOpen(true)} className="flex flex-col items-center gap-1 text-lime-400 p-2 min-w-[50px]">
                        <Icons.Sparkles className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase">Style</span>
                      </button>
                      <button onClick={() => setIsBottomSheetOpen(true)} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]">
                        <Icons.Layout className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase">Layer</span>
                      </button>
                      <button onClick={() => deleteElement(selectedElement.id)} className="flex flex-col items-center gap-1 text-red-400 p-2 min-w-[50px]">
                        <Icons.Trash2 className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase">Delete</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setIsBottomSheetOpen(true)} className="flex flex-col items-center gap-1 text-lime-400 p-2 min-w-[50px]">
                        <Icons.Plus className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase">Add</span>
                      </button>
                      <div className="flex gap-2 items-center">
                         {state.themeColors.slice(0, 3).map(c => (
                           <button key={c} onClick={() => updatePage({ background: c })} className={`w-8 h-8 rounded-full border ${currentPage.background === c ? 'border-white' : 'border-white/20'}`} style={{ backgroundColor: c }} />
                         ))}
                      </div>
                    </>
                  )}
                </div>
                <button onClick={() => setIsBottomSheetOpen(true)} className="bg-white/5 p-3 rounded-full shrink-0">
                  <Icons.ChevronUp className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Sheet Sidebar */}
        {isMobile && isBottomSheetOpen && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" onClick={() => setIsBottomSheetOpen(false)}>
            <div 
              className="absolute bottom-0 left-0 right-0 h-[85vh] bg-[#111] rounded-t-[32px] overflow-hidden bottom-sheet-transition flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 shrink-0" />
              <div className="flex-1 overflow-y-auto">
                <Sidebar 
                  selectedElement={selectedElement}
                  themeColors={state.themeColors}
                  pages={state.pages}
                  currentPageIndex={state.currentPageIndex}
                  updateElement={updateElement}
                  updatePage={updatePage}
                  onReorder={onReorder}
                  isMobile={true}
                  onColorChange={(color) => {
                    if (selectedElement) {
                      const key = selectedElement.type === 'text' || selectedElement.type === 'icon' ? 'color' : 'backgroundColor';
                      updateElement(selectedElement.id, { style: { ...selectedElement.style, [key]: color } });
                    }
                  }}
                  onAddText={(type) => {
                    addElement({ 
                      type: 'text', 
                      name: type, 
                      content: type === 'Header' ? 'HEADER' : (type === 'Subheader' ? 'Subheader' : 'Paragraph text.'), 
                      style: { fontSize: type === 'Header' ? 42 : 24, fontFamily: FONTS[0].value, color: '#FFF', textAlign: 'center', lineHeight: 1.2, letterSpacing: 0 }, 
                      box: { x: 30, y: 150, width: 300, height: 100, rotation: 0 } 
                    });
                    setIsBottomSheetOpen(false);
                  }}
                  onAddShape={(shape) => {
                    addElement({ type: 'shape', name: shape, style: { backgroundColor: '#E85D3D', borderRadius: shape === 'circle' ? 100 : 0 }, box: { x: 130, y: 250, width: 100, height: 100, rotation: 0 } });
                    setIsBottomSheetOpen(false);
                  }}
                  onAddImage={(src) => {
                    addElement({ type: 'image', name: 'Image', content: src, style: { borderRadius: 24 }, box: { x: 40, y: 200, width: 280, height: 400, rotation: 0 } });
                    setIsBottomSheetOpen(false);
                  }}
                />
              </div>
              <div className="p-5 bg-zinc-900 border-t border-white/10 grid grid-cols-2 gap-3">
                 <button 
                  onClick={() => downloadTemplate(state)} 
                  className="bg-white/5 text-white h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                   <Icons.Download className="w-4 h-4"/> Template
                 </button>
                 <button 
                  onClick={() => setIsBottomSheetOpen(false)} 
                  className="bg-lime-400 text-black h-12 rounded-xl font-bold text-sm"
                >
                   Done
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isMobile && (
        <Sidebar 
          selectedElement={selectedElement}
          themeColors={state.themeColors}
          pages={state.pages}
          currentPageIndex={state.currentPageIndex}
          updateElement={updateElement}
          updatePage={updatePage}
          onReorder={onReorder}
          isMobile={false}
          onColorChange={(color) => {
            if (selectedElement) {
              const key = selectedElement.type === 'text' || selectedElement.type === 'icon' ? 'color' : 'backgroundColor';
              updateElement(selectedElement.id, { style: { ...selectedElement.style, [key]: color } });
            }
          }}
          onAddText={(type) => addElement({ type: 'text', name: type, content: type === 'Header' ? 'HEADER' : (type === 'Subheader' ? 'Subheader' : 'Paragraph text.'), style: { fontSize: type === 'Header' ? 42 : 24, fontFamily: FONTS[0].value, color: '#FFF', textAlign: 'center', lineHeight: 1.2, letterSpacing: 0 }, box: { x: 30, y: 150, width: 300, height: 100, rotation: 0 } })}
          onAddShape={(shape) => addElement({ type: 'shape', name: shape, style: { backgroundColor: '#E85D3D', borderRadius: shape === 'circle' ? 100 : 0 }, box: { x: 130, y: 250, width: 100, height: 100, rotation: 0 } })}
          onAddImage={(src) => addElement({ type: 'image', name: 'Image', content: src, style: { borderRadius: 24 }, box: { x: 40, y: 200, width: 280, height: 400, rotation: 0 } })}
        />
      )}
    </div>
  );
};

export default App;
