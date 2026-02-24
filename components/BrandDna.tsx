import React, { useState, useEffect, useRef } from 'react';
import { getDatabase, ref, push, onValue, remove, query, orderByChild, equalTo } from "firebase/database";
import { getAuth } from "firebase/auth";
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
  Trash2,
  ArrowRight,
  UploadCloud,
  ImageIcon
} from 'lucide-react';

const BrandDna = ({ onClose, onStartCampaign }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [brandData, setBrandData] = useState(null);
  const [images, setImages] = useState([]);
  const [history, setHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(null);

  // Campaign creation states
  const [isCampaignMode, setIsCampaignMode] = useState(false);
  const [campaignPrompt, setCampaignPrompt] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [campaignImages, setCampaignImages] = useState([]);
  const campaignFileInputRef = useRef(null);
      
  const db = getDatabase();
  const auth = getAuth();
  const user = auth.currentUser;
      
  useEffect(() => {
    if (!user) return;
    const brandRef = query(ref(db, 'brands'), orderByChild('userId'), equalTo(user.uid));
    onValue(brandRef, (snapshot) => {
      const data = snapshot.val();
      if(data){
        const [brandId] = Object.keys(data);
        const loadedBrand = { id: brandId, ...data[brandId] };
        setBrandData(loadedBrand);
        setHistory([loadedBrand]); // Simplified history to just the one brand
        openFromHistory(loadedBrand);
      }
    });
  }, [db, user]);
      
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
    if (!url || !user) return;
      
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
        userId: user.uid,
        url: url,
        screenshot: base64Image, 
        images: [{ id: Date.now(), url: base64Image, label: 'Website Capture' }],
        timestamp: Date.now()
      };
    
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
    setBrandData(null);
  };
    
  const removeImage = (id) => {
    setImages(images.filter(img => img.id !== id));
  };
  
  const AVAILABLE_TAGS = ["Social Media Post", "Website Banner", "Email Campaign", "Print Ad", "Digital Story"];

  const toggleTag = (tag) => {
    const isSelected = selectedTags.includes(tag);
    if (isSelected) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      if (selectedTags.length < 3) {
        setSelectedTags([...selectedTags, tag]);
      } else {
        alert("You can select up to 3 tags.");
      }
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
  };

  const handleCampaignImageUpload = (e) => {
      const files = Array.from(e.target.files);
      if (selectedTags.length === 0) {
          alert("Please select campaign type tags first. The number of tags determines the number of images you can upload.");
          return;
      }
      if (campaignImages.length + files.length > selectedTags.length) {
          alert(`You can only upload up to ${selectedTags.length} image(s) for ${selectedTags.length} page(s).`);
          return;
      }
      const newImages = files.map(file => ({
          id: Date.now() + Math.random(),
          file,
          preview: URL.createObjectURL(file)
      }));
      setCampaignImages(prev => [...prev, ...newImages]);
  };

  const removeCampaignImage = (id) => {
      setCampaignImages(prev => prev.filter(img => img.id !== id));
  };

  const handleCreateCampaign = async () => {
    if (!campaignPrompt.trim()) {
        alert("Please provide a prompt for your campaign.");
        return;
    }
    if (selectedTags.length === 0) {
        alert("Please select at least one campaign tag.");
        return;
    }
    
    const imagePromises = campaignImages.map(imageFile => fileToBase64(imageFile.file));
    const base64Images = await Promise.all(imagePromises);

    onStartCampaign(brandData, campaignPrompt, selectedTags, base64Images);
  };

  const handleFieldUpdate = (field, value) => {
    setBrandData(prev => ({...prev, [field]: value}));
    // Here you would also update Firebase
  };

  const EditableField = ({ value, field, label, type = 'text' }) => {
    if (isEditing === field) {
      return (
        <div className="w-full">
          <input 
            type={type}
            defaultValue={value}
            onBlur={(e) => { handleFieldUpdate(field, e.target.value); setIsEditing(null); }}
            autoFocus
            className="bg-white/10 border border-white/20 p-2 rounded-md w-full text-sm"
          />
        </div>
      );
    }
    return (
      <div onClick={() => setIsEditing(field)} className="group relative cursor-pointer w-full">
        {label && <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">{label}</span>}
        <p className="text-sm text-gray-800 leading-relaxed group-hover:bg-gray-100 p-2 rounded-md w-full">{value}</p>
        <Pencil size={12} className="absolute top-2 right-2 text-gray-400 opacity-0 group-hover:opacity-100" />
      </div>
    );
  };

  const EditableList = ({ value, field, label }) => {
    if (isEditing === field) {
        return (
            <div className="w-full">
                <textarea
                    defaultValue={value.join(', ')}
                    onBlur={(e) => { handleFieldUpdate(field, e.target.value.split(',').map(s => s.trim())); setIsEditing(null); }}
                    autoFocus
                    className="bg-white/10 border border-white/20 p-2 rounded-md w-full text-sm h-24"
                />
            </div>
        );
    }
    return (
        <div onClick={() => setIsEditing(field)} className="group relative cursor-pointer w-full">
            {label && <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-2">{label}</span>}
            <ul className="text-sm text-gray-800 space-y-1">
                {value.map((v, i) => <li key={i} className="p-1 rounded-md group-hover:bg-gray-100">• {v}</li>)}
            </ul>
            <Pencil size={12} className="absolute top-2 right-2 text-gray-400 opacity-0 group-hover:opacity-100" />
        </div>
    );
  };

  const mainContent = () => {
    if (!brandData && !loading) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-start p-4 pt-20 md:p-6 md:pt-24">
          <div className="max-w-xl w-full text-center">
             <div className="bg-lime-400 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 text-black shadow-2xl shadow-lime-500/20">
              <Beaker size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black italic text-gray-800 mb-4">Mock Lab</h1>
            <p className="text-gray-500 mb-8 leading-relaxed max-w-md mx-auto">Enter your website URL to instantly extract your brand identity and build your Business DNA.</p>
                
            <form onSubmit={handleProcessBrand} className="relative group mb-12">
              <div className="absolute inset-y-0 left-5 flex items-center text-gray-400 group-focus-within:text-lime-500 transition-colors">
                <Globe size={20} />
              </div>
              <input 
                type="text" 
                placeholder="https://yourbrand.com" 
                className="w-full bg-gray-100 border border-gray-200 rounded-2xl py-5 pl-14 pr-32 text-gray-800 focus:outline-none focus:border-lime-400 transition-all shadow-lg shadow-gray-200/50"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button 
                type="submit"
                className="absolute right-2 top-2 bottom-2 bg-lime-400 text-black px-6 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
              >
                Analyze
              </button>
            </form>
            {history.length > 0 && (
              <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-2 mx-auto">
                <ArrowLeft size={16} /> Return to Editor
              </button>
            )}
          </div>
        </div>
      );
    }
      
    if (loading) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-lime-400 blur-3xl opacity-30 animate-pulse"></div>
              <Loader2 size={64} className="text-lime-500 animate-spin relative z-10" />
            </div>
            <p className="text-gray-800 font-bold italic text-2xl mb-2">{status || "Processing..."}</p>
            <p className="text-lime-600 text-sm animate-pulse tracking-widest uppercase">Consulting with AI</p>
          </div>
        </div>
      );
    }
      
    if (brandData) {
        if (isCampaignMode) {
            return (
                <div className="min-h-screen bg-white text-gray-800 font-sans p-4 md:p-8 flex flex-col">
                  <input type="file" ref={campaignFileInputRef} onChange={handleCampaignImageUpload} multiple accept="image/*" className="hidden" />
                  <header className="flex justify-between items-center mb-10 flex-shrink-0">
                    <button onClick={() => setIsCampaignMode(false)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors">
                        <ArrowLeft size={18} />
                        Back to Brand DNA
                    </button>
                    <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-1 rounded-lg">
                        <Megaphone size={16} className="text-lime-500"/>
                        <span className="text-sm font-bold text-gray-800">New Campaign</span>
                    </div>
                  </header>
    
                  <main className="flex-grow max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2">
                      <div className="space-y-8">
                          <div>
                              <label className="text-lg font-bold text-gray-800 mb-3 block">1. What's the campaign about?</label>
                              <textarea
                                  value={campaignPrompt}
                                  onChange={(e) => setCampaignPrompt(e.target.value)}
                                  placeholder="e.g., 'A summer sale for our new line of eco-friendly sneakers. Emphasize sustainability and adventure.'"
                                  className="w-full bg-gray-100 border border-gray-200 rounded-xl py-4 px-5 text-gray-800 focus:outline-none focus:border-lime-400 transition-all"
                                  rows="3"
                              ></textarea>
                          </div>
    
                          <div>
                              <label className="text-lg font-bold text-gray-800 mb-3 block">2. Select Campaign Type (up to 3)</label>
                              <div className="flex flex-wrap gap-3">
                                  {AVAILABLE_TAGS.map(tag => (
                                      <button
                                          key={tag}
                                          onClick={() => toggleTag(tag)}
                                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${selectedTags.includes(tag) ? 'bg-lime-400 text-black border-lime-500' : 'bg-transparent border-gray-200 hover:border-gray-400'}`}
                                      >
                                          {tag}
                                      </button>
                                  ))}
                              </div>
                              <p className="text-xs text-gray-500 mt-2">This determines the number of pages/variations to be generated.</p>
                          </div>
    
                          <div>
                              <label className="text-lg font-bold text-gray-800 mb-3 block">3. Attach Images (Optional)</label>
                              <div className={`grid gap-3 ${campaignImages.length > 0 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
                                  {campaignImages.map(image => (
                                      <div key={image.id} className="aspect-square rounded-lg overflow-hidden group relative border border-gray-200">
                                          <img src={image.preview} alt="Campaign upload preview" className="w-full h-full object-cover" />
                                          <button onClick={() => removeCampaignImage(image.id)} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all">
                                              <X size={14}/>
                                          </button>
                                      </div>
                                  ))}
                                  {selectedTags.length > 0 && campaignImages.length < selectedTags.length && (
                                     <div
                                        onClick={() => campaignFileInputRef.current?.click()}
                                        className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-lime-500 hover:text-lime-500 cursor-pointer transition-all"
                                    >
                                        <UploadCloud size={32} />
                                        <span className="text-sm mt-2 font-medium">Upload Image</span>
                                        <span className="text-xs mt-1">({campaignImages.length}/{selectedTags.length})</span>
                                    </div>
                                  )}
                              </div>
                               {selectedTags.length === 0 && <p className="text-sm text-gray-500 italic mt-2">Please select a campaign type to enable image uploads.</p>}
                          </div>
                      </div>
                  </main>
    
                  <footer className="mt-10 text-center flex-shrink-0">
                      <button
                          onClick={handleCreateCampaign}
                          className="bg-lime-400 text-black font-bold text-lg px-10 py-3 rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-lime-500/20 flex items-center gap-3 mx-auto"
                      >
                          <Sparkles size={20} />
                          Create Campaign
                      </button>
                  </footer>
                  <style dangerouslySetInnerHTML={{ __html: `
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
                  `}} />
                </div>
            );
        }
      return (
        <>
            <div className="min-h-screen bg-white text-gray-800 font-sans p-4 sm:p-6 md:p-8">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <button onClick={onClose} className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-200 transition-colors">
                    <ArrowLeft size={16} />
                    Return to Editor
                </button>
                <div className="w-10 h-10 rounded-full border-2 border-lime-400 overflow-hidden bg-gray-200 self-end">
                    <img src={user?.photoURL} alt="User" />
                </div>
              </header>
            
              <main className="max-w-5xl mx-auto">
                <div className="text-center mb-10">
                  <div className="inline-block bg-lime-400/20 p-3 rounded-2xl mb-4">
                    <Dna size={32} className="text-lime-600" />
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black italic mb-3 text-gray-800">The DNA of {brandData.businessName}</h1>
                  <p className="text-gray-500 max-w-xl mx-auto text-sm md:text-base">
                    Generated from <a href={brandData.url} target="_blank" className="text-lime-600 font-medium">{brandData.url}</a>. Review and refine your brand identity below.
                  </p>
                </div>
            
                <div className="bg-white rounded-2xl md:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-gray-200/80 shadow-2xl shadow-gray-300/30 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
                      
                  <div className="lg:col-span-8 space-y-4 md:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200/80 flex flex-col justify-between">
                        <EditableField value={brandData.businessName} field="businessName" label="Business Name" />
                        <EditableField value={brandData.overview} field="overview" label="Overview" />
                      </div>
            
                      <div className="bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200/80 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors h-full min-h-[150px]">
                        <Plus size={24} className="text-lime-500" />
                        <span className="text-lime-600 font-bold text-sm">Upload Logo</span>
                      </div>
                    </div>
            
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                       <div className="bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200/80">
                         <EditableList value={brandData.values || []} field="values" label="Values" />
                       </div>
                       <div className="bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200/80">
                         <EditableField value={brandData.tone} field="tone" label="Tone" />
                       </div>
                       <div className="bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200/80">
                         <EditableField value={brandData.aesthetic} field="aesthetic" label="Aesthetic" />
                       </div>
                    </div>
            
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200/80">
                        <span className="text-gray-500 text-[10px] uppercase tracking-widest block mb-4 font-bold">Brand Colors</span>
                        <div className="flex flex-wrap gap-3 items-center">
                          {brandData.colors?.map((hex) => (
                            <div key={hex} className="flex flex-col items-center gap-2 group/color cursor-pointer">
                              <div className="w-8 h-8 rounded-full border border-gray-200 shadow-inner group-hover/color:scale-110 transition-transform" style={{ backgroundColor: hex }}></div>
                              <span className="text-[8px] font-mono text-gray-500 uppercase">{hex}</span>
                            </div>
                          ))}
                          <div className="w-8 h-8 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-lime-500 cursor-pointer">
                            <Plus size={14} />
                          </div>
                        </div>
                      </div>
            
                      <div className="bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200/80">
                         <EditableList value={brandData.fonts || []} field="fonts" label="Identified Fonts" />
                      </div>
                    </div>
                  </div>
            
                  <div className="lg:col-span-4 bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-200/80 flex flex-col h-full relative">
                    <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-4">Asset Discovery</span>
                    <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                      {images.map((img) => (
                        <div key={img.id} className="aspect-square rounded-lg overflow-hidden group relative border border-gray-200">
                          <img src={img.url} className="w-full h-full object-cover transition-all duration-500" alt="" />
                          <button onClick={() => removeImage(img.id)} className="absolute top-1 right-1 bg-black/50 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80">
                            <X size={12} className="text-white" />
                          </button>
                        </div>
                      ))}
                      <div className="aspect-square rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-lime-500 hover:text-lime-500 transition-all cursor-pointer">
                        <Plus size={20} />
                        <span className="text-[10px]">Add Asset</span>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </div>
            <button
                onClick={() => setIsCampaignMode(true)}
                className="fixed z-[2001] bottom-6 right-6 md:bottom-8 md:right-8 bg-lime-400 text-black px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-bold text-base md:text-lg hover:scale-105 active:scale-[0.98] transition-all shadow-2xl shadow-lime-500/30 flex items-center gap-3"
            >
                <Megaphone size={22} />
                Create Campaign
            </button>
        </>
      );
    }
    return null;
  }

  return (
    <div className="fixed inset-0 bg-white z-[2000] overflow-y-auto">
        {mainContent()}
        <style dangerouslySetInnerHTML={{ __html: `
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
        `}} />
    </div>
  )
};
    
export default BrandDna; 
