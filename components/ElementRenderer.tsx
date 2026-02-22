import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { DesignElement } from '../types';
import { Icons } from './IconLibrary';

interface ElementRendererProps {
    element: DesignElement;
    isSelected: boolean;
    isEditing: boolean;
    onSelect: (id: string, e: React.PointerEvent<HTMLDivElement>) => void;
    onUpdate: (id: string, updates: Partial<DesignElement>) => void;
}

const getTextHeight = (element: DesignElement) => {
    const tempDiv = document.createElement('div');
    Object.assign(tempDiv.style, {
        width: `${element.box.width}px`,
        padding: '10px',
        boxSizing: 'border-box',
        fontFamily: element.style.fontFamily || 'inherit',
        fontSize: element.style.fontSize ? `${element.style.fontSize}px` : 'inherit',
        lineHeight: element.style.lineHeight || 'normal',
        letterSpacing: element.style.letterSpacing ? `${element.style.letterSpacing}px` : 'normal',
        fontWeight: element.style.fontWeight || 'normal',
        wordBreak: 'break-word',
        visibility: 'hidden',
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
    });
    const cleansedContent = (element.content || '').replace(/^(<br\s*\/?>|\s|&nbsp;)+|(<br\s*\/?>|\s|&nbsp;)+$/g, "");
    tempDiv.innerHTML = cleansedContent || '&nbsp;';
    document.body.appendChild(tempDiv);
    const height = tempDiv.scrollHeight;
    document.body.removeChild(tempDiv);
    return height;
};

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, isSelected, isEditing, onSelect, onUpdate }) => {
    const textRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const div = textRef.current;
        if (div && !isEditing && div.innerHTML !== element.content) {
            div.innerHTML = element.content || '';
        }
    }, [element.content, isEditing]);

    useEffect(() => {
        if (element.type === 'text') {
            const requiredHeight = getTextHeight(element);
            if (element.box.height < requiredHeight) {
                onUpdate(element.id, { box: { ...element.box, height: requiredHeight } });
            }
        }
    }, [element.content, element.box.width, element.style]);

    useEffect(() => {
        if (isEditing && textRef.current) {
            textRef.current.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            if (sel) {
                range.selectNodeContents(textRef.current);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }, [isEditing]);

    const handleBlur = () => {
        if (textRef.current && isEditing) {
            const newContent = textRef.current.innerHTML;
            const cleansedContent = newContent.replace(/^(<br\s*\/?>|\s|&nbsp;)+|(<br\s*\/?>|\s|&nbsp;)+$/g, "");
            const newHeight = getTextHeight({ ...element, content: cleansedContent });

            onUpdate(element.id, {
                content: cleansedContent,
                box: { ...element.box, height: newHeight },
            });
        }
    };
    
    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        left: element.box.x,
        top: element.box.y,
        width: element.box.width,
        height: element.box.height,
        transform: `rotate(${element.box.rotation}deg)`,
        backfaceVisibility: 'hidden',
        boxSizing: 'border-box',
        visibility: element.visible ? 'visible' : 'hidden',
        pointerEvents: 'auto',
        ...element.style,
        backgroundColor: (element.type === 'text' || element.type === 'image' || element.type === 'icon') 
            ? 'transparent' 
            : element.style.backgroundColor,
    };

    const renderContent = () => {
        switch (element.type) {
            case 'text':
                return (
                    <div
                        ref={textRef}
                        contentEditable={isEditing}
                        suppressContentEditableWarning={true}
                        onBlur={handleBlur}
                        style={{
                            width: '100%',
                            height: '100%',
                            wordBreak: 'break-word',
                            cursor: isEditing ? 'text' : 'default',
                            padding: 10,
                            boxSizing: 'border-box',
                            outline: 'none',
                        }}
                        dangerouslySetInnerHTML={{ __html: element.content || '' }}
                    />
                );
            case 'image':
                return <img src={element.content} alt={element.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} draggable="false" />;
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
            style={containerStyle}
            onPointerDown={(e) => onSelect(element.id, e)}
        >
            {renderContent()}
        </div>
    );
};

export default ElementRenderer;
