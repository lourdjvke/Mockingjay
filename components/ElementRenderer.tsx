import React, { useRef, useEffect } from 'react';
import { DesignElement } from '../types';
import { Icons } from './IconLibrary';

interface ElementRendererProps {
    element: DesignElement;
    isSelected: boolean;
    isEditing: boolean;
    onSelect: (id: string, e: React.PointerEvent<HTMLDivElement>) => void;
    onUpdate: (id: string, content: string, newHeight: number) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, isSelected, isEditing, onSelect, onUpdate, onContextMenu }) => {
    const textRef = useRef<HTMLDivElement>(null);

    // Effect to sync external content changes (e.g., from AI), but ONLY when not editing.
    // This is crucial to prevent the caret from jumping.
    useEffect(() => {
        const div = textRef.current;
        if (div && !isEditing && element.type === 'text' && div.innerHTML !== element.content) {
            div.innerHTML = element.content || '';
        }
    }, [element.content, isEditing, element.type]);

    // Effect to handle focusing and cursor placement when editing starts.
    useEffect(() => {
        if (isEditing && textRef.current) {
            textRef.current.focus();
            // Move cursor to the end of the text
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(textRef.current);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    }, [isEditing]);

    const handleBlur = () => {
        if (textRef.current && isEditing) {
            const newContent = textRef.current.innerHTML;

            // 1. Cleanse the content: remove leading/trailing <br> tags and whitespace.
            const cleansedContent = newContent.replace(/^(<br\s*\/?>|\s|&nbsp;)+|(<br\s*\/?>|\s|&nbsp;)+$/g, "");

            // 2. Accurately calculate the height of the cleansed content.
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
            tempDiv.innerHTML = cleansedContent || '&nbsp;'; // Use &nbsp; to ensure height for empty content
            document.body.appendChild(tempDiv);
            const newHeight = tempDiv.scrollHeight;
            document.body.removeChild(tempDiv);
            
            // 3. Call the update function with cleansed content and precise height.
            onUpdate(element.id, cleansedContent, newHeight);
        }
    };
    
    // Base style for the draggable/resizable container
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
        // The white background bug was caused by default styles in App.tsx.
        // This ensures that text elements are transparent unless a color is specified.
        backgroundColor: element.type === 'text' ? (element.style.backgroundColor || 'transparent') : element.style.backgroundColor,
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
                        // Set the initial HTML, but allow the browser to control it during editing.
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
            onContextMenu={onContextMenu}
        >
            {renderContent()}
        </div>
    );
};

export default ElementRenderer;
