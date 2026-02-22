import React, { useRef, useEffect } from 'react';
import { DesignElement } from '../types';
import { Icons } from './IconLibrary';

interface ElementRendererProps {
    element: DesignElement;
    isSelected: boolean;
    onSelect: (id: string, e: React.PointerEvent) => void;
    onAutoResize: (id: string, height: number) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, isSelected, onSelect, onAutoResize, onContextMenu }) => {
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (element.type === 'text' && textRef.current) {
            const currentHeight = textRef.current.offsetHeight;
            if (currentHeight > element.box.height) {
                onAutoResize(element.id, currentHeight);
            }
        }
    }, [element.content, element.style.fontSize, element.box.width, onAutoResize, element.id, element.type, element.box.height]);

    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: element.box.x,
        top: element.box.y,
        width: element.box.width,
        height: element.box.height,
        transform: `rotate(${element.box.rotation}deg)`,
        backfaceVisibility: 'hidden',
        outline: isSelected ? '2px solid #6366f1' : 'none',
        outlineOffset: '2px',
        transition: 'outline 0.1s ease-in-out',
        boxSizing: 'border-box',
        visibility: element.visible ? 'visible' : 'hidden',
        pointerEvents: 'auto',
        userSelect: 'none',
        ...element.style,
    };

    const renderContent = () => {
        switch (element.type) {
            case 'text':
                return (
                    <div
                        ref={textRef}
                        contentEditable={isSelected}
                        suppressContentEditableWarning
                        onBlur={e => console.log(e.currentTarget.innerHTML)} // Replace with actual update logic
                        style={{
                            width: '100%',
                            height: 'auto',
                            minHeight: element.box.height,
                            wordBreak: 'break-word',
                            cursor: 'text',
                            padding: 10, 
                            boxSizing: 'border-box',
                        }}
                        dangerouslySetInnerHTML={{ __html: element.content || '' }}
                    />
                );
            case 'image':
                return <img src={element.content} alt={element.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable="false" />;
            case 'icon':
                const IconComponent = Icons[element.content as keyof typeof Icons] || Icons.HelpCircle;
                return <IconComponent style={{ color: element.style.color, width: '100%', height: '100%' }} />;
            case 'shape':
            default:
                return null;
        }
    };

    return (
        <div
            style={baseStyle}
            onPointerDown={(e) => onSelect(element.id, e)}
            onContextMenu={onContextMenu}
        >
            {renderContent()}
        </div>
    );
};

export default ElementRenderer;
