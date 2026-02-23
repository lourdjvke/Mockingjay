import React, { useState, useRef } from 'react';
import { DesignElement, ElementStyle } from '../types';
import { Icons } from './IconLibrary';

const CustomColorPicker = ({ color, onChange, themeColors, onUpdateColors }) => {
    return (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-800 rounded-lg">
            {themeColors.map(c => (
                <button
                    key={c}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-white' : 'border-gray-600'}`}
                    onClick={() => onChange(c)}
                />
            ))}
            <button onClick={() => alert('Custom color picker coming soon!')} className="w-8 h-8 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center">
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
    onUpdateColors: (colors: string[]) => void;
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
    onUpdateColors,
    deleteElement,
    updatePage,
    onApplyEffect
}) => {
    const [currentTool, setCurrentTool] = useState<{ name: string | null, elementId: string | null }>({ name: null, elementId: null });
    const imageReplaceInputRef = useRef<HTMLInputElement>(null);

    const activeToolName = selectedElement && selectedElement.id === currentTool.elementId ? currentTool.name : null;

    const toggleTool = (name: string) => {
        if (!selectedElement) return;
        const newName = activeToolName === name ? null : name;
        setCurrentTool({ name: newName, elementId: selectedElement.id });
    };

    const handleStyleChange = (property: keyof ElementStyle, value: any) => {
        if (!selectedElement) return;
        updateElement(selectedElement.id, {
            style: { ...selectedElement.style, [property]: value }
        });
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

        switch (activeToolName) {
            case 'text':
                return (
                    <div className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 focus-within:border-lime-400/50 transition-colors">
                        <textarea 
                            value={selectedElement.content} 
                            onBlur={(e) => updateElement(selectedElement.id, { content: e.target.value })} 
                            onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} 
                            className="bg-transparent border-none outline-none w-full text-sm font-medium resize-none h-20 text-white" 
                            placeholder="Type something..."
                        />
                    </div>
                )
            case 'font':
                return (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {availableFonts.map(font => (
                            <button
                                key={font.name}
                                onClick={() => handleStyleChange('fontFamily', font.value)}
                                className={`shrink-0 bg-white/5 border border-white/5 px-4 py-2 rounded-full text-xs font-bold ${selectedElement.style.fontFamily === font.value ? 'bg-lime-400 text-black' : 'text-white/60'}`}
                            >
                                {font.name}
                            </button>
                        ))}
                    </div>
                );
            case 'fontSize':
                return (
                    <div className="flex items-center gap-2 text-white">
                        <button onClick={() => handleStyleChange('fontSize', (selectedElement.style.fontSize || 16) - 1)}><Icons.Minus className="w-5 h-5" /></button>
                        <input
                            type="range"
                            min="8"
                            max="128"
                            value={selectedElement.style.fontSize || 16}
                            onChange={e => handleStyleChange('fontSize', parseInt(e.target.value))}
                            className="w-full"
                        />
                        <button onClick={() => handleStyleChange('fontSize', (selectedElement.style.fontSize || 16) + 1)}><Icons.Plus className="w-5 h-5" /></button>
                        <span className="text-xs font-bold w-12 text-center">{selectedElement.style.fontSize || 16}px</span>
                    </div>
                );
            case 'color':
                const prop = selectedElement.type === 'text' || selectedElement.type === 'icon' ? 'color' : 'backgroundColor';
                return (
                    <CustomColorPicker
                        color={selectedElement.style[prop]}
                        onChange={color => handleStyleChange(prop, color)}
                        themeColors={themeColors}
                        onUpdateColors={onUpdateColors}
                    />
                );
            case 'format':
                return (
                    <div className="flex items-center gap-2 text-white">
                        <button onClick={() => handleStyleChange('textAlign', 'left')} className={selectedElement.style.textAlign === 'left' ? 'text-lime-400' : ''}><Icons.AlignLeft className="w-5 h-5" /></button>
                        <button onClick={() => handleStyleChange('textAlign', 'center')} className={selectedElement.style.textAlign === 'center' ? 'text-lime-400' : ''}><Icons.AlignCenter className="w-5 h-5" /></button>
                        <button onClick={() => handleStyleChange('textAlign', 'right')} className={selectedElement.style.textAlign === 'right' ? 'text-lime-400' : ''}><Icons.AlignRight className="w-5 h-5" /></button>
                    </div>
                );
            case 'effects':
                return (
                    <div className="grid grid-cols-4 gap-2 p-2 text-white">
                        <button onClick={() => onApplyEffect('none')} className="flex flex-col items-center gap-1 text-white/70 hover:text-white"><Icons.X className="w-5 h-5" /><span className="text-xs">None</span></button>
                        <button onClick={() => onApplyEffect('grayscale')} className="flex flex-col items-center gap-1 text-white/70 hover:text-white"><Icons.Palette className="w-5 h-5" /><span className="text-xs">Grayscale</span></button>
                        <button onClick={() => onApplyEffect('sepia')} className="flex flex-col items-center gap-1 text-white/70 hover:text-white"><Icons.Palette className="w-5 h-5" /><span className="text-xs">Sepia</span></button>
                        <button onClick={() => onApplyEffect('invert')} className="flex flex-col items-center gap-1 text-white/70 hover:text-white"><Icons.Palette className="w-5 h-5" /><span className="text-xs">Invert</span></button>
                        <button onClick={() => onApplyEffect('motion-blur')} className="flex flex-col items-center gap-1 text-white/70 hover:text-white"><Icons.Wind className="w-5 h-5" /><span className="text-xs">Blur</span></button>
                    </div>
                )
            default:
                return null;
        }
    };

    const getToolsForElement = () => {
        if (!selectedElement) {
            return (
                <>
                    <button onClick={onOpenSidebar} className="flex flex-col items-center gap-1 text-lime-400 p-2 min-w-[50px]"><Icons.Plus className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Add</span></button>
                    <div className="flex gap-2 items-center">
                        {themeColors.slice(0, 3).map(c => (
                            <button key={c} onClick={() => updatePage({ background: c })} className={'w-8 h-8 rounded-full border border-white/20'} style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </>
            );
        }

        switch (selectedElement.type) {
            case 'text':
                return (
                    <>
                        <button onClick={() => toggleTool('text')} className={`flex flex-col items-center gap-1 p-2 min-w-[50px] ${activeToolName === 'text' ? 'text-lime-400' : 'text-white/60'}`}><Icons.Edit3 className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Edit</span></button>
                        <button onClick={() => toggleTool('font')} className={`flex flex-col items-center gap-1 p-2 min-w-[50px] ${activeToolName === 'font' ? 'text-lime-400' : 'text-white/60'}`}><Icons.Type className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Font</span></button>
                        <button onClick={() => toggleTool('fontSize')} className={`flex flex-col items-center gap-1 p-2 min-w-[50px] ${activeToolName === 'fontSize' ? 'text-lime-400' : 'text-white/60'}`}><Icons.Baseline className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Size</span></button>
                        <button onClick={() => toggleTool('color')} className={`flex flex-col items-center gap-1 p-2 min-w-[50px] ${activeToolName === 'color' ? 'text-lime-400' : 'text-white/60'}`}><Icons.Palette className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Color</span></button>
                        <button onClick={() => toggleTool('format')} className={`flex flex-col items-center gap-1 p-2 min-w-[50px] ${activeToolName === 'format' ? 'text-lime-400' : 'text-white/60'}`}><Icons.AlignLeft className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Format</span></button>
                    </>
                );
            case 'image':
                 return (
                    <>
                        <input type="file" accept="image/*" ref={imageReplaceInputRef} className="hidden" onChange={handleImageReplace} />
                        <button onClick={() => imageReplaceInputRef.current?.click()} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Image className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Replace</span></button>
                        <button onClick={() => toggleTool('effects')} className={`flex flex-col items-center gap-1 p-2 min-w-[50px] ${activeToolName === 'effects' ? 'text-lime-400' : 'text-white/60'}`}><Icons.Wand2 className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Effects</span></button>
                        <button onClick={() => onOpenSidebar()} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Layers className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Layer</span></button>
                    </>
                );
            case 'shape':
                return (
                    <>
                         <button onClick={() => toggleTool('color')} className={`flex flex-col items-center gap-1 p-2 min-w-[50px] ${activeToolName === 'color' ? 'text-lime-400' : 'text-white/60'}`}><Icons.Palette className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Color</span></button>
                         <button onClick={() => onOpenSidebar()} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Layers className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Style</span></button>
                         <button onClick={() => onReorder(selectedElement.id, 'up')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.ChevronUp className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Layer</span></button>
                    </>
                );
            default:
                return (
                    <>
                        <button onClick={() => onOpenSidebar()} className="flex flex-col items-center gap-1 text-lime-400 p-2 min-w-[50px]"><Icons.Sparkles className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Style</span></button>
                        <button onClick={() => onOpenSidebar()} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Layers className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Layer</span></button>
                        {selectedElement && <button onClick={() => deleteElement(selectedElement.id)} className="flex flex-col items-center gap-1 text-red-400 p-2 min-w-[50px]"><Icons.Trash2 className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Delete</span></button>}
                    </>
                );
        }
    };


    return (
        <div className="mx-4 mb-4 bg-zinc-900/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-2">
            {activeToolName && (
                <div className="p-2 border-b border-white/10 mb-2">
                    {renderActiveTool()}
                </div>
            )}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {getToolsForElement()}
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                    {selectedElement && <button onClick={() => onReorder(selectedElement.id, 'down')} className="bg-white/5 p-3 rounded-full"><Icons.ChevronDown className="w-5 h-5 text-white" /></button>}
                    {selectedElement && <button onClick={() => onReorder(selectedElement.id, 'up')} className="bg-white/5 p-3 rounded-full"><Icons.ChevronUp className="w-5 h-5 text-white" /></button>}
                    <button onClick={onOpenSidebar} className="bg-white/5 p-3 rounded-full"><Icons.Menu className="w-5 h-5 text-white" /></button>
                </div>
            </div>
        </div>
    );
};

export default QuickTools;
