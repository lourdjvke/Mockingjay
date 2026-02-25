import React, { useRef, useLayoutEffect } from 'react';
import { DesignElement } from '../types';
import { Icons } from './IconLibrary';

interface ElementRendererProps {
    element: DesignElement;
    isSelected: boolean;
    onSelect: (id: string, e: React.PointerEvent<HTMLDivElement>) => void;
    onResizeStart: (id: string, handle: string, e: React.PointerEvent<HTMLDivElement>) => void;
    onRotateStart: (id: string, e: React.PointerEvent<HTMLDivElement>) => void;
    updateElement: (id: string, updates: Partial<DesignElement>) => void;
}

const ElementRenderer: React.FC<ElementRendererProps> = ({ 
    element, 
    isSelected, 
    onSelect, 
    onResizeStart, 
    onRotateStart,
    updateElement,
}) => {
    
    const { perspective = 1000, rotateX = 0, rotateY = 0, opacity = 1, ...style } = element.style;
    const transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotate(${element.box.rotation}deg)`;
    const contentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (element.type === 'text' && contentRef.current) {
            const currentHeight = contentRef.current.scrollHeight;
            if (Math.abs(element.box.height - currentHeight) > 1) {
                updateElement(element.id, { box: { ...element.box, height: currentHeight } });
            }
        }
    }, [element.content, element.box.width, element.style.fontSize, element.style.lineHeight, element.style.letterSpacing, element.id, element.box.height, updateElement]);

    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        left: element.box.x,
        top: element.box.y,
        width: element.box.width,
        height: element.box.height,
        transform,
        transformOrigin: 'center center',
        boxSizing: 'border-box',
        visibility: element.visible ? 'visible' : 'hidden',
        pointerEvents: 'auto',
        zIndex: isSelected ? 1000 : 'auto',
        opacity: opacity,
        transition: 'height 0.2s ease-out',
    };

    const contentWrapperStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      ...style,
      backgroundColor: (element.type === 'text' || element.type === 'image' || element.type === 'icon') 
          ? 'transparent' 
          : element.style.backgroundColor,
      borderRadius: element.style.borderRadius,
      overflow: 'hidden',
    };
    
    const selectionStyle: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      outline: '2px solid #84cc16',
      outlineOffset: '2px',
      pointerEvents: 'none',
    }

    const renderContent = () => {
        switch (element.type) {
            case 'text':
                return (
                    <div
                        ref={contentRef}
                        style={{
                            width: '100%',
                            height: 'auto',
                            wordBreak: 'break-word',
                            padding: 10,
                            boxSizing: 'border-box',
                            outline: 'none',
                            whiteSpace: 'pre-wrap',
                            pointerEvents: 'none',
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

    let resizeHandles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    if (element.type === 'text') {
      resizeHandles = ['e', 'w'];
    }

    return (
        <div
            style={containerStyle}
            onPointerDown={(e) => onSelect(element.id, e)}
        >
            <div style={contentWrapperStyle}>
                {renderContent()}
            </div>

            {isSelected && (
                <>
                    <div style={selectionStyle} />

                    {/* Resize Handles */}
                    {resizeHandles.map(handle => (
                        <div
                            key={handle}
                            className={`absolute bg-white border-2 border-lime-500 rounded-full w-4 h-4`}
                            style={{
                                top: handle.includes('n') ? -8 : handle.includes('s') ? 'calc(100% - 8px)' : 'calc(50% - 8px)',
                                left: handle.includes('w') ? -8 : handle.includes('e') ? 'calc(100% - 8px)' : 'calc(50% - 8px)',
                                cursor: `${handle}-resize`,
                                zIndex: 1001
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                onResizeStart(element.id, handle, e);
                            }}
                        />
                    ))}

                    {/* Rotate Handle */}
                    <div
                        className="absolute bg-white border-2 border-lime-500 rounded-full w-5 h-5 flex items-center justify-center"
                        style={{
                            top: -32,
                            left: 'calc(50% - 10px)',
                            cursor: 'alias',
                            zIndex: 1001
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            onRotateStart(element.id, e);
                        }}
                    >
                        <Icons.RotateCw className="w-3 h-3 text-lime-600" />
                    </div>
                </>
            )}
        </div>
    );
};

export default ElementRenderer;
