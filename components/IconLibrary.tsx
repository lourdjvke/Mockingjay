
import React, { useState, useMemo } from 'react';
import lucideIcons from '@iconify-json/lucide/icons.json';

const toPascalCase = (str: string) => {
  return str.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

const GeneratedIcons: { [key: string]: React.FC<any> } = {};
for (const [name, icon] of Object.entries(lucideIcons.icons)) {
    const pascalName = toPascalCase(name);
    GeneratedIcons[pascalName] = (props) => (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            {...props}
            dangerouslySetInnerHTML={{ __html: icon.body }}
        >
        </svg>
    );
}

const HandPickedIcons = {
  ChevronUp: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m18 15-6-6-6 6"/></svg>,
  ChevronDown: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 9 6 6 6-6"/></svg>,
  History: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>,
  Plus: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  Upload: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
  Trash2: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>,
  Layout: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>,
  ImageIcon: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Type: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>,
  Sparkles: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 3-1.9 4.2-4.2 1.9 4.2 1.9 1.9 4.2 1.9-4.2 4.2-1.9-4.2-1.9L12 3zM3 12l1.9-4.2 4.2-1.9-4.2-1.9L3 12zm18 0-1.9 4.2-4.2 1.9 4.2 1.9L21 12z"/></svg>,
  Download: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
};

export const Icons = { ...GeneratedIcons, ...HandPickedIcons };

const IconWrapper = ({ icon, name }: { icon: { body: string }, name: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="1em" 
    height="1em" 
    viewBox="0 0 24 24"
    className="w-full h-full"
    dangerouslySetInnerHTML={{ __html: icon.body.replace(/<path/g, '<path fill="currentColor"')}}
  >
  </svg>
);

interface IconLibraryProps {
    onIconSelect: (icon: { name: string; svg: string }) => void;
}

const IconLibrary: React.FC<IconLibraryProps> = ({ onIconSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const allIcons = useMemo(() => {
    return Object.entries(lucideIcons.icons).map(([name, icon]) => ({
      name,
      icon
    }));
  }, []);

  const filteredIcons = useMemo(() => {
    if (!searchTerm) {
      return allIcons;
    }
    return allIcons.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allIcons]);

  return (
    <div className="p-4 bg-zinc-900 h-full flex flex-col">
      <input
        type="text"
        placeholder="Search icons..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 mb-4 bg-zinc-800 text-white rounded-lg border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-400"
      />
      <div className="flex-1 overflow-y-auto grid grid-cols-5 gap-2">
        {filteredIcons.map(({ name, icon }) => (
          <div 
            key={name}
            className="p-2 rounded-lg hover:bg-zinc-700 cursor-pointer flex items-center justify-center"
            title={name}
            onClick={() => {
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">${icon.body}</svg>`;
                onIconSelect({ name, svg });
            }}
          >
            {/* @ts-ignore */}
            <IconWrapper icon={icon} name={name} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default IconLibrary;
