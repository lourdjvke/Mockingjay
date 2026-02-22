import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { DesignElement, BoundingBox } from '../types';
import { Icons } from './IconLibrary';

interface ElementRendererProps {
    element: DesignElement;
    isEditing: boolean;
    onSelect: (id: string, e: React.PointerEvent<HTMLDivElement>) => void;
    onFinishEdit: (id: string, updates: Partial<DesignElement>) => void;
}

// This utility calculates the required height for a given piece of HTML content and element style.
const getTextHeight = (element: DesignElement, content: string, width: number) => {
    const tempDiv = document.createElement('div');
    Object.assign(tempDiv.style, {
        width: `${width}px`,
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
    const cleansedContent = content.replace(/^(<br\s*\/?>|\s|&nbsp;)+|(<br\s*\/?>|\s|&nbsp;)+$/g, "");
    tempDiv.innerHTML = cleansedContent || '&nbsp;';
    document.body.appendChild(tempDiv);
    const height = tempDiv.scrollHeight;
    document.body.removeChild(tempDiv);
    return height;
};

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, isEditing, onSelect, onFinishEdit }) => {
    const containerRef = useRef<HTMLDivElement>(null); // Ref for the main container div
    const textRef = useRef<HTMLDivElement>(null);      // Ref for the contentEditable div
    const isEditingRef = useRef(false);

    // This effect syncs the editable div's content from props, but ONLY when not editing.
    // This prevents external changes from overriding the user's typing.
    useLayoutEffect(() => {
        const div = textRef.current;
        if (div && !isEditing && div.innerHTML !== element.content) {
            div.innerHTML = element.content || '';
        }
    }, [element.content, isEditing]);

    // This is the auto-resizing effect. It runs ONLY when editing starts.
    useEffect(() => {
        if (!isEditing || !textRef.current || !containerRef.current) return;

        const textDiv = textRef.current;
        const containerDiv = containerRef.current;

        const handleInput = () => {
            // On every input, calculate the new required height.
            const newHeight = getTextHeight(element, textDiv.innerHTML, element.box.width);

            // Directly manipulate the DOM to change the container's height. 
            // This is imperative and breaks out of the React render cycle, which is
            // CRITICAL to preventing the caret jump. No setState is called here.
            if (Math.abs(newHeight - containerDiv.offsetHeight) > 1) {
                containerDiv.style.height = `${newHeight}px`;
            }
        };

        textDiv.addEventListener('input', handleInput);
        return () => textDiv.removeEventListener('input', handleInput);
        
    }, [isEditing, element]); // Dependency on `element` is safe here, as it only runs once on edit start.

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
        isEditingRef.current = isEditing;
    }, [isEditing]);

    // When the user clicks away, finalize the edit.
    const handleBlur = () => {
        if (textRef.current && containerRef.current && isEditing) {
            const finalContent = textRef.current.innerHTML;
            const cleansedContent = finalContent.replace(/^(<br\s*\/?>|\s|&nbsp;)+|(<br\s*\/?>|\s|&nbsp;)+$/g, "");
            
            // Get the final height directly from the DOM node.
            const finalHeight = containerRef.current.offsetHeight;

            // Call the parent with the complete, final update. This is the ONLY update sent.
            onFinishEdit(element.id, {
                content: cleansedContent,
                box: { ...element.box, height: finalHeight },
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
            ref={containerRef} // Attach ref to the container
            style={containerStyle}
            onPointerDown={(e) => onSelect(element.id, e)}
        >
            {renderContent()}
        </div>
    );
};

export default ElementRenderer;
