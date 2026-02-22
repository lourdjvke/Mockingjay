import React, { useRef, useEffect, memo } from 'react';
import { DesignElement } from '../types';
import { Icons } from './IconLibrary';

interface ElementRendererProps {
    element: DesignElement;
    isSelected: boolean;
    isEditing: boolean;
    onSelect: (id: string, e: React.PointerEvent) => void;
    updateElement: (id: string, updates: Partial<DesignElement>) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

// A robust HTML cleaner that uses the browser's parser.
const cleanHtml = (html: string | null | undefined): string => {
    if (!html) return '';
    // This removes leading/trailing <br> tags and trims whitespace, which are common artifacts.
    return html
        .replace(/^(<(br|div|p)[^>]*>|\s|&nbsp;)+/gi, '')
        .replace(/(<(br|div|p)[^>]*>|\s|&nbsp;)+$/gi, '')
        .trim();
};

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, isSelected, isEditing, onSelect, updateElement, onContextMenu }) => {
    const textRef = useRef<HTMLDivElement>(null);
    const isTextElement = element.type === 'text';

    // Effect to focus and move cursor to the end when editing begins.
    useEffect(() => {
        if (isEditing && isTextElement && textRef.current) {
            textRef.current.focus();
            const selection = window.getSelection();
            if (selection) {
                const range = document.createRange();
                range.selectNodeContents(textRef.current);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }, [isEditing, isTextElement]);
    
    // Syncs incoming prop changes to the contentEditable div, but only when not editing.
    useEffect(() => {
        if (isTextElement && textRef.current && !isEditing) {
            const cleanedContent = cleanHtml(element.content);
            if (textRef.current.innerHTML !== cleanedContent) {
                textRef.current.innerHTML = cleanedContent;
            }
        }
    }, [element.content, isEditing, isTextElement]);


    // Auto-resizing logic. This is now more stable.
    useEffect(() => {
        if (!isTextElement || !textRef.current) return;

        const resize = () => {
            if (!textRef.current) return;
            const newHeight = textRef.current.scrollHeight;
            if (newHeight > 1 && Math.abs(newHeight - element.box.height) > 1) {
                updateElement(element.id, { box: { ...element.box, height: newHeight } });
            }
        };

        // A timeout allows AI-generated content to render before we calculate its height.
        const timerId = setTimeout(resize, 50);

        return () => clearTimeout(timerId);

    }, [isTextElement, element.content, element.box.width, element.style?.fontSize]);

    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        const cleanedContent = cleanHtml(e.currentTarget.innerHTML);
        updateElement(element.id, { content: cleanedContent });
    };

    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: element.box.x,
        top: element.box.y,
        width: element.box.width,
        height: element.box.height,
        transform: `rotate(${element.box.rotation}deg)`,
        visibility: element.visible ? 'visible' : 'hidden',
        pointerEvents: 'auto',
        boxSizing: 'border-box',
        ...element.style, // Spread sanitized styles
    };

    const renderContent = () => {
        switch (element.type) {
            case 'text':
                return (
                    <div
                        ref={textRef}
                        onBlur={handleBlur}
                        contentEditable={isEditing}
                        suppressContentEditableWarning={true}
                        dangerouslySetInnerHTML={{ __html: cleanHtml(element.content) }}
                        style={{
                            width: '100%',
                            height: 'auto',
                            minHeight: '100%',
                            cursor: isEditing ? 'text' : 'default',
                            outline: 'none',
                            wordBreak: 'break-word',
                        }}
                    />
                );
            case 'image':
                return <img src={element.content} alt={element.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable="false" />;
            case 'icon':
                // **CRITICAL FIX**: This prevents the crash.
                // If the icon name from the AI is invalid, we fall back to a default icon.
                const IconComponent = Icons[element.content as keyof typeof Icons] || Icons.HelpCircle;
                return <IconComponent style={{ color: element.style?.color || '#000', width: '100%', height: '100%' }} />;
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
            className={isSelected ? 'element-selected' : ''}
        >
            {renderContent()}
        </div>
    );
};

// Use a simple, deep comparison for stability.
const areEqual = (prevProps: ElementRendererProps, nextProps: ElementRendererProps): boolean => {
    if (prevProps.isSelected !== nextProps.isSelected || prevProps.isEditing !== nextProps.isEditing) {
        return false;
    }
    return JSON.stringify(prevProps.element) === JSON.stringify(nextProps.element);
};

export default memo(ElementRenderer, areEqual);
