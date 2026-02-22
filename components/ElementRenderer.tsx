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

    useEffect(() => {
        if (textRef.current && element.content !== textRef.current.innerHTML) {
            textRef.current.innerHTML = element.content || '';
        }
    }, [element.content]);

    // Auto-resizing logic for text elements.
    useEffect(() => {
        if (element.type === 'text' && textRef.current) {
            const checkResize = () => {
                if (!textRef.current) return;
                const currentHeight = textRef.current.scrollHeight;
                if (currentHeight > 1 && currentHeight !== element.box.height) {
                    updateElement(element.id, { box: { ...element.box, height: currentHeight } });
                }
            };
            // We need to check resize on multiple events to ensure it's always correct.
            checkResize(); // Initial check
            const observer = new MutationObserver(checkResize);
            observer.observe(textRef.current, { childList: true, subtree: true, characterData: true });
            return () => observer.disconnect();
        }
    }, [element.id, element.type, element.box, element.style.fontSize, element.style.lineHeight, updateElement]);


    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        const newContent = e.currentTarget.innerHTML;
        if (newContent !== element.content) {
            updateElement(element.id, { content: newContent });
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
            className={isSelected ? 'outline-selected' : ''}
        >
            {renderContent()}
        </div>
    );
};

const areEqual = (prevProps: ElementRendererProps, nextProps: ElementRendererProps) => {
    if (prevProps.isSelected !== nextProps.isSelected || prevProps.isEditing !== nextProps.isEditing) return false;
    if (prevProps.element.id !== nextProps.element.id) return false;

    if ((nextProps.isSelected || nextProps.isEditing) && nextProps.element.type === 'text') {
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
    
    return JSON.stringify(prevProps.element) === JSON.stringify(nextProps.element);
};

export default memo(ElementRenderer, areEqual);
