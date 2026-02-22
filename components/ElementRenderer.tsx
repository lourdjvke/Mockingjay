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
        if (element.type === 'text' && textRef.current && element.content !== textRef.current.innerHTML) {
            textRef.current.innerHTML = element.content || '';
        }
    }, [element.content, element.type]);

    // Auto-resizing logic for text elements.
    useEffect(() => {
        if (element.type !== 'text' || !textRef.current) {
            return;
        }

        const checkResize = () => {
            if (!textRef.current) return;
            // The scrollHeight is the true height of the content.
            const currentHeight = textRef.current.scrollHeight;
            // Only update if the height has meaningfully changed, to avoid infinite loops.
            if (currentHeight > 1 && Math.abs(currentHeight - element.box.height) > 2) {
                updateElement(element.id, { box: { ...element.box, height: currentHeight } });
            }
        };

        // For AI generated content, the initial render might not be correct, so we delay the check.
        const timeoutId = setTimeout(checkResize, 50);

        const observer = new MutationObserver(checkResize);
        observer.observe(textRef.current, {
            childList: true,
            subtree: true,
            characterData: true,
        });

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
        };
    }, [element.id, element.type, element.content, element.box.width, element.style?.fontSize, element.style?.lineHeight, updateElement]);


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
        ...(element.style || {}),
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
    // Quick checks for common updates
    if (
        prevProps.isSelected !== nextProps.isSelected ||
        prevProps.isEditing !== nextProps.isEditing ||
        prevProps.element.id !== nextProps.element.id
    ) {
        return false;
    }

    // If style objects are different, we need to re-render
    if (JSON.stringify(prevProps.element.style) !== JSON.stringify(nextProps.element.style)) {
        return false;
    }

    // If box properties affecting render are different, re-render
    if (
        prevProps.element.box.x !== nextProps.element.box.x ||
        prevProps.element.box.y !== nextProps.element.box.y ||
        prevProps.element.box.width !== nextProps.element.box.width ||
        prevProps.element.box.height !== nextProps.element.box.height ||
        prevProps.element.box.rotation !== nextProps.element.box.rotation
    ) {
        return false;
    }
    
    // For non-text elements, compare content directly.
    if (prevProps.element.type !== 'text' && prevProps.element.content !== nextProps.element.content) {
        return false;
    }
    
    // For text elements, we let the internal state of contentEditable handle it mostly
    // but we need to check for external content changes.
    if (prevProps.element.type === 'text' && prevProps.element.content !== nextProps.element.content) {
        return false;
    }

    // If all checks pass, the props are equal
    return true;
};

export default memo(ElementRenderer, areEqual);
