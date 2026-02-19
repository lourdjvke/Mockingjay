import React, { useState } from 'react';
import { BusinessDNA } from '../types';
import { analyzeBusinessFromScreenshot } from '../services/aiService';
import { Icons } from '../components/IconLibrary';
import { MediaStore } from '../utils';

interface Props {
  onBack: () => void;
  onComplete: (dna: Partial<BusinessDNA>) => void;
}

// Using a named export to match the existing import in App.tsx
export const BusinessDNAInput: React.FC<Props> = ({ onBack, onComplete }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url || !url.startsWith('http')) {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // 1. Capture screenshot using the reliable pageshot.site service
      const response = await fetch('https://pageshot.site/v1/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          width: 1440,
          full_page: true,
          delay: 3000,
          format: 'png',
        }),
      });

      if (!response.ok) {
        throw new Error(`Screenshot service failed with status: ${response.status}`);
      }

      // 2. Convert the response blob to a base64 string for the AI service
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // 3. Preserve existing feature: Save the image to the media store
      await MediaStore.saveImage(base64);

      // 4. Analyze the image with the secure, server-side AI service
      const dna = await analyzeBusinessFromScreenshot(base64, url);

      // 5. Complete the process and navigate to the detail page
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
            <div className="w-24 h-24 bg-teal-500/10 rounded-3xl flex items-center justify-center border border-teal-500/20 shadow-lg">
              <span className="text-6xl">🧬</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
            Generate Business DNA
          </h1>
          <p className="text-white/50 text-lg md:text-xl">
            Enter your website URL and we'll analyze its brand identity.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
          <div>
            <label htmlFor="url-input" className="block text-sm font-medium text-white/80 mb-2">
              Website URL
            </label>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-black/30 border border-white/20 rounded-lg p-4 text-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-black font-bold rounded-lg px-8 py-4 text-xl transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Icons.Loader className="w-6 h-6 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              'Analyze Website'
            )}
          </button>
        </div>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}

        <div className="text-center text-sm text-white/40">
          This will capture a screenshot of your website and analyze its branding.
        </div>
      </div>
    </div>
  );
};
