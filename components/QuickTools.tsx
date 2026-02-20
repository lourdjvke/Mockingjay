import React, { useState, useRef, useEffect } from 'react';
import { DesignElement, ElementStyle } from '../types';
import { Icons } from './IconLibrary';

// A simple, custom color picker component
const CustomColorPicker = ({ color, onChange, onComplete }) => {
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#000000', '#FFFFFF'];
    return (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-800 rounded-lg">
            {colors.map(c => (
                <button
                    key={c}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-white' : 'border-gray-600'}`}
                    onClick={() => onChange(c)}
                />
            ))}
            <input type="color" value={color} onChange={e => onChange(e.target.value)} onBlur={() => onComplete()} className="w-full h-8 mt-2" />
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
}

const QuickTools: React.FC<QuickToolsProps> = ({
    selectedElement,
    updateElement,
    onReorder,
    onOpenSidebar,
    availableFonts,
    themeColors,
    deleteElement,
    updatePage
}) => {
    const [activeTool, setActiveTool] = useState<string | null>(null);

    const handleStyleChange = (property: keyof ElementStyle, value: any) => {
        if (!selectedElement) return;
        updateElement(selectedElement.id, {
            style: { ...selectedElement.style, [property]: value }
        });
    };

    const renderActiveTool = () => {
        if (!selectedElement) return null;

        switch (activeTool) {
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
                    <div className="flex items-center gap-2">
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
                        <span className="text-xs font-bold">{selectedElement.style.fontSize || 16}px</span>
                    </div>
                );
            case 'color':
                return (
                    <CustomColorPicker
                        color={selectedElement.style.color}
                        onChange={color => handleStyleChange('color', color)}
                        onComplete={() => { }}
                    />
                );
            case 'format':
                return (
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleStyleChange('textAlign', 'left')} className={selectedElement.style.textAlign === 'left' ? 'text-lime-400' : ''}><Icons.AlignLeft className="w-5 h-5" /></button>
                        <button onClick={() => handleStyleChange('textAlign', 'center')} className={selectedElement.style.textAlign === 'center' ? 'text-lime-400' : ''}><Icons.AlignCenter className="w-5 h-5" /></button>
                        <button onClick={() => handleStyleChange('textAlign', 'right')} className={selectedElement.style.textAlign === 'right' ? 'text-lime-400' : ''}><Icons.AlignRight className="w-5 h-5" /></button>
                    </div>
                );
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
                        <button onClick={() => setActiveTool(activeTool === 'font' ? null : 'font')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Type className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Font</span></button>
                        <button onClick={() => setActiveTool(activeTool === 'fontSize' ? null : 'fontSize')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Baseline className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Size</span></button>
                        <button onClick={() => setActiveTool(activeTool === 'color' ? null : 'color')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Palette className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Color</span></button>
                        <button onClick={() => setActiveTool(activeTool === 'format' ? null : 'format')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.AlignLeft className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Format</span></button>
                    </>
                );
            case 'image':
                 return (
                    <>
                        <button onClick={() => onOpenSidebar()} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Image className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Replace</span></button>
                        <button onClick={() => setActiveTool(activeTool === 'effects' ? null : 'effects')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Wand2 className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Effects</span></button>
                    </>
                );
            case 'shape':
                return (
                    <>
                         <button onClick={() => setActiveTool(activeTool === 'color' ? null : 'color')} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Palette className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Color</span></button>
                         <button onClick={() => onOpenSidebar()} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Layers className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Style</span></button>
                    </>
                );
            default:
                return (
                    <>
                        <button onClick={() => onOpenSidebar()} className="flex flex-col items-center gap-1 text-lime-400 p-2 min-w-[50px]"><Icons.Sparkles className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Style</span></button>
                        <button onClick={() => onOpenSidebar()} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Layout className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Layer</span></button>
                        {selectedElement && <button onClick={() => deleteElement(selectedElement.id)} className="flex flex-col items-center gap-1 text-red-400 p-2 min-w-[50px]"><Icons.Trash2 className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Delete</span></button>}
                    </>
                );
        }
    };


    return (
        <div className="mx-4 mb-4 bg-zinc-900/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-4">
            {activeTool && (
                <div className="p-4 border-b border-white/10 mb-4">
                    {renderActiveTool()}
                </div>
            )}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                    {getToolsForElement()}
                </div>
                {selectedElement && <button onClick={() => onReorder(selectedElement.id, 'up')} className="bg-white/5 p-3 rounded-full shrink-0"><Icons.ChevronUp className="w-6 h-6 text-white" /></button>}
                <button onClick={() => onOpenSidebar()} className="bg-white/5 p-3 rounded-full shrink-0"><Icons.Menu className="w-6 h-6 text-white" /></button>
            </div>
        </div>
    );
};

export default QuickTools;
