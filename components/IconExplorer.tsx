
import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';

interface IconExplorerProps {
  onSelectIcon: (iconName: string) => void;
  onClose: () => void;
  isMobile: boolean;
}

const IconExplorer: React.FC<IconExplorerProps> = ({ onSelectIcon, onClose, isMobile }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const allIconNames = useMemo(() => Object.keys(LucideIcons).filter(key => key !== 'createLucideIcon' && key !== 'icons' && key !== 'AlertTriangle'), []);

  const filteredIcons = useMemo(() => {
    if (!searchTerm) {
      return allIconNames.slice(0, 100); // Show first 100 by default
    }
    return allIconNames.filter(name =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allIconNames]);

  const handleIconClick = (iconName: string) => {
    onSelectIcon(iconName);
    onClose();
  };

  const containerClasses = isMobile
    ? "fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex flex-col"
    : "fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center";

  const contentClasses = isMobile
    ? "absolute bottom-0 left-0 right-0 h-[85vh] bg-[#111] rounded-t-[20px] overflow-hidden flex flex-col"
    : "bg-zinc-900 border border-white/10 rounded-[24px] w-full max-w-4xl h-[80vh] overflow-hidden shadow-2xl flex flex-col";

  return (
    <div className={containerClasses} onClick={onClose}>
      <div className={contentClasses} onClick={(e) => e.stopPropagation()}>
        {isMobile && <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 shrink-0" />}
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Icon Explorer</h2>
          <p className="text-sm text-white/50">Search the full Lucide icon library.</p>
          <div className="relative mt-4">
            <input
              type="text"
              placeholder="Search icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg h-12 px-4 text-sm focus:outline-none focus:border-lime-400 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {filteredIcons.map(iconName => {
              const IconComponent = LucideIcons[iconName];
              return (
                <div
                  key={iconName}
                  onClick={() => handleIconClick(iconName)}
                  className="bg-white/5 p-4 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-lime-400 hover:text-black transition-colors"
                >
                  <IconComponent className="w-8 h-8" />
                  <span className="text-xs text-center truncate">{iconName}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconExplorer;
