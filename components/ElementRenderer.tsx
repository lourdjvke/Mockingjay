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

// This helper function will be used to clean up the HTML content from the AI or user input.
const cleanHtml = (html: string | null | undefined): string => {
    if (!html) return '';
    // This regex removes leading/trailing <br> tags, empty divs/paragraphs, and trims whitespace.
    return html
        .replace(/^(<(div|p|br)[^>]*>|\s|&nbsp;)+/gi, '')
        .replace(/(<(div|p|br)[^>]*>|\s|&nbsp;)+$/gi, '')
        .trim();
};

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, isSelected, isEditing, onSelect, updateElement, onContextMenu }) => {
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isEditing && textRef.current) {
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
    }, [isEditing]);

    // This effect syncs incoming content changes to the editable div, cleaning it first.
    useEffect(() => {
        if (element.type === 'text' && textRef.current) {
            const cleanedContent = cleanHtml(element.content);
            if (textRef.current.innerHTML !== cleanedContent) {
                textRef.current.innerHTML = cleanedContent;
            }
        }
    }, [element.content, element.type, isEditing]);

    // Auto-resizing logic for text elements.
    useEffect(() => {
        if (element.type !== 'text' || !textRef.current) {
            return;
        }

        const checkResize = () => {
            if (!textRef.current) return;
            const currentHeight = textRef.current.scrollHeight;
            if (currentHeight > 1 && Math.abs(currentHeight - element.box.height) > 2) {
                updateElement(element.id, { box: { ...element.box, height: currentHeight } });
            }
        };

        const timeoutId = setTimeout(checkResize, 50);
        const observer = new MutationObserver(checkResize);
        observer.observe(textRef.current, { childList: true, subtree: true, characterData: true });

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
        };
    }, [element.id, element.type, element.content, element.box.width, element.style?.fontSize, element.style?.lineHeight, updateElement]);

    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        const newContent = cleanHtml(e.currentTarget.innerHTML);
        const oldContent = cleanHtml(element.content);

        if (newContent !== oldContent) {
            updateElement(element.id, { content: newContent });
        } else if (e.currentTarget.innerHTML !== newContent) {
            // If only whitespace was added, reset the div to the clean version.
            e.currentTarget.innerHTML = newContent;
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
        boxSizing: 'border-box',
        visibility: element.visible ? 'visible' : 'hidden',
        pointerEvents: 'auto',
        userSelect: 'none',
        ...(element.style || {}),
    };

    const renderContent = () => {
        switch (element.type) {
            case 'text':
                return (
                    <div
                        key={element.id} // Add a key to help React with re-renders
                        ref={textRef}
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onBlur={handleBlur}
                        style={{
                            width: '100%',
                            height: 'auto',
                            minHeight: '100%',
                            wordBreak: 'break-word',
                            cursor: isEditing ? 'text' : 'default',
                            padding: 10,
                            boxSizing: 'border-box',
                            outline: 'none',
                        }}
                    />
                );
            case 'image':
                return <img src={element.content} alt={element.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable="false" />;
            case 'icon':
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
            className={isSelected ? 'outline-selected' : ''}
        >
            {renderContent()}
        </div>
    );
};

const areEqual = (prevProps: ElementRendererProps, nextProps: ElementRendererProps) => {
    if (
        prevProps.isSelected !== nextProps.isSelected ||
        prevProps.isEditing !== nextProps.isEditing ||
        prevProps.element.id !== nextProps.element.id
    ) {
        return false;
    }

    // A deep-enough comparison to catch relevant changes without being overly expensive.
    return JSON.stringify(prevProps.element) === JSON.stringify(nextProps.element);
};

export default memo(ElementRenderer, areEqual);
