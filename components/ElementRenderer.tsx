
import React from 'react';
import { DesignElement } from '../types.ts';

interface Props {
  element: DesignElement;
  isSelected: boolean;
  onSelect: (id: string, e: React.PointerEvent) => void;
}

const ElementRenderer: React.FC<Props> = ({ element, isSelected, onSelect }) => {
  if (!element.visible) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: element.box.x,
    top: element.box.y,
    width: element.box.width,
    height: element.box.height,
    transform: `rotate(${element.box.rotation}deg)`,
    opacity: element.style.opacity ?? 1,
    cursor: 'move',
    zIndex: isSelected ? 50 : 10,
    userSelect: 'none',
    touchAction: 'none'
  };

  const borderStyle = {
    borderRadius: `${element.style.borderRadius ?? 0}px`,
    borderWidth: `${element.style.strokeWidth ?? 0}px`,
    borderColor: element.style.strokeColor ?? '#000',
    borderStyle: element.style.strokePattern ?? 'solid',
    overflow: 'hidden'
  };

  const renderContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div
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
              height: '100%',
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
