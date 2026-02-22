import React, { useRef, useEffect, useState } from 'react';
import { DesignElement } from '../types';
import { Icons } from './IconLibrary';

interface ElementRendererProps {
    element: DesignElement;
    isSelected: boolean;
    isEditing: boolean;
    onSelect: (id: string, e: React.PointerEvent) => void;
    onUpdate: (id: string, content: string, newHeight: number) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, isSelected, isEditing, onSelect, onUpdate, onContextMenu }) => {
    const textRef = useRef<HTMLDivElement>(null);
    const [localContent, setLocalContent] = useState(element.content);

    useEffect(() => {
        setLocalContent(element.content);
    }, [element.content]);

    useEffect(() => {
        if (isEditing && textRef.current) {
            textRef.current.focus();
        }
    }, [isEditing]);

    const handleBlur = () => {
        if (textRef.current) {
            const newContent = textRef.current.innerHTML;
            const newHeight = textRef.current.scrollHeight;
            onUpdate(element.id, newContent, newHeight);
        }
    };

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
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onInput={(e) => setLocalContent(e.currentTarget.innerHTML)}
                        onBlur={handleBlur}
                        style={{
                            width: '100%',
                            height: 'auto',
                            minHeight: element.box.height,
                            wordBreak: 'break-word',
                            cursor: isEditing ? 'text' : 'default',
                            padding: 10, 
                            boxSizing: 'border-box',
                        }}
                        dangerouslySetInnerHTML={{ __html: localContent || '' }}
                    />
                );
            case 'image':
                return <img src={element.content} alt={element.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable="false" />;
            case 'icon':
                const IconComponent = Icons[element.content as keyof typeof Icons] || Icons.Placeholder;
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
