import React, { useState } from 'react';
import { Icons } from '../components/IconLibrary.tsx';
import { BusinessDNA } from '../types.ts';

interface BusinessDNADetailProps {
  dna: BusinessDNA;
  onUpdate: (updates: Partial<BusinessDNA>) => void;
  onBack: () => void;
  onUseInCampaign?: () => void;
}

const BusinessDNADetail: React.FC<BusinessDNADetailProps> = ({ dna, onUpdate, onBack, onUseInCampaign }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [logoUploadRef] = useState(() => React.createRef<HTMLInputElement>());
  const [imageUploadRef] = useState(() => React.createRef<HTMLInputElement>());

  const startEdit = (field: string, value: any) => {
    setEditingField(field);
    setEditValue(Array.isArray(value) ? value.join(', ') : value);
  };

  const saveEdit = () => {
    if (!editingField) return;

    const value = editingField.includes('Colors') || editingField.includes('Fonts') || editingField.includes('Values')
      ? editValue.split(',').map(v => v.trim())
      : editValue;

    onUpdate({ [editingField]: value } as any);
    setEditingField(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => onUpdate({ logoUrl: event.target?.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate({ images: [...(dna.images || []), event.target?.result as string] });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = [...dna.images];
    newImages.splice(index, 1);
    onUpdate({ images: newImages });
  };

  const EditableSection = ({ title, field, value, multiline = false }: any) => {
    const isEditing = editingField === field;
    const displayValue = Array.isArray(value) ? value.join(', ') : value;

    return (
      <div className="group relative">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold">{title}</h3>
          {!isEditing && (
            <button
              onClick={() => startEdit(field, value)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/5 rounded-lg"
            >
              <Icons.Wand2 className="w-3 h-3 text-lime-400" />
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-2">
            {multiline ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-zinc-900 border border-lime-400/50 rounded-lg p-3 text-sm text-white focus:outline-none resize-none"
                rows={3}
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-zinc-900 border border-lime-400/50 rounded-lg p-3 text-sm text-white focus:outline-none"
                autoFocus
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="flex-1 bg-lime-400 text-black py-2 rounded-lg text-sm font-bold hover:bg-lime-300 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditingField(null)}
                className="flex-1 bg-zinc-700 py-2 rounded-lg text-sm font-medium hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-white text-sm leading-relaxed">{displayValue}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white">
      <input ref={logoUploadRef} type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
      <input ref={imageUploadRef} type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />

      <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <Icons.ArrowLeft className="w-5 h-5" />
            <span className="hidden md:inline">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <Icons.Layout className="w-5 h-5 text-lime-400" />
            <span className="font-bold italic uppercase tracking-tight">Business DNA</span>
          </div>
          {onUseInCampaign && (
            <button
              onClick={onUseInCampaign}
              className="bg-lime-400 text-black px-6 py-2 rounded-full font-bold text-sm hover:bg-lime-300 transition-all active:scale-95"
            >
              Use in Campaign
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8">
        <div className="bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/10">
          <EditableSection title="Brand Name" field="brandName" value={dna.brandName} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <div className="bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <Icons.ImageIcon className="w-5 h-5 text-lime-400" />
                <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold">Website Preview</h3>
              </div>
              {dna.screenshotUrl && (
                <img src={dna.screenshotUrl} alt="Website" className="w-full rounded-xl border border-white/5" />
              )}
            </div>

            <div className="bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/10 space-y-6">
              <EditableSection title="Business Overview" field="businessOverview" value={dna.businessOverview} multiline />
              <EditableSection title="Brand Aesthetic" field="brandAesthetic" value={dna.brandAesthetic} multiline />
              <EditableSection title="Tone of Voice" field="brandToneOfVoice" value={dna.brandToneOfVoice} multiline />
              <EditableSection title="Brand Values" field="brandValues" value={dna.brandValues} />
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold">Logo</h3>
                <button
                  onClick={() => logoUploadRef.current?.click()}
                  className="text-lime-400 hover:text-lime-300 transition-colors"
                >
                  <Icons.Plus className="w-4 h-4" />
                </button>
              </div>
              {dna.logoUrl ? (
                <div className="relative group">
                  <img src={dna.logoUrl} alt="Logo" className="w-full aspect-square object-contain bg-zinc-900/50 rounded-xl p-4" />
                  <button
                    onClick={() => onUpdate({ logoUrl: undefined })}
                    className="absolute top-2 right-2 bg-red-500/80 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icons.Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoUploadRef.current?.click()}
                  className="w-full aspect-square bg-zinc-900/50 rounded-xl border-2 border-dashed border-white/10 hover:border-lime-400/30 transition-colors flex items-center justify-center"
                >
                  <div className="text-center space-y-2">
                    <Icons.Plus className="w-8 h-8 text-white/20 mx-auto" />
                    <p className="text-xs text-white/40">Add Logo</p>
                  </div>
                </button>
              )}
            </div>

            <div className="bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
              <EditableSection title="Fonts" field="topFonts" value={dna.topFonts} />
            </div>

            <div className="bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
              <div className="space-y-4">
                <EditableSection title="Brand Colors" field="brandColors" value={dna.brandColors} />
                <div className="flex gap-2 flex-wrap">
                  {dna.brandColors.map((color, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div style={{ backgroundColor: color }} className="w-12 h-12 rounded-xl border border-white/10" />
                      <span className="text-[9px] text-white/40 font-mono">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold">Images</h3>
                  <button
                    onClick={() => imageUploadRef.current?.click()}
                    className="text-lime-400 hover:text-lime-300 transition-colors"
                  >
                    <Icons.Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {dna.images?.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt={`Brand ${i}`} className="w-full aspect-square object-cover rounded-lg" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-red-500/80 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icons.Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => imageUploadRef.current?.click()}
                    className="aspect-square bg-zinc-900/50 rounded-lg border-2 border-dashed border-white/10 hover:border-lime-400/30 transition-colors flex items-center justify-center"
                  >
                    <Icons.Plus className="w-6 h-6 text-white/20" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessDNADetail;
