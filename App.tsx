
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EditorState, DesignElement, BoundingBox, Page } from './types.ts';
import { INITIAL_STATE, CANVAS_WIDTH, CANVAS_HEIGHT, FONTS } from './constants.ts';
import { generateId } from './utils.ts';
import Sidebar from './components/Sidebar.tsx';
import ElementRenderer from './components/ElementRenderer.tsx';
import { Icons } from './components/IconLibrary.tsx';

const App: React.FC = () => {
  const [state, setState] = useState<EditorState>(INITIAL_STATE);
  const [dragStart, setDragStart] = useState<{ x: number, y: number, type: 'move' | 'resize' | 'rotate', handle?: string } | null>(null);
  const [elementStartPos, setElementStartPos] = useState<BoundingBox | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  // Moved scale state declaration to the top to avoid 'used before declaration' error
  const [scale, setScale] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update scale effect moved up to be near the state declaration
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && state.selectedElementId) {
        deleteElement(state.selectedElementId);
      }
      if (e.key === 'Delete' && state.selectedElementId) {
        deleteElement(state.selectedElementId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedElementId]);

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
      page.elements = page.elements.map(el => el.id === id ? { ...el, ...updates } : el);
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
  };

  const handleSelect = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setState(prev => ({ ...prev, selectedElementId: id }));
    
    const element = currentPage.elements.find(el => el.id === id);
    if (element && !element.locked) {
      setDragStart({ x: e.clientX, y: e.clientY, type: 'move' });
      setElementStartPos({ ...element.box });
    }
  }, [currentPage.elements]);

  const deselectAll = () => setState(prev => ({ ...prev, selectedElementId: null }));

  const addElement = (element: Partial<DesignElement>) => {
    const newElement: DesignElement = {
      id: generateId(),
      name: element.name || (element.type ? `${element.type.charAt(0).toUpperCase() + element.type.slice(1)}` : 'Element'),
      type: (element.type as any) || 'shape',
      box: { x: (CANVAS_WIDTH - 200) / 2, y: (CANVAS_HEIGHT - 200) / 2, width: 200, height: 200, rotation: 0 },
      content: '',
      style: { backgroundColor: '#FFFFFF', color: '#000000', borderRadius: 0, opacity: 1, strokeWidth: 0, strokePattern: 'solid', strokeColor: '#000000' },
      visible: true,
      locked: false,
      ...element
    };
    setState(prev => {
      const newPages = [...prev.pages];
      newPages[prev.currentPageIndex].elements.push(newElement);
      return { ...prev, pages: newPages, selectedElementId: newElement.id };
    });
  };

  // Fixed: scale is now declared before handlePointerMove
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragStart || !elementStartPos || !state.selectedElementId) return;

    // Correct for canvas scale
    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;

    if (dragStart.type === 'move') {
      updateElement(state.selectedElementId, { 
        box: { ...elementStartPos, x: elementStartPos.x + dx, y: elementStartPos.y + dy } 
      });
    } else if (dragStart.type === 'resize' && dragStart.handle) {
      let { x, y, width, height } = elementStartPos;
      
      if (dragStart.handle.includes('e')) width += dx;
      if (dragStart.handle.includes('s')) height += dy;
      if (dragStart.handle.includes('w')) { x += dx; width -= dx; }
      if (dragStart.handle.includes('n')) { y += dy; height -= dy; }
      
      // Minimum sizes
      width = Math.max(10, width);
      height = Math.max(10, height);

      updateElement(state.selectedElementId, { box: { ...elementStartPos, x, y, width, height } });
    } else if (dragStart.type === 'rotate') {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const centerX = rect.left + (elementStartPos.x + elementStartPos.width / 2) * scale;
        const centerY = rect.top + (elementStartPos.y + elementStartPos.height / 2) * scale;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
        updateElement(state.selectedElementId, { box: { ...elementStartPos, rotation: angle } });
    }
  }, [dragStart, elementStartPos, state.selectedElementId, updateElement, scale]);

  const handlePointerUp = useCallback(() => {
    setDragStart(null);
    setElementStartPos(null);
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const renderSidebarContent = () => (
    <Sidebar 
      selectedElement={selectedElement}
      themeColors={state.themeColors}
      pages={state.pages}
      currentPageIndex={state.currentPageIndex}
      updateElement={updateElement}
      updatePage={updatePage}
      onReorder={onReorder}
      isMobile={isMobile}
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
          content: type === 'Header' ? 'LOREM IPSUM' : (type === 'Subheader' ? 'Subheader text' : 'Add your paragraph text here.'),
          style: { 
            fontSize: type === 'Header' ? 42 : (type === 'Subheader' ? 24 : 14), 
            fontFamily: type === 'Header' ? FONTS[1].value : FONTS[2].value,
            color: '#FFFFFF',
            fontWeight: type === 'Header' ? '900' : 'normal',
            textAlign: 'center',
            opacity: 1
          },
          box: { x: 30, y: 150, width: 300, height: type === 'Header' ? 60 : 100, rotation: 0 }
        });
        if (isMobile) setIsBottomSheetOpen(false);
      }}
      onAddShape={(shape) => {
        addElement({
          type: 'shape',
          name: shape,
          style: { backgroundColor: '#E85D3D', borderRadius: shape === 'circle' ? 100 : (shape === 'pill' ? 50 : 0), opacity: 1 },
          box: { x: 130, y: 250, width: 100, height: shape === 'pill' ? 40 : 100, rotation: 0 }
        });
        if (isMobile) setIsBottomSheetOpen(false);
      }}
      onAddImage={(src) => {
        addElement({
          type: 'image',
          name: 'Image',
          content: src,
          style: { borderRadius: 24, opacity: 1, strokeWidth: 0 },
          box: { x: 40, y: 200, width: 280, height: 400, rotation: 0 }
        });
        if (isMobile) setIsBottomSheetOpen(false);
      }}
    />
  );

  const getResizeCursor = (handle: string) => {
    switch(handle) {
      case 'nw': return 'nwse-resize';
      case 'ne': return 'nesw-resize';
      case 'sw': return 'nesw-resize';
      case 'se': return 'nwse-resize';
      case 'n': return 'ns-resize';
      case 's': return 'ns-resize';
      case 'e': return 'ew-resize';
      case 'w': return 'ew-resize';
      default: return 'move';
    }
  };

  return (
    <div className="flex h-screen w-full bg-black overflow-hidden select-none touch-none">
      <div className="flex-1 flex flex-col relative canvas-container overflow-hidden">
        <div className={`absolute top-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-6 bg-zinc-900/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/10 shadow-2xl transition-opacity ${isBottomSheetOpen && isMobile ? 'opacity-0' : 'opacity-100'}`}>
           <button className="p-1 hover:text-white/60 transition-colors"><Icons.ArrowLeft className="w-5 h-5"/></button>
           <span className="text-xs font-bold text-white/40">{state.currentPageIndex + 1}/{state.pages.length}</span>
           <button className="p-1 hover:text-white/60 transition-colors"><Icons.ArrowRight className="w-5 h-5"/></button>
           <div className="w-[1px] h-4 bg-white/10 mx-2" />
           <button className="p-1 hover:text-lime-400 transition-colors"><Icons.Sparkles className="w-5 h-5"/></button>
           <button className="p-1 hover:text-red-400 transition-colors" onClick={() => selectedElement && deleteElement(selectedElement.id)}><Icons.Trash2 className="w-5 h-5"/></button>
        </div>

        <div ref={workspaceRef} className="flex-1 flex items-center justify-center relative overflow-hidden">
           <div 
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
                      {/* Interaction Handles (Corners and Mid-points) */}
                      {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map(h => {
                        let positionStyles: React.CSSProperties = {};
                        if (h === 'nw') positionStyles = { top: '-6px', left: '-6px' };
                        if (h === 'ne') positionStyles = { top: '-6px', right: '-6px' };
                        if (h === 'sw') positionStyles = { bottom: '-6px', left: '-6px' };
                        if (h === 'se') positionStyles = { bottom: '-6px', right: '-6px' };
                        if (h === 'n') positionStyles = { top: '-6px', left: '50%', transform: 'translateX(-50%)' };
                        if (h === 's') positionStyles = { bottom: '-6px', left: '50%', transform: 'translateX(-50%)' };
                        if (h === 'e') positionStyles = { right: '-6px', top: '50%', transform: 'translateY(-50%)' };
                        if (h === 'w') positionStyles = { left: '-6px', top: '50%', transform: 'translateY(-50%)' };

                        const isCorner = h.length === 2;

                        return (
                          <div 
                            key={h}
                            onPointerDown={(e) => { 
                              e.stopPropagation(); 
                              setDragStart({ x: e.clientX, y: e.clientY, type: 'resize', handle: h }); 
                              setElementStartPos({...el.box}); 
                            }}
                            style={positionStyles}
                            className={`absolute bg-white border-2 border-lime-400 pointer-events-auto shadow-lg ${isCorner ? 'w-4 h-4 rounded-full' : 'w-6 h-2 rounded-sm'} z-50`}
                          />
                        );
                      })}

                      {/* Rotation Handle */}
                      <div 
                        onPointerDown={(e) => { e.stopPropagation(); setDragStart({ x: e.clientX, y: e.clientY, type: 'rotate' }); setElementStartPos({...el.box}); }}
                        className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-10 h-10 bg-zinc-900 border border-white/20 rounded-full flex items-center justify-center pointer-events-auto cursor-pointer hover:bg-zinc-800 transition-colors shadow-xl"
                      >
                         <Icons.RotateCw className="w-5 h-5 text-lime-400" />
                      </div>

                      {/* Drag Handle Tag */}
                      <div 
                        onPointerDown={(e) => handleSelect(el.id, e)}
                        className="absolute -top-16 left-1/2 -translate-x-1/2 bg-lime-400 px-4 py-1.5 rounded-full flex items-center gap-2 text-[10px] text-black font-bold uppercase tracking-widest shadow-lg animate-bounce pointer-events-auto cursor-grab active:cursor-grabbing"
                      >
                         <Icons.Move className="w-4 h-4" /> Move
                      </div>
                    </div>
                  )}
                </div>
              ))}
           </div>
        </div>

        {!isMobile ? (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-4 bg-zinc-900/90 backdrop-blur rounded-3xl border border-white/10 shadow-2xl">
            <button className="text-white/40 hover:text-white"><Icons.Undo2 className="w-5 h-5"/></button>
            <button className="text-white/40 hover:text-white"><Icons.Redo2 className="w-5 h-5"/></button>
            <div className="w-[1px] h-6 bg-white/10" />
            <button className="flex items-center gap-2 bg-lime-400 text-black px-6 py-2 rounded-full font-bold hover:bg-lime-300 transition-all text-sm">
              <Icons.Download className="w-4 h-4" /> Export
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

        {isMobile && isBottomSheetOpen && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" onClick={() => setIsBottomSheetOpen(false)}>
            <div 
              className="absolute bottom-0 left-0 right-0 h-[75vh] bg-[#111] rounded-t-[32px] overflow-hidden bottom-sheet-transition flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 shrink-0" />
              <div className="flex-1 overflow-y-auto">
                {renderSidebarContent()}
              </div>
              <div className="p-5 bg-zinc-900/50 border-t border-white/5">
                 <button onClick={() => setIsBottomSheetOpen(false)} className="w-full bg-white text-black h-12 rounded-xl font-bold">Done</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isMobile && renderSidebarContent()}
    </div>
  );
};

export default App;
