
import React, { useState, useRef, useEffect } from 'react';
import { DesignElement, ElementStyle } from '../types';
import { Icons } from './IconLibrary';

const CustomColorPicker = ({ color, onChange, themeColors }) => {
    return (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-100 rounded-lg border border-gray-200">
            {themeColors.map(c => (
                <button
                    key={c}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 transform transition-transform hover:scale-110 active:scale-95 ${color === c ? 'border-gray-800' : 'border-gray-200'}`}
                    onClick={() => onChange(c)}
                />
            ))}
            <button onClick={() => alert('Custom color picker coming soon!')} className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center transform transition-transform hover:scale-110 active:scale-95">
                <Icons.Plus className="w-5 h-5 text-gray-400" />
            </button>
        </div>
    );
};

interface QuickToolsProps {
    selectedElement: DesignElement | null;
    updateElement: (id: string, updates: Partial<DesignElement>) => void;
    onReorder: (id: string, direction: 'up' | 'down') => void;
    onOpenSidebar: () => void;
    availableFonts: { name: string, value: string }[];
    themeColors: string[];
    deleteElement: (id: string) => void;
    updatePage: (updates: any) => void;
    onApplyEffect: (effect: string) => void;
}

const QuickTools: React.FC<QuickToolsProps> = ({
    selectedElement,
    updateElement,
    onReorder,
    onOpenSidebar,
    availableFonts,
    themeColors,
    deleteElement,
    updatePage,
    onApplyEffect
}) => {
    const [currentTool, setCurrentTool] = useState<{ name: string | null, elementId: string | null }>({ name: null, elementId: null });
    const imageReplaceInputRef = useRef<HTMLInputElement>(null);
    const [isPWA, setIsPWA] = useState(false);

    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsPWA(true);
        }
    }, []);

    const activeToolName = selectedElement && selectedElement.id === currentTool.elementId ? currentTool.name : null;

    const toggleTool = (name: string) => {
        if (!selectedElement) return;
        const isTogglingOff = activeToolName === name;
        setCurrentTool(isTogglingOff ? { name: null, elementId: null } : { name, elementId: selectedElement.id });
    };

    const handleStyleChange = (property: keyof ElementStyle, value: any) => {
        if (!selectedElement) return;
        updateElement(selectedElement.id, { style: { ...selectedElement.style, [property]: value } });
    };

    const handleImageReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedElement || selectedElement.type !== 'image') return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
                updateElement(selectedElement.id, { content: dataUrl });
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const renderActiveTool = () => {
        if (!selectedElement || !activeToolName) return null;

        const toolContentClass = "p-2 border-b border-gray-200 mb-2 animate-in fade-in duration-300 zoom-in-95";

        switch (activeToolName) {
            case 'text':
                return (
                    <div className={toolContentClass}>
                        <div className="w-full bg-white border border-gray-200 rounded-xl p-3 focus-within:border-lime-500/50 transition-colors">
                            <textarea
                                value={selectedElement.content}
                                onBlur={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                                onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                                className="bg-transparent border-none outline-none w-full text-sm font-medium resize-none h-20 text-gray-800"
                                placeholder="Type something..."
                            />
                        </div>
                    </div>
                );
            case 'font':
                return (
                    <div className={toolContentClass}>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {availableFonts.map(font => (
                                <button
                                    key={font.name}
                                    onClick={() => handleStyleChange('fontFamily', font.value)}
                                    className={`shrink-0 bg-gray-100 border border-gray-200 px-4 py-2 rounded-full text-xs font-bold transform transition-all active:scale-95 hover:scale-105 ${selectedElement.style.fontFamily === font.value ? 'bg-lime-400 text-black border-lime-500' : 'text-gray-600'}`}
                                >
                                    {font.name}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 'fontSize':
                return (
                    <div className={toolContentClass}>
                        <div className="flex items-center gap-2 text-gray-700">
                            <button onClick={() => handleStyleChange('fontSize', (selectedElement.style.fontSize || 16) - 1)} className="p-1 hover:bg-gray-200 rounded-md"><Icons.Minus className="w-5 h-5" /></button>
                            <input
                                type="range"
                                min="8"
                                max="128"
                                value={selectedElement.style.fontSize || 16}
                                onChange={e => handleStyleChange('fontSize', parseInt(e.target.value))}
                                className="w-full accent-lime-500"
                            />
                            <button onClick={() => handleStyleChange('fontSize', (selectedElement.style.fontSize || 16) + 1)} className="p-1 hover:bg-gray-200 rounded-md"><Icons.Plus className="w-5 h-5" /></button>
                            <span className="text-xs font-bold w-12 text-center">{selectedElement.style.fontSize || 16}px</span>
                        </div>
                    </div>
                );
            case 'color':
                const prop = selectedElement.type === 'text' || selectedElement.type === 'icon' ? 'color' : 'backgroundColor';
                return (
                    <div className={toolContentClass}>
                        <CustomColorPicker
                            color={selectedElement.style[prop]}
                            onChange={color => handleStyleChange(prop, color)}
                            themeColors={themeColors}
                        />
                    </div>
                );
            case 'format':
                 return (
                    <div className={toolContentClass}>
                        <div className="flex items-center gap-2 text-gray-600">
                            <button onClick={() => handleStyleChange('textAlign', 'left')} className={`p-2 rounded-md ${selectedElement.style.textAlign === 'left' ? 'bg-lime-400 text-black' : 'hover:bg-gray-200'}`}><Icons.AlignLeft className="w-5 h-5" /></button>
                            <button onClick={() => handleStyleChange('textAlign', 'center')} className={`p-2 rounded-md ${selectedElement.style.textAlign === 'center' ? 'bg-lime-400 text-black' : 'hover:bg-gray-200'}`}><Icons.AlignCenter className="w-5 h-5" /></button>
                            <button onClick={() => handleStyleChange('textAlign', 'right')} className={`p-2 rounded-md ${selectedElement.style.textAlign === 'right' ? 'bg-lime-400 text-black' : 'hover:bg-gray-200'}`}><Icons.AlignRight className="w-5 h-5" /></button>
                        </div>
                    </div>
                );
            case 'effects':
                return (
                    <div className={toolContentClass}>
                        <div className="grid grid-cols-4 gap-2 text-gray-600">
                            <button onClick={() => onApplyEffect('none')} className="flex flex-col items-center gap-1 hover:text-gray-900"><Icons.X className="w-5 h-5" /><span className="text-xs">None</span></button>
                            <button onClick={() => onApplyEffect('grayscale')} className="flex flex-col items-center gap-1 hover:text-gray-900"><Icons.Palette className="w-5 h-5" /><span className="text-xs">Grayscale</span></button>
                            <button onClick={() => onApplyEffect('sepia')} className="flex flex-col items-center gap-1 hover:text-gray-900"><Icons.Palette className="w-5 h-5" /><span className="text-xs">Sepia</span></button>
                            <button onClick={() => onApplyEffect('invert')} className="flex flex-col items-center gap-1 hover:text-gray-900"><Icons.Palette className="w-5 h-5" /><span className="text-xs">Invert</span></button>
                            <button onClick={() => onApplyEffect('motion-blur')} className="flex flex-col items-center gap-1 hover:text-gray-900"><Icons.Wind className="w-5 h-5" /><span className="text-xs">Blur</span></button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const ToolButton = ({ name, icon, active, onClick }) => (
        <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[55px] h-[55px] rounded-2xl transform transition-all duration-200 ease-out active:scale-90 ${active ? 'bg-lime-400/50 text-lime-800 scale-105' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">{name}</span>
        </button>
    )

    const getToolsForElement = () => {
        if (!selectedElement) {
            return (
                <>
                    <button onClick={onOpenSidebar} className="flex flex-col items-center gap-1 text-lime-600 p-2 min-w-[55px] h-[55px] rounded-2xl bg-lime-400/30 transform transition-all duration-200 ease-out active:scale-95 hover:scale-105">
                        <Icons.Plus className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase">Add</span>
                    </button>
                    <div className="flex gap-2 items-center pl-2">
                        {themeColors.slice(0, 3).map(c => (
                            <button key={c} onClick={() => updatePage({ background: c })} className={'w-8 h-8 rounded-full border border-gray-200 transform transition-all hover:scale-110 active:scale-95'} style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </>
            );
        }

        switch (selectedElement.type) {
            case 'text':
                return (
                    <>
                        <ToolButton name="Edit" icon={<Icons.Edit3 className="w-5 h-5" />} active={activeToolName === 'text'} onClick={() => toggleTool('text')} />
                        <ToolButton name="Font" icon={<Icons.Type className="w-5 h-5" />} active={activeToolName === 'font'} onClick={() => toggleTool('font')} />
                        <ToolButton name="Size" icon={<Icons.Baseline className="w-5 h-5" />} active={activeToolName === 'fontSize'} onClick={() => toggleTool('fontSize')} />
                        <ToolButton name="Color" icon={<Icons.Palette className="w-5 h-5" />} active={activeToolName === 'color'} onClick={() => toggleTool('color')} />
                        <ToolButton name="Format" icon={<Icons.AlignLeft className="w-5 h-5" />} active={activeToolName === 'format'} onClick={() => toggleTool('format')} />
                    </>
                );
            case 'image':
                 return (
                    <>
                        <input type="file" accept="image/*" ref={imageReplaceInputRef} className="hidden" onChange={handleImageReplace} />
                        <ToolButton name="Replace" icon={<Icons.Image className="w-5 h-5" />} active={false} onClick={() => imageReplaceInputRef.current?.click()} />
                        <ToolButton name="Effects" icon={<Icons.Wand2 className="w-5 h-5" />} active={activeToolName === 'effects'} onClick={() => toggleTool('effects')} />
                        <ToolButton name="Layer" icon={<Icons.Layers className="w-5 h-5" />} active={false} onClick={onOpenSidebar} />
                    </>
                );
            case 'shape':
            case 'icon':
                return (
                    <>
                         <ToolButton name="Color" icon={<Icons.Palette className="w-5 h-5" />} active={activeToolName === 'color'} onClick={() => toggleTool('color')} />
                         <ToolButton name="Style" icon={<Icons.Sparkles className="w-5 h-5" />} active={false} onClick={onOpenSidebar} />
                         <ToolButton name="Layer" icon={<Icons.Layers className="w-5 h-5" />} active={false} onClick={() => onReorder(selectedElement.id, 'up')} />
                    </>
                );
            default:
                return (
                    <>
                        <ToolButton name="Style" icon={<Icons.Sparkles className="w-5 h-5" />} active={false} onClick={onOpenSidebar} />
                        <ToolButton name="Layer" icon={<Icons.Layers className="w-5 h-5" />} active={false} onClick={onOpenSidebar} />
                        <button onClick={() => deleteElement(selectedElement.id)} className="flex flex-col items-center justify-center gap-1 p-2 min-w-[55px] h-[55px] rounded-2xl bg-red-500/10 text-red-600 transform transition-all duration-200 ease-out active:scale-95 hover:scale-105">
                            <Icons.Trash2 className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Delete</span>
                        </button>
                    </>
                );
        }
    };

    const isBrowser = !isPWA;

    return (
        <div className={`mx-4 mb-4 bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-2xl shadow-gray-500/10 p-2 select-none ${isBrowser ? 'bottom-[2em]' : ''}`}>
            {renderActiveTool()}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pl-1">
                    {getToolsForElement()}
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                    {selectedElement && <button onClick={() => onReorder(selectedElement.id, 'down')} className="bg-gray-100 p-3 rounded-full text-gray-600 transform transition-all active:scale-90 hover:bg-gray-200"><Icons.ChevronDown className="w-5 h-5" /></button>}
                    {selectedElement && <button onClick={() => onReorder(selectedElement.id, 'up')} className="bg-gray-100 p-3 rounded-full text-gray-600 transform transition-all active:scale-90 hover:bg-gray-200"><Icons.ChevronUp className="w-5 h-5" /></button>}
                    <button onClick={onOpenSidebar} className="bg-gray-800 text-white p-3 rounded-full transform transition-all active:scale-90 hover:bg-gray-900"><Icons.Menu className="w-5 h-5" /></button>
                </div>
            </div>
        </div>
    );
};

export default QuickTools;
