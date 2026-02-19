import React, { useState, useEffect } from 'react';
import { getDatabase, ref, push, onValue, remove } from "firebase/database";
import { 
  Beaker, 
  ChevronDown, 
  ArrowLeft, 
  Link as LinkIcon, 
  Plus, 
  Dna, 
  X,
  Megaphone,
  Pencil,
  MessageSquare,
  ShieldCheck,
  Eye,
  Globe,
  Loader2,
  Sparkles,
  Search,
  History,
  Trash2
} from 'lucide-react';

const BrandDna = ({ onClose }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [brandData, setBrandData] = useState(null);
  const [images, setImages] = useState([]);
  const [history, setHistory] = useState([]);
      
  const db = getDatabase();
      
  useEffect(() => {
    const brandRef = ref(db, 'brands');
    onValue(brandRef, (snapshot) => {
      const data = snapshot.val();
      const loadedHistory = [];
      for (let id in data) {
        loadedHistory.push({ id, ...data[id] });
      }
      setHistory(loadedHistory.sort((a, b) => b.timestamp - a.timestamp));
    });
  }, [db]);
      
  const fetchWithRetry = async (url, options, retries = 5, backoff = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`HTTP Error: ${response.status} - ${errorBody}`);
      }
      return response;
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw err;
    }
  };
      
  const analyzeBrand = async (screenshotBase64, websiteUrl) => {
    setStatus("AI analyzing brand identity...");
    try {
      const response = await fetchWithRetry('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshotBase64, websiteUrl }),
      });
      return await response.json();
    } catch (error) {
      console.error("Analysis failed:", error);
      throw new Error("Failed to analyze brand with AI.");
    }
  };
      
  const handleProcessBrand = async (e) => {
    e.preventDefault();
    if (!url) return;
      
    setLoading(true);
    setStatus("Capturing screenshot...");
      
    try {
      const response = await fetch('https://pageshot.site/v1/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.startsWith('http') ? url : `https://${url}`,
          width: 1440,
          full_page: false,
          delay: 3000,
          format: 'png'
        })
      });
      
      if (!response.ok) throw new Error(`Screenshot failed: ${response.status}`);
            
      const blob = await response.blob();
            
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      const base64Image = await base64Promise;
    
      const aiResult = await analyzeBrand(base64Image, url);
          
      const newEntry = {
        ...aiResult,
        url: url,
        screenshot: base64Image, // Save as base64
        images: [{ id: Date.now(), url: base64Image, label: 'Website Capture' }],
        timestamp: Date.now()
      };
    
      // Save to Firebase
      const brandRef = ref(db, 'brands');
      await push(brandRef, newEntry);
          
      setBrandData(newEntry);
      setImages(newEntry.images);
      setStatus('');
    } catch (error) {
      console.error(error);
      setStatus("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };
    
  const openFromHistory = (item) => {
    setBrandData(item);
    setImages(item.images || []);
    setUrl(item.url);
  };
    
  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation();
    const brandRef = ref(db, `brands/${id}`);
    await remove(brandRef);
  };
    
  const removeImage = (id) => {
    setImages(images.filter(img => img.id !== id));
  };
    
  const EditableSection = ({ children, className = "" }) => (
    <div className={`group relative cursor-pointer ${className}`}>
      {children}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1.5 rounded-lg border border-white/10">
        <Pencil size={14} className="text-[#d4e157]" />
      </div>
    </div>
  );

  const mainContent = () => {
    if (!brandData && !loading) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-start p-6 pt-24">
          <div className="max-w-xl w-full text-center">
             <div className="bg-[#d4e157] w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-8 text-black shadow-2xl shadow-[#d4e157]/20">
              <Beaker size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-serif italic text-white mb-4">Mock Lab</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">Enter your website URL to instantly extract your brand identity and build your Business DNA.</p>
                
            <form onSubmit={handleProcessBrand} className="relative group mb-16">
              <div className="absolute inset-y-0 left-5 flex items-center text-gray-500 group-focus-within:text-[#d4e157] transition-colors">
                <Globe size={20} />
              </div>
              <input 
                type="text" 
                placeholder="https://yourbrand.com" 
                className="w-full bg-[#1a1a1a] border border-gray-800 rounded-2xl py-5 pl-14 pr-32 text-white focus:outline-none focus:border-[#d4e157] transition-all shadow-2xl"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button 
                type="submit"
                className="absolute right-2 top-2 bottom-2 bg-[#d4e157] text-black px-6 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
              >
                Analyze
              </button>
            </form>
      
            {history.length > 0 && (
              <div className="w-full text-left">
                <div className="flex items-center gap-2 mb-6 text-gray-500 px-2">
                  <History size={16} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Recent Extractions</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {history.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => openFromHistory(item)}
                      className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:border-[#d4e157]/50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                          {item.screenshot ? (
                            <img src={item.screenshot} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Dna size={16} className="text-gray-600" /></div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-white font-medium text-sm">{item.businessName}</h4>
                          <p className="text-gray-500 text-[11px] truncate max-w-[180px]">{item.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-1">
                          {item.colors?.slice(0, 3).map((c, i) => (
                            <div key={i} className="w-3 h-3 rounded-full border border-[#1a1a1a]" style={{ backgroundColor: c }}></div>
                          ))}
                        </div>
                        <button 
                          onClick={(e) => handleDeleteHistory(e, item.id)}
                          className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
      
    if (loading) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-[#d4e157] blur-3xl opacity-20 animate-pulse"></div>
              <Loader2 size={64} className="text-[#d4e157] animate-spin relative z-10" />
            </div>
            <p className="text-white font-serif italic text-2xl mb-2">{status || "Processing..."}</p>
            <p className="text-gray-500 text-sm animate-pulse tracking-widest uppercase">Consulting with AI</p>
          </div>
        </div>
      );
    }
      
    if (brandData) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans p-4 md:p-8">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-3 flex items-center justify-between w-full md:w-64 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-[#d4e157] p-1.5 rounded-lg text-black">
                    <Beaker size={20} />
                  </div>
                  <span className="font-bold text-xl text-gray-100">Mockingjay</span>
                  <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded-full text-gray-400 uppercase tracking-widest">DNA</span>
                </div>
                <X size={18} className="text-gray-500 cursor-pointer" onClick={onClose} />
              </div>
            </div>
        
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setBrandData(null)} // This will now show the initial screen
                className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-xl border border-gray-800 text-sm hover:bg-gray-800 transition-colors"
              >
                <Search size={16} />
                New Scan
              </button>
              <div className="w-10 h-10 rounded-full border-2 border-[#d4e157] overflow-hidden bg-gray-700">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${brandData.businessName}`} alt="User" />
              </div>
            </div>
          </header>
        
          <main className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex justify-center mb-4 text-[#d4e157]">
                <Sparkles size={40} />
              </div>
              <h1 className="text-4xl md:text-6xl font-serif italic mb-4 text-white">The DNA of {brandData.businessName}</h1>
              <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
                Generated from {brandData.url}. Review and refine your brand identity below.
              </p>
            </div>
        
            <div className="bg-[#1a1a1a] rounded-[2.5rem] p-6 md:p-10 border border-gray-800 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
              <div className="lg:col-span-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EditableSection className="bg-[#262626] rounded-3xl p-8 border border-gray-700/50 flex flex-col justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{brandData.businessName}</h2>
                      <div className="flex items-center gap-2 text-[#d4e157]">
                        <LinkIcon size={14} />
                        <span className="text-xs font-mono">{brandData.url.replace(/(^\w+:|^)\/\//, '')}</span>
                      </div>
                    </div>
                    <div className="mt-6">
                       <p className="text-gray-400 text-sm leading-relaxed">
                        {brandData.overview}
                      </p>
                    </div>
                  </EditableSection>
        
                  <div className="bg-[#3a3d2e]/40 rounded-3xl p-6 border border-[#d4e157]/20 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#3a3d2e]/60 transition-colors h-full min-h-[180px]">
                    <Plus size={24} className="text-[#d4e157]" />
                    <span className="text-[#d4e157] font-bold text-sm">Upload Logo</span>
                  </div>
                </div>
        
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <EditableSection className="bg-[#262626] rounded-3xl p-6 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-4 text-[#d4e157]">
                       <ShieldCheck size={16} />
                       <span className="text-[10px] uppercase font-bold tracking-widest">Values</span>
                    </div>
                    <ul className="text-sm text-gray-300 space-y-2">
                      {brandData.values?.map((v, i) => <li key={i}>• {v}</li>)}
                    </ul>
                  </EditableSection>
        
                  <EditableSection className="bg-[#262626] rounded-3xl p-6 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-4 text-[#d4e157]">
                       <MessageSquare size={16} />
                       <span className="text-[10px] uppercase font-bold tracking-widest">Tone</span>
                    </div>
                    <p className="text-sm text-gray-300 italic">"{brandData.tone}"</p>
                  </EditableSection>
        
                  <EditableSection className="bg-[#262626] rounded-3xl p-6 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-4 text-[#d4e157]">
                       <Eye size={16} />
                       <span className="text-[10px] uppercase font-bold tracking-widest">Aesthetic</span>
                    </div>
                    <p className="text-sm text-gray-300 capitalize">{brandData.aesthetic}</p>
                  </EditableSection>
                </div>
        
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-[#262626] rounded-3xl p-6 border border-gray-700/50">
                    <span className="text-gray-500 text-[10px] uppercase tracking-widest block mb-6 font-bold">Brand Colors</span>
                    <div className="flex justify-between items-center">
                      {brandData.colors?.map((hex) => (
                        <div key={hex} className="flex flex-col items-center gap-2 group/color cursor-pointer">
                          <div className="w-10 h-10 rounded-full border border-gray-700 shadow-inner group-hover/color:scale-110 transition-transform" style={{ backgroundColor: hex }}></div>
                          <span className="text-[8px] font-mono text-gray-500 uppercase">{hex}</span>
                        </div>
                      ))}
                      <div className="w-10 h-10 rounded-full border border-dashed border-gray-700 flex items-center justify-center text-gray-600 hover:text-[#d4e157] cursor-pointer">
                        <Plus size={14} />
                      </div>
                    </div>
                  </div>
        
                  <div className="bg-[#262626] rounded-3xl p-6 border border-gray-700/50">
                    <span className="text-gray-500 text-[10px] uppercase tracking-widest block mb-4 font-bold">Identified Fonts</span>
                    <div className="space-y-2">
                      {brandData.fonts?.map((f, i) => (
                        <div key={i} className="flex items-center justify-between group/font cursor-pointer">
                          <p className="text-sm font-medium text-white group-hover/font:text-[#d4e157] transition-colors">{f}</p>
                          <span className="text-[8px] bg-white/5 px-2 py-1 rounded text-gray-500">Font {i+1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
        
              <div className="lg:col-span-4 bg-[#262626] rounded-[2rem] p-6 border border-gray-700/50 flex flex-col h-full relative">
                <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-6">Asset Discovery</span>
                <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                  {images.map((img) => (
                    <div key={img.id} className="aspect-square rounded-2xl overflow-hidden group relative border border-white/5">
                      <img src={img.url} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" alt="" />
                      <button onClick={() => removeImage(img.id)} className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80">
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  ))}
                  <div className="aspect-square rounded-2xl border border-dashed border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-[#d4e157] hover:text-[#d4e157] transition-all cursor-pointer">
                    <Plus size={20} />
                    <span className="text-[10px]">Add Asset</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        
          <style dangerouslySetInnerHTML={{ __html: `
            @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
            .font-serif { font-family: 'Instrument Serif', serif; }
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
          `}} />
        </div>
      );
    }
    return null;
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-[2000] overflow-y-auto">
        {mainContent()}
    </div>
  )
};
    
export default BrandDna;
