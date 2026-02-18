
import React, { useRef, useEffect } from 'react';
import { DesignElement } from '../types.ts';

interface Props {
  element: DesignElement;
  isSelected: boolean;
  onSelect: (id: string, e: React.PointerEvent) => void;
  onAutoResize?: (id: string, newHeight: number) => void;
}

const ElementRenderer: React.FC<Props> = ({ element, isSelected, onSelect, onAutoResize }) => {
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (element.type === 'text' && textRef.current && onAutoResize) {
      const scrollH = textRef.current.scrollHeight;
      if (scrollH > element.box.height + 2) {
        onAutoResize(element.id, scrollH);
      }
    }
  }, [element.content, element.style.fontSize, element.style.fontFamily, element.style.lineHeight, element.style.letterSpacing, element.box.width]);

  if (!element.visible) return null;

  const isText = element.type === 'text';
  const style: React.CSSProperties = {
    position: 'absolute',
    left: element.box.x,
    top: element.box.y,
    width: element.box.width,
    height: isText ? undefined : element.box.height,
    minHeight: isText ? element.box.height : undefined,
    transform: `rotate(${element.box.rotation}deg)`,
    opacity: element.style.opacity ?? 1,
    cursor: 'move',
    zIndex: isSelected ? 50 : 10,
    userSelect: 'none',
    touchAction: 'none'
  };

  const borderStyle: React.CSSProperties = {
    borderRadius: `${element.style.borderRadius ?? 0}px`,
    borderWidth: `${element.style.strokeWidth ?? 0}px`,
    borderColor: element.style.strokeColor ?? '#000',
    borderStyle: element.style.strokePattern ?? 'solid',
    overflow: 'hidden',
    clipPath: element.style.clipPath
  };

  const renderContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div
            ref={textRef}
            style={{
              ...borderStyle,
              color: element.style.color,
              fontSize: element.style.fontSize,
              fontFamily: element.style.fontFamily,
              fontWeight: element.style.fontWeight,
              textAlign: element.style.textAlign,
              lineHeight: element.style.lineHeight,
              letterSpacing: `${element.style.letterSpacing ?? 0}px`,
              width: '100%',
              minHeight: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: element.style.textAlign === 'center' ? 'center' : (element.style.textAlign === 'right' ? 'flex-end' : 'flex-start'),
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              padding: '8px',
              backgroundColor: element.style.backgroundColor
            }}
          >
            {element.content}
          </div>
        );
      case 'shape':
        return (
          <div
            style={{
              ...borderStyle,
              width: '100%',
              height: '100%',
              backgroundColor: element.style.backgroundColor
            }}
          />
        );
      case 'image':
        return (
          <div style={{ ...borderStyle, width: '100%', height: '100%' }}>
            <img
              src={element.content}
              alt={element.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              draggable={false}
            />
          </div>
        );
      case 'icon':
        return (
           <div 
             style={{ ...borderStyle, width: '100%', height: '100%', color: element.style.color }}
             dangerouslySetInnerHTML={{ __html: element.content }}
           />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      style={style} 
      onPointerDown={(e) => onSelect(element.id, e)}
      className="group"
    >
      {renderContent()}
    </div>
  );
};

export default ElementRenderer;
