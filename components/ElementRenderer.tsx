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

// Helper to calculate the required height for a given piece of HTML content
const getTextHeight = (element: DesignElement, content: string) => {
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
    // Sanitize the content before measuring to get an accurate height
    const cleansedContent = content.replace(/^(<br\s*\/?>|\s|&nbsp;)+|(<br\s*\/?>|\s|&nbsp;)+$/g, "");
    tempDiv.innerHTML = cleansedContent || '&nbsp;'; // Use &nbsp; to ensure height for empty content
    document.body.appendChild(tempDiv);
    const height = tempDiv.scrollHeight;
    document.body.removeChild(tempDiv);
    return height;
};

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, isSelected, isEditing, onSelect, onUpdate }) => {
    const textRef = useRef<HTMLDivElement>(null);
    const isEditingRef = useRef(false);

    // CRITICAL: This effect syncs external state (from props) to the editable div,
    // but it ONLY runs when we are NOT editing. This is the main guard against caret jumping.
    useLayoutEffect(() => {
        const div = textRef.current;
        if (div && !isEditing && div.innerHTML !== element.content) {
            div.innerHTML = element.content || '';
        }
    }, [element.content, isEditing]);

    // This effect implements the auto-resizing functionality while the user is typing.
    useEffect(() => {
        if (!isEditing || !textRef.current) return;

        const div = textRef.current;
        const handleInput = () => {
            const newHeight = getTextHeight(element, div.innerHTML);
            // We only call onUpdate to adjust the height. The content itself is not updated
            // in the parent state until blur. This prevents re-renders from killing the caret.
            if (Math.abs(newHeight - element.box.height) > 1) {
                onUpdate(element.id, { box: { ...element.box, height: newHeight } });
            }
        };

        div.addEventListener('input', handleInput);
        return () => div.removeEventListener('input', handleInput);
        
    }, [isEditing, onUpdate, element]); // Note: `element` dependency is key for `getTextHeight`

    // This effect focuses the div and places the cursor at the end, but only
    // when we *first* enter editing mode.
    useEffect(() => {
        const justStartedEditing = isEditing && !isEditingRef.current;
        if (justStartedEditing && textRef.current) {
            textRef.current.focus();
            const sel = window.getSelection();
            if (sel) {
                const range = document.createRange();
                range.selectNodeContents(textRef.current);
                range.collapse(false); // collapse to the end
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
        // Sync our ref with the prop for the next render.
        isEditingRef.current = isEditing;
    }, [isEditing]);

    // On blur, we finalize the edit. We cleanse the content and send both the
    // final content and the final height to the parent.
    const handleBlur = () => {
        if (textRef.current && isEditing) {
            const newContent = textRef.current.innerHTML;
            const cleansedContent = newContent.replace(/^(<br\s*\/?>|\s|&nbsp;)+|(<br\s*\/?>|\s|&nbsp;)+$/g, "");
            const newHeight = getTextHeight(element, cleansedContent);

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
