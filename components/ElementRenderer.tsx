import React, { useRef, useEffect, memo } from 'react';
import { DesignElement } from '../types';
import { Icons } from './IconLibrary';

interface ElementRendererProps {
    element: DesignElement;
    isSelected: boolean;
    onSelect: (id: string, e: React.PointerEvent) => void;
    updateElement: (id: string, updates: Partial<DesignElement>) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, isSelected, onSelect, updateElement, onContextMenu }) => {
    const textRef = useRef<HTMLDivElement>(null);

    // This effect is for focusing the element and moving the cursor to the end when it's selected.
    useEffect(() => {
        if (isSelected && element.type === 'text' && textRef.current) {
            textRef.current.focus();
            const selection = window.getSelection();
            if (selection) {
                const range = document.createRange();
                range.selectNodeContents(textRef.current);
                range.collapse(false); // collapse to the end
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }, [isSelected, element.type]);

    // This effect ensures the content in the div matches the state if it's changed from outside (e.g. loading a design).
    // It's crucial that this does NOT run while the user is typing, which is handled by the `memo` comparison.
    useEffect(() => {
        if (textRef.current && element.content !== textRef.current.innerHTML) {
            textRef.current.innerHTML = element.content || '';
        }
    }, [element.content]);

    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        const newContent = e.currentTarget.innerHTML;
        // Update content in the global state only when focus is lost.
        if (newContent !== element.content) {
            updateElement(element.id, { content: newContent });
        }
    };
    
    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        if (!textRef.current) return;
        // Auto-resize logic.
        const currentHeight = textRef.current.scrollHeight;
        if (currentHeight > element.box.height) {
            updateElement(element.id, { box: { ...element.box, height: currentHeight } });
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
                        onBlur={handleBlur}
                        onInput={handleInput}
                        style={{
                            width: '100%',
                            height: 'auto',
                            minHeight: '100%',
                            wordBreak: 'break-word',
                            cursor: 'text',
                            padding: 10, 
                            boxSizing: 'border-box',
                            outline: 'none',
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
            onPointerDown={(e) => {
                 // Stop propagation only if the element is already selected,
                 // to allow text selection inside the contentEditable.
                if (isSelected && element.type === 'text') {
                    e.stopPropagation();
                } else {
                    onSelect(element.id, e);
                }
            }}
            onContextMenu={onContextMenu}
        >
            {renderContent()}
        </div>
    );
};

// We wrap the component in React.memo with a custom comparison function.
// This is the key to preventing the caret jump. We tell React not to re-render the
// component just because the `content` prop is changing while the user is editing it.
const areEqual = (prevProps: ElementRendererProps, nextProps: ElementRendererProps) => {
    // If selection state changes, we must re-render.
    if (prevProps.isSelected !== nextProps.isSelected) return false;
    
    // If the element ID itself changes, it's a different element. Must re-render.
    if (prevProps.element.id !== nextProps.element.id) return false;

    // If the element is currently selected and is a text element...
    if (nextProps.isSelected && nextProps.element.type === 'text') {
        // ...we check if any property *other than* `content` or `box.height` has changed.
        // We ignore `content` because the user is typing it directly into the DOM.
        // We ignore `box.height` because auto-resize changes it while typing.
        // If any other critical property changes (like position, color, etc.), we must re-render.
        const prev = prevProps.element;
        const next = nextProps.element;
        const shouldUpdate = 
            prev.box.x !== next.box.x ||
            prev.box.y !== next.box.y ||
            prev.box.width !== next.box.width ||
            prev.box.rotation !== next.box.rotation ||
            JSON.stringify(prev.style) !== JSON.stringify(next.style) ||
            prev.visible !== next.visible ||
            prev.locked !== next.locked;
            
        return !shouldUpdate;
    }
    
    // For all other cases (e.g., not a text element, or not selected),
    // perform a deep comparison to see if a re-render is needed.
    return JSON.stringify(prevProps.element) === JSON.stringify(nextProps.element);
};

export default memo(ElementRenderer, areEqual);
