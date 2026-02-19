import React, { useState } from 'react';
import { Icons } from '../components/IconLibrary.tsx';
import { analyzeBusinessFromScreenshot } from '../services/aiService.ts';
import { BusinessDNA } from '../types.ts';

interface BusinessDNAInputProps {
  onComplete: (dna: Partial<BusinessDNA>) => void;
  onBack: () => void;
}

const BusinessDNAInput: React.FC<BusinessDNAInputProps> = ({ onComplete, onBack }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const screenshotUrl = `https://pageshot.site/v1/screenshot?url=${encodeURIComponent(url)}&width=1440&full_page=true&delay=3000&format=png`;

      const response = await fetch(screenshotUrl);
      if (!response.ok) throw new Error('Failed to capture screenshot');

      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const dna = await analyzeBusinessFromScreenshot(base64, url);
      onComplete(dna);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze website');
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
            <div className="w-20 h-20 bg-teal-500/20 rounded-3xl flex items-center justify-center">
              <span className="text-5xl">🧬</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-serif italic">
            Generate Business DNA
          </h1>
          <p className="text-white/60 text-lg">
            Enter your website URL and we'll analyze your brand
          </p>
        </div>

        <div className="bg-zinc-800/40 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-white/10 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-white/80 uppercase tracking-wider">
              Website URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/30 focus:border-lime-400/50 focus:outline-none transition-colors text-lg"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isLoading || !url}
            className="w-full bg-lime-400 text-black py-5 rounded-2xl font-bold text-lg hover:bg-lime-300 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_40px_rgba(163,230,53,0.3)] uppercase tracking-tight italic flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Icons.Sparkles className="w-5 h-5" />
                Analyze Website
              </>
            )}
          </button>
        </div>

        <div className="text-center text-sm text-white/40">
          This will capture a screenshot of your website and analyze its branding
        </div>
      </div>
    </div>
  );
};

export default BusinessDNAInput;
