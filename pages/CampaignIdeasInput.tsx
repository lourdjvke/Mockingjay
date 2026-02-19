import React, { useState, useEffect } from 'react';
import { Icons } from '../components/IconLibrary.tsx';
import { generateCampaignDesigns } from '../services/aiService.ts';
import { BusinessDNA } from '../types.ts';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase.ts';

interface CampaignIdeasInputProps {
  onComplete: (campaign: any) => void;
  onBack: () => void;
  user: any;
}

const CampaignIdeasInput: React.FC<CampaignIdeasInputProps> = ({ onComplete, onBack, user }) => {
  const [prompt, setPrompt] = useState('');
  const [pageCount, setPageCount] = useState(3);
  const [selectedDnaId, setSelectedDnaId] = useState<string | null>(null);
  const [dnas, setDnas] = useState<BusinessDNA[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const dnasRef = ref(db, `users/${user.uid}/dnas`);
    const unsubscribe = onValue(dnasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
        setDnas(list.sort((a, b) => b.createdAt - a.createdAt));
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleGenerate = async () => {
    if (!prompt) {
      setError('Please enter a campaign prompt');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const selectedDna = selectedDnaId ? dnas.find(d => d.id === selectedDnaId) : undefined;
      const designs = await generateCampaignDesigns(prompt, pageCount, selectedDna);

      onComplete({
        name: prompt.slice(0, 50),
        prompt,
        pageCount,
        dnaId: selectedDnaId,
        designs: {
          ...designs,
          currentPageIndex: 0,
          selectedElementId: null
        }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate campaign');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white flex flex-col items-center justify-center p-4 md:p-8">
      <div className="max-w-2xl w-full space-y-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <Icons.ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-lime-400/20 rounded-3xl flex items-center justify-center">
              <span className="text-5xl">📢</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-serif italic">
            Get Campaign Ideas
          </h1>
          <p className="text-white/60 text-lg">
            Tell us about your campaign and we'll generate designs
          </p>
        </div>

        <div className="bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-white/10 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-white/80 uppercase tracking-wider">
              Campaign Description
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Summer sale promotion with beach vibes and tropical colors"
              className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/30 focus:border-lime-400/50 focus:outline-none transition-colors resize-none h-32"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-white/80 uppercase tracking-wider">
              Number of Pages
            </label>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setPageCount(num)}
                  disabled={isLoading}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                    pageCount === num
                      ? 'bg-lime-400 text-black'
                      : 'bg-zinc-900/50 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {dnas.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-white/80 uppercase tracking-wider">
                Use Business DNA (Optional)
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                <button
                  onClick={() => setSelectedDnaId(null)}
                  className={`w-full p-4 rounded-xl transition-all text-left ${
                    selectedDnaId === null
                      ? 'bg-lime-400/20 border-2 border-lime-400'
                      : 'bg-zinc-900/50 border border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="font-medium">No DNA (Generic)</div>
                  <div className="text-xs text-white/60 mt-1">Generate without brand guidelines</div>
                </button>
                {dnas.map((dna) => (
                  <button
                    key={dna.id}
                    onClick={() => setSelectedDnaId(dna.id)}
                    className={`w-full p-4 rounded-xl transition-all text-left ${
                      selectedDnaId === dna.id
                        ? 'bg-lime-400/20 border-2 border-lime-400'
                        : 'bg-zinc-900/50 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {dna.logoUrl && (
                        <img src={dna.logoUrl} alt={dna.brandName} className="w-10 h-10 object-contain rounded-lg bg-zinc-800/50 p-1" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{dna.brandName}</div>
                        <div className="text-xs text-white/60 mt-1">{dna.brandToneOfVoice}</div>
                      </div>
                      <div className="flex gap-1">
                        {dna.brandColors.slice(0, 3).map((color, i) => (
                          <div key={i} style={{ backgroundColor: color }} className="w-4 h-4 rounded border border-white/10" />
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt}
            className="w-full bg-lime-400 text-black py-5 rounded-2xl font-bold text-lg hover:bg-lime-300 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_40px_rgba(163,230,53,0.3)] uppercase tracking-tight italic flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Generating Campaign...
              </>
            ) : (
              <>
                <Icons.Wand2 className="w-5 h-5" />
                Generate Campaign
              </>
            )}
          </button>
        </div>

        <div className="text-center text-sm text-white/40">
          We'll create {pageCount} page{pageCount > 1 ? 's' : ''} based on your prompt
          {selectedDnaId && ' using your selected brand DNA'}
        </div>
      </div>
    </div>
  );
};

export default CampaignIdeasInput;
