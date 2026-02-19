import React, { useState, useEffect } from 'react';
import { Icons } from './IconLibrary.tsx';
import { saveBrandKit, loadAllBrandKits, deleteBrandKit, createNewProject, loadAllProjects, deleteProject, type User } from '../firebase.ts';

interface BrandGuideline {
  brandName: string;
  brandColors: string[];
  topFonts: string[];
  brandValues: string[];
  toneOfVoice: string;
  brandAesthetic: string;
  businessOverview: string;
  topHexColors: string[];
  screenshotUrl?: string;
  url: string;
}

interface ProjectSummary {
  name: string;
  createdAt: number;
  updatedAt: number;
  brandContext?: BrandGuideline | null;
}

interface BrandKitPageProps {
  user: User;
  onSignOut: () => void;
  onOpenEditor: (projectId: string, brandContext?: BrandGuideline | null) => void;
}

const BrandKitPage: React.FC<BrandKitPageProps> = ({ user, onSignOut, onOpenEditor }) => {
  const [url, setUrl] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [screenshotBlob, setScreenshotBlob] = useState<string | null>(null);
  const [brandGuideline, setBrandGuideline] = useState<BrandGuideline | null>(null);
  const [brandKits, setBrandKits] = useState<Record<string, BrandGuideline & { updatedAt: number }>>({});
  const [projects, setProjects] = useState<Record<string, ProjectSummary>>({});
  const [activeTab, setActiveTab] = useState<'create' | 'kits' | 'projects'>('create');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [user.uid]);

  const loadData = async () => {
    try {
      const [kits, projs] = await Promise.all([
        loadAllBrandKits(user.uid),
        loadAllProjects(user.uid)
      ]);
      setBrandKits(kits);
      setProjects(projs);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const captureScreenshot = async () => {
    if (!url.trim()) return;
    setIsCapturing(true);
    setError('');
    setScreenshotBlob(null);
    setBrandGuideline(null);

    try {
      const response = await fetch('https://pageshot.site/v1/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          width: 1440,
          full_page: true,
          delay: 3000,
          format: 'png'
        })
      });

      if (!response.ok) throw new Error(`Screenshot failed: ${response.status}`);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setScreenshotBlob(base64);
        setIsCapturing(false);
        analyzeWithAI(base64);
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      setError(err.message || 'Screenshot capture failed');
      setIsCapturing(false);
    }
  };

  const analyzeWithAI = async (screenshotBase64: string) => {
    setIsAnalyzing(true);
    try {
      const apiKey = "AIzaSyC8OAZN6qdzsSKXLO2tV7stx-p5hFifhKM";
      const modelName = "gemini-2.5-flash";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const payload = {
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: "image/png",
                data: screenshotBase64.replace(/^data:image\/\w+;base64,/, '')
              }
            },
            {
              text: `Analyze this website screenshot and extract brand guidelines. The URL is: ${url}

Return ONLY a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "brandName": "Company/Brand name",
  "brandColors": ["#hex1", "#hex2", "#hex3"],
  "topFonts": ["Font Family 1", "Font Family 2", "Font Family 3"],
  "brandValues": ["value1", "value2", "value3"],
  "toneOfVoice": "Description of brand tone",
  "brandAesthetic": "Description of visual aesthetic",
  "businessOverview": "What this business does, perceived industry and target audience",
  "topHexColors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"]
}

Be specific with hex colors - pick the actual dominant colors from the screenshot. For fonts, identify the likely font families used. For brand values, infer from the overall design and messaging.`
            }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      };

      const result = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!result.ok) throw new Error('AI analysis failed');
      const data = await result.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No AI response');

      let cleaned = text.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }

      const parsed: BrandGuideline = JSON.parse(cleaned);
      parsed.url = url;
      parsed.screenshotUrl = screenshotBase64;
      setBrandGuideline(parsed);

      // Auto-save to RTDB
      const kitId = `kit_${Date.now()}`;
      await saveBrandKit(user.uid, kitId, parsed);
      await loadData();
    } catch (err: any) {
      setError('AI analysis failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateFromBrand = async (kit: BrandGuideline) => {
    try {
      const projectId = await createNewProject(user.uid, `${kit.brandName} Design`, kit);
      onOpenEditor(projectId, kit);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleCreateBlank = async () => {
    try {
      const projectId = await createNewProject(user.uid, 'Untitled');
      onOpenEditor(projectId, null);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleDeleteKit = async (kitId: string) => {
    await deleteBrandKit(user.uid, kitId);
    await loadData();
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(user.uid, projectId);
    await loadData();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icons.Layout className="w-6 h-6 text-lime-400" />
            <h1 className="text-xl font-bold italic tracking-tight uppercase">Mockingjay</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user.photoURL && <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-white/10" />}
              <span className="text-sm text-white/60 hidden md:block">{user.displayName}</span>
            </div>
            <button onClick={onSignOut} className="text-xs text-white/30 hover:text-white/60 uppercase font-bold tracking-wider transition-colors">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 rounded-2xl p-1 mb-8 max-w-md">
          {(['create', 'kits', 'projects'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-lime-400 text-black' : 'text-white/40 hover:text-white/60'}`}
            >
              {tab === 'create' ? 'Brand Kit' : tab === 'kits' ? 'My Kits' : 'Projects'}
            </button>
          ))}
        </div>

        {activeTab === 'create' && (
          <div className="space-y-8">
            {/* URL Input */}
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
              <h2 className="text-lg font-bold italic uppercase tracking-tight mb-2">Extract Brand Kit</h2>
              <p className="text-white/40 text-sm mb-6">Paste a URL and we will capture the site and analyze its brand identity using AI.</p>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && captureScreenshot()}
                  placeholder="https://example.com"
                  className="flex-1 bg-black/50 border border-white/10 rounded-2xl h-14 px-5 text-sm focus:outline-none focus:border-lime-400 transition-colors placeholder:text-white/20"
                />
                <button
                  onClick={captureScreenshot}
                  disabled={isCapturing || isAnalyzing || !url.trim()}
                  className="bg-lime-400 text-black px-8 h-14 rounded-2xl font-bold text-sm uppercase tracking-wider hover:bg-lime-300 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCapturing ? 'Capturing...' : isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  <Icons.ArrowRight className="w-5 h-5" />
                </button>
              </div>
              {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
            </div>

            {/* Loading States */}
            {(isCapturing || isAnalyzing) && (
              <div className="flex flex-col items-center justify-center py-16 gap-6">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-lime-400 border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icons.Wand2 className="w-8 h-8 text-lime-400 animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold italic uppercase">{isCapturing ? 'Capturing Screenshot' : 'AI Analyzing Brand'}</h3>
                  <p className="text-white/30 text-xs uppercase tracking-widest mt-1">{isCapturing ? 'Taking a full-page snapshot...' : 'Extracting colors, fonts, and brand identity...'}</p>
                </div>
              </div>
            )}

            {/* Brand Guideline Result - Bento Grid */}
            {brandGuideline && !isAnalyzing && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold italic uppercase tracking-tight">{brandGuideline.brandName}</h2>
                  <button
                    onClick={() => handleCreateFromBrand(brandGuideline)}
                    className="bg-lime-400 text-black px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-lime-300 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Icons.Sparkles className="w-4 h-4" /> Create Design
                  </button>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-auto">
                  {/* Colors - Large */}
                  <div className="col-span-2 bg-zinc-900 border border-white/5 rounded-2xl p-6 hover:border-white/15 transition-all hover:-translate-y-0.5 duration-300">
                    <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Top Colors</span>
                    <div className="flex gap-3 mt-4 flex-wrap">
                      {brandGuideline.topHexColors.map((c, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                          <div className="w-14 h-14 rounded-xl border border-white/10 shadow-lg hover:scale-110 transition-transform cursor-pointer" style={{ backgroundColor: c }} />
                          <span className="text-[9px] text-white/40 font-mono">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fonts */}
                  <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 hover:border-white/15 transition-all hover:-translate-y-0.5 duration-300">
                    <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Fonts</span>
                    <div className="mt-4 space-y-2">
                      {brandGuideline.topFonts.map((f, i) => (
                        <div key={i} className="text-sm font-medium text-white/70">{f}</div>
                      ))}
                    </div>
                  </div>

                  {/* Tone */}
                  <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 hover:border-white/15 transition-all hover:-translate-y-0.5 duration-300">
                    <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Tone</span>
                    <p className="text-sm text-white/60 mt-4 leading-relaxed">{brandGuideline.toneOfVoice}</p>
                  </div>

                  {/* Brand Values */}
                  <div className="col-span-2 md:col-span-1 bg-zinc-900 border border-white/5 rounded-2xl p-6 hover:border-white/15 transition-all hover:-translate-y-0.5 duration-300">
                    <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Values</span>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {brandGuideline.brandValues.map((v, i) => (
                        <span key={i} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-xs text-white/60">{v}</span>
                      ))}
                    </div>
                  </div>

                  {/* Aesthetic */}
                  <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 hover:border-white/15 transition-all hover:-translate-y-0.5 duration-300">
                    <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Aesthetic</span>
                    <p className="text-sm text-white/60 mt-4 leading-relaxed">{brandGuideline.brandAesthetic}</p>
                  </div>

                  {/* Business Overview - Wide */}
                  <div className="col-span-2 bg-zinc-900 border border-white/5 rounded-2xl p-6 hover:border-white/15 transition-all hover:-translate-y-0.5 duration-300">
                    <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Business Overview</span>
                    <p className="text-sm text-white/60 mt-4 leading-relaxed">{brandGuideline.businessOverview}</p>
                  </div>

                  {/* Brand Colors Palette */}
                  <div className="col-span-2 bg-zinc-900 border border-white/5 rounded-2xl p-6 hover:border-white/15 transition-all hover:-translate-y-0.5 duration-300">
                    <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Brand Palette</span>
                    <div className="flex gap-2 mt-4">
                      {brandGuideline.brandColors.map((c, i) => (
                        <div key={i} className="flex-1 h-16 rounded-xl first:rounded-l-2xl last:rounded-r-2xl" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Screenshot Preview */}
                {screenshotBlob && (
                  <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 hover:border-white/15 transition-all">
                    <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-3 block">Site Preview</span>
                    <div className="rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                      <img src={screenshotBlob} alt="Website screenshot" className="w-full" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            {!isCapturing && !isAnalyzing && !brandGuideline && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleCreateBlank}
                  className="bg-zinc-900 border border-white/10 rounded-2xl p-8 text-left hover:border-lime-400/30 transition-all group active:scale-[0.98]"
                >
                  <Icons.Plus className="w-10 h-10 text-lime-400 mb-4 group-hover:rotate-90 transition-transform duration-300" />
                  <h3 className="text-lg font-bold italic uppercase">Blank Canvas</h3>
                  <p className="text-white/30 text-sm mt-1">Start from scratch with a clean editor</p>
                </button>
                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 text-left opacity-80">
                  <Icons.Wand2 className="w-10 h-10 text-lime-400 mb-4" />
                  <h3 className="text-lg font-bold italic uppercase">From Brand URL</h3>
                  <p className="text-white/30 text-sm mt-1">Enter a URL above to extract brand identity and start designing</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'kits' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold italic uppercase tracking-tight mb-4">Saved Brand Kits</h2>
            {Object.keys(brandKits).length === 0 ? (
              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-12 text-center">
                <Icons.Layout className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No brand kits yet. Analyze a URL to create one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(brandKits).map(([id, kit]) => (
                  <div key={id} className="bg-zinc-900 border border-white/5 rounded-2xl p-6 hover:border-white/15 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{kit.brandName}</h3>
                        <p className="text-white/30 text-xs mt-1">{kit.url}</p>
                      </div>
                      <button onClick={() => handleDeleteKit(id)} className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Icons.Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-1.5 mb-4">
                      {(kit.topHexColors || kit.brandColors || []).slice(0, 5).map((c: string, i: number) => (
                        <div key={i} className="w-8 h-8 rounded-lg" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <button
                      onClick={() => handleCreateFromBrand(kit)}
                      className="w-full bg-lime-400/10 text-lime-400 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-lime-400/20 transition-colors"
                    >
                      Create Design
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold italic uppercase tracking-tight">My Projects</h2>
              <button onClick={handleCreateBlank} className="bg-lime-400 text-black px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-lime-300 transition-all active:scale-95 flex items-center gap-2">
                <Icons.Plus className="w-4 h-4" /> New
              </button>
            </div>
            {Object.keys(projects).length === 0 ? (
              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-12 text-center">
                <Icons.Layout className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No projects yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(projects).sort(([, a], [, b]) => (b.updatedAt || 0) - (a.updatedAt || 0)).map(([id, proj]) => (
                  <div key={id} className="bg-zinc-900 border border-white/5 rounded-2xl p-6 hover:border-white/15 transition-all group cursor-pointer active:scale-[0.98]" onClick={() => onOpenEditor(id, proj.brandContext)}>
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-sm">{proj.name || 'Untitled'}</h3>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(id); }} className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Icons.Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {proj.brandContext && (
                      <div className="flex gap-1 mb-3">
                        {(proj.brandContext.topHexColors || []).slice(0, 4).map((c: string, i: number) => (
                          <div key={i} className="w-5 h-5 rounded" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    )}
                    <p className="text-white/20 text-[10px] uppercase tracking-wider">
                      {proj.updatedAt ? new Date(proj.updatedAt).toLocaleDateString() : 'New'}
                      {proj.brandContext ? ` - ${proj.brandContext.brandName}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default BrandKitPage;
