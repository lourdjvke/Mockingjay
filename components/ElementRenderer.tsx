import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { DesignElement } from '../types';
import ContentEditable from 'react-contenteditable';

interface ElementRendererProps {
  element: DesignElement;
  isSelected: boolean;
  onSelect: (id: string, e: React.PointerEvent) => void;
  onAutoResize: (id: string, height: number) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, isSelected, onSelect, onAutoResize, onContextMenu }) => {
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

  const handleContentChange = (e: any) => {
    // The logic for updating content is handled by the parent
    // This just prevents errors
  };

  const handleDoubleClick = () => {
      if (element.type === 'text') {
          setIsEditing(true);
      }
  }

  const handleBlur = () => {
      setIsEditing(false);
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
            <ContentEditable
                html={element.content || ''}
                disabled={!isEditing}
                onChange={handleContentChange} // We'll implement proper update logic later
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
                    padding: '10px', // Add some padding for better text editing
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
        return <div dangerouslySetInnerHTML={{ __html: element.content || '' }} style={{
            ...sharedStyle,
            fill: element.style.color
        }} />;
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
