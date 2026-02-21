
import React, { useRef, useLayoutEffect, useState } from 'react';
import { DesignElement } from '../types';
import { Icons } from './IconLibrary';

interface ElementRendererProps {
  element: DesignElement;
  isSelected: boolean;
  onSelect: (id: string, e: React.PointerEvent) => void;
  onAutoResize: (id: string, height: number) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  updateElement: (id: string, updates: Partial<DesignElement>) => void;
}

const toPascalCase = (str: string) => {
    return str.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, isSelected, onSelect, onAutoResize, onContextMenu, updateElement }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  useLayoutEffect(() => {
    if (contentRef.current && (element.type === 'text' || element.type === 'icon')) {
        const currentHeight = contentRef.current.offsetHeight;
        if (currentHeight > element.box.height) {
            onAutoResize(element.id, currentHeight);
        }
    }
  }, [element.content, element.box.width, element.style.fontSize, onAutoResize, element.id, element.type]);

  const handleContentChange = (e: React.FocusEvent<HTMLDivElement>) => {
    updateElement(element.id, { content: e.currentTarget.innerHTML });
  };

  const handleDoubleClick = () => {
      if (element.type === 'text') {
          setIsEditing(true);
      }
  }

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
      setIsEditing(false);
      handleContentChange(e);
  }

  const renderElement = () => {
    const sharedStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.box.x,
      top: element.box.y,
      width: element.box.width,
      height: element.box.height,
      transform: `rotate(${element.box.rotation}deg)`,
      opacity: element.style.opacity,
      visibility: element.visible ? 'visible' : 'hidden',
      filter: element.style.filter || 'none',
    };

    switch (element.type) {
      case 'text':
        return (
            <div
                contentEditable={isEditing}
                dangerouslySetInnerHTML={{ __html: element.content || '' }}
                onBlur={handleBlur}
                style={{
                    ...sharedStyle,
                    color: element.style.color,
                    fontSize: element.style.fontSize,
                    fontFamily: element.style.fontFamily,
                    fontWeight: element.style.fontWeight as React.CSSProperties['fontWeight'],
                    textAlign: element.style.textAlign as React.CSSProperties['textAlign'],
                    letterSpacing: element.style.letterSpacing,
                    lineHeight: element.style.lineHeight,
                    backgroundColor: element.style.backgroundColor || 'transparent',
                    borderRadius: element.style.borderRadius,
                    padding: '10px',
                    outline: isEditing ? '2px solid #bef264' : 'none',
                }}
            />
        );
      case 'image':
        return <div style={{
            ...sharedStyle, 
            backgroundImage: `url(${element.content})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: element.style.borderRadius,
        }} />;
      case 'shape':
        return <div style={{
            ...sharedStyle, 
            backgroundColor: element.style.backgroundColor,
            borderRadius: element.style.borderRadius,
            clipPath: element.style.clipPath,
        }} />;
     case 'icon':
        const iconName = toPascalCase(element.content || '');
        const IconComponent = (Icons as any)[iconName];
        if (IconComponent) {
            return <div style={sharedStyle}><IconComponent style={{ color: element.style.color, width: '100%', height: '100%' }} /></div>
        }
        return <div style={sharedStyle}>?</div>;
      default:
        return <div style={sharedStyle}>Unsupported Element</div>;
    }
  };

  return (
    <div 
        onPointerDown={(e) => onSelect(element.id, e)}
        onDoubleClick={handleDoubleClick}
        onContextMenu={onContextMenu}
        ref={contentRef}
    >
      {renderElement()}
    </div>
  );
};

export default ElementRenderer;
