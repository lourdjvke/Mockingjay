import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { ref, set, get, push } from 'firebase/database';
import { auth, googleProvider, db } from './firebase.ts';
import { generateId, MediaStore, FontStore } from './utils.ts';
import { loadLocalFonts } from './services/fontService.ts';
import { INITIAL_STATE, FONTS, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.ts';
import { BusinessDNA, Campaign, EditorState, DesignElement, Page } from './types.ts';

import { Home } from './pages/Home.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { BusinessDNAInput } from './pages/BusinessDNAInput.tsx';
import BusinessDNADetail from './pages/BusinessDNADetail.tsx';
import { CampaignIdeasInput } from './pages/CampaignIdeasInput.tsx';
import Sidebar from './components/Sidebar.tsx';
import ElementRenderer from './components/ElementRenderer.tsx';
import { Icons } from './components/IconLibrary.tsx';

type AppPage = 'home' | 'dashboard' | 'business-dna' | 'dna-detail' | 'campaign-ideas' | 'editor';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<AppPage>('home');
  const [pageData, setPageData] = useState<any>(null);

  const [editorState, setEditorState] = useState<EditorState>(INITIAL_STATE);
  const [availableFonts, setAvailableFonts] = useState(FONTS);
  const [recentImages, setRecentImages] = useState<string[]>([]);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        setCurrentPage('dashboard');
      } else {
        setCurrentPage('home');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    MediaStore.getImages().then(setRecentImages);
    loadLocalFonts().then(localFonts => {
      if (localFonts.length > 0) {
        setAvailableFonts(localFonts);
      }
    });
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const signOutUser = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentPage('home');
      setEditorState(INITIAL_STATE);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const navigate = (page: AppPage, data?: any) => {
    setCurrentPage(page);
    setPageData(data);
    if (page === 'editor' && data) {
      setEditorState(data.designs);
      setCurrentCampaignId(data.id);
    }
  };

  const saveDNA = async (dna: Partial<BusinessDNA>) => {
    if (!user) return;

    const dnaRef = push(ref(db, `users/${user.uid}/dnas`));
    const completeDNA: BusinessDNA = {
      id: dnaRef.key!,
      userId: user.uid,
      brandName: dna.brandName || 'Unnamed Brand',
      websiteUrl: dna.websiteUrl || '',
      screenshotUrl: dna.screenshotUrl,
      brandColors: dna.brandColors || [],
      topFonts: dna.topFonts || [],
      brandValues: dna.brandValues || [],
      brandToneOfVoice: dna.brandToneOfVoice || '',
      brandAesthetic: dna.brandAesthetic || '',
      businessOverview: dna.businessOverview || '',
      noticeableColors: dna.noticeableColors || [],
      logoUrl: dna.logoUrl,
      images: dna.images || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await set(dnaRef, completeDNA);
    navigate('dna-detail', completeDNA);
  };

  const updateDNA = async (dnaId: string, updates: Partial<BusinessDNA>) => {
    if (!user) return;

    const dnaRef = ref(db, `users/${user.uid}/dnas/${dnaId}`);
    const snapshot = await get(dnaRef);
    if (snapshot.exists()) {
      const updatedDNA = { ...snapshot.val(), ...updates, updatedAt: Date.now() };
      await set(dnaRef, updatedDNA);
      setPageData(updatedDNA);
    }
  };

  const saveCampaign = async (campaign: Partial<Campaign>) => {
    if (!user) return;

    const campaignRef = push(ref(db, `users/${user.uid}/campaigns`));
    const completeCampaign: Campaign = {
      id: campaignRef.key!,
      userId: user.uid,
      name: campaign.name || 'Unnamed Campaign',
      dnaId: campaign.dnaId,
      pageCount: campaign.pageCount || 1,
      prompt: campaign.prompt || '',
      designs: campaign.designs || INITIAL_STATE,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await set(campaignRef, completeCampaign);
    navigate('editor', completeCampaign);
  };

  const updateCampaign = async () => {
    if (!user || !currentCampaignId) return;

    const campaignRef = ref(db, `users/${user.uid}/campaigns/${currentCampaignId}`);
    const snapshot = await get(campaignRef);
    if (snapshot.exists()) {
      const updatedCampaign = { ...snapshot.val(), designs: editorState, updatedAt: Date.now() };
      await set(campaignRef, updatedCampaign);
    }
  };

  useEffect(() => {
    if (currentCampaignId && user) {
      const debounce = setTimeout(() => {
        updateCampaign();
      }, 1000);
      return () => clearTimeout(debounce);
    }
  }, [editorState, currentCampaignId, user]);

  const selectedElement = editorState.pages[editorState.currentPageIndex]?.elements.find(
    el => el.id === editorState.selectedElementId
  ) || null;

  const updateElement = (id: string, updates: Partial<DesignElement>) => {
    setEditorState(prev => ({
      ...prev,
      pages: prev.pages.map((page, idx) =>
        idx === prev.currentPageIndex
          ? {
              ...page,
              elements: page.elements.map(el =>
                el.id === id ? { ...el, ...updates, style: { ...el.style, ...(updates.style || {}) } } : el
              )
            }
          : page
      )
    }));
  };

  const updatePage = (updates: Partial<Page>) => {
    setEditorState(prev => ({
      ...prev,
      pages: prev.pages.map((page, idx) =>
        idx === prev.currentPageIndex ? { ...page, ...updates } : page
      )
    }));
  };

  const addElement = (element: Omit<DesignElement, 'id'>) => {
    const newElement: DesignElement = { ...element, id: generateId() };
    setEditorState(prev => ({
      ...prev,
      pages: prev.pages.map((page, idx) =>
        idx === prev.currentPageIndex
          ? { ...page, elements: [...page.elements, newElement] }
          : page
      ),
      selectedElementId: newElement.id
    }));
  };

  const addText = (type: 'Header' | 'Subheader' | 'Paragraph') => {
    const fontSize = type === 'Header' ? 48 : type === 'Subheader' ? 32 : 18;
    const fontWeight = type === 'Paragraph' ? '400' : '700';
    addElement({
      type: 'text',
      name: type,
      box: { x: 50, y: 100, width: 260, height: 60, rotation: 0 },
      content: `${type} text`,
      style: {
        color: '#FFFFFF',
        fontSize,
        fontFamily: "'Inter', sans-serif",
        fontWeight,
        textAlign: 'left',
        lineHeight: 1.2
      },
      visible: true,
      locked: false
    });
  };

  const addShape = (shapeType: string) => {
    const clipPaths: Record<string, string> = {
      triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
      diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      pentagon: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
      hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
      star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
      parallelogram: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)'
    };

    addElement({
      type: 'shape',
      name: shapeType.charAt(0).toUpperCase() + shapeType.slice(1),
      box: { x: 100, y: 200, width: 160, height: 160, rotation: 0 },
      content: '',
      style: {
        backgroundColor: editorState.themeColors[0] || '#E85D3D',
        borderRadius: shapeType === 'circle' ? 9999 : shapeType === 'pill' ? 9999 : shapeType === 'square' ? 8 : 0,
        clipPath: clipPaths[shapeType] || undefined
      },
      visible: true,
      locked: false
    });
  };

  const addImage = async (src: string) => {
    await MediaStore.saveImage(src);
    const images = await MediaStore.getImages();
    setRecentImages(images.map(img => img.data));

    addElement({
      type: 'image',
      name: 'Image',
      box: { x: 50, y: 150, width: 260, height: 340, rotation: 0 },
      content: src,
      style: { borderRadius: 12 },
      visible: true,
      locked: false
    });
  };

  const onColorChange = (color: string) => {
    if (selectedElement) {
      if (selectedElement.type === 'text') {
        updateElement(selectedElement.id, { style: { ...selectedElement.style, color } });
      } else {
        updateElement(selectedElement.id, { style: { ...selectedElement.style, backgroundColor: color } });
      }
    } else {
      updatePage({ background: color });
    }
  };

  const onReorder = (id: string, direction: 'up' | 'down') => {
    setEditorState(prev => {
      const page = prev.pages[prev.currentPageIndex];
      const idx = page.elements.findIndex(el => el.id === id);
      if (idx === -1) return prev;

      const newElements = [...page.elements];
      const targetIdx = direction === 'up' ? idx + 1 : idx - 1;

      if (targetIdx < 0 || targetIdx >= newElements.length) return prev;

      [newElements[idx], newElements[targetIdx]] = [newElements[targetIdx], newElements[idx]];

      return {
        ...prev,
        pages: prev.pages.map((p, i) => i === prev.currentPageIndex ? { ...p, elements: newElements } : p)
      };
    });
  };

  const onAddCustomFont = async (name: string, data: ArrayBuffer) => {
    await FontStore.saveFont(name, data);
    const fontFace = new FontFace(name, `url(data:font/woff2;base64,${arrayBufferToBase64(data)})`);
    await fontFace.load();
    document.fonts.add(fontFace);

    setAvailableFonts(prev => [...prev, { name, value: `'${name}', sans-serif` }]);
  };

  const onDeleteCustomFont = async (name: string) => {
    await FontStore.deleteFont(name);
    setAvailableFonts(prev => prev.filter(f => f.name !== name));
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  if (loading) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-lime-400/20 border-t-lime-400 rounded-full animate-spin mx-auto" />
          <p className="text-white/60">Loading Pomelli...</p>
        </div>
      </div>
    );
  }

  if (!user && currentPage === 'home') {
    return (
      <div className="w-screen h-screen">
        <Home onNavigate={(page) => {
          if (page === 'dashboard') {
            signIn();
          } else {
            navigate(page);
          }
        }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-screen h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-lime-400/10 rounded-3xl flex items-center justify-center">
              <span className="text-5xl">🧪</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif italic">Welcome to Pomelli</h1>
          <p className="text-white/60 text-lg">Sign in to start creating amazing campaigns</p>
          <button
            onClick={signIn}
            className="w-full bg-lime-400 text-black py-4 rounded-xl font-bold text-lg hover:bg-lime-300 transition-all active:scale-95 shadow-[0_10px_40px_rgba(163,230,53,0.3)] flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (currentPage === 'dashboard') {
    return <Dashboard onNavigate={navigate} onSignOut={signOutUser} user={user} />;
  }

  if (currentPage === 'business-dna') {
    return <BusinessDNAInput onComplete={saveDNA} onBack={() => navigate('dashboard')} />;
  }

  if (currentPage === 'dna-detail' && pageData) {
    return (
      <BusinessDNADetail
        dna={pageData}
        onUpdate={(updates) => updateDNA(pageData.id, updates)}
        onBack={() => navigate('dashboard')}
      />
    );
  }

  if (currentPage === 'campaign-ideas') {
    return <CampaignIdeasInput onComplete={saveCampaign} onBack={() => navigate('dashboard')} user={user} />;
  }

  if (currentPage === 'editor') {
    return (
      <div className="w-screen h-screen flex flex-col md:flex-row bg-black text-white overflow-hidden">
        <div className="hidden md:flex w-[320px] border-r border-white/10 flex-col">
          <div className="p-5 border-b border-white/10">
            <button
              onClick={() => navigate('dashboard')}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <Icons.ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {editorState.pages.map((page, idx) => (
              <button
                key={page.id}
                onClick={() => setEditorState(prev => ({ ...prev, currentPageIndex: idx, selectedElementId: null }))}
                className={`w-full aspect-[9/16] rounded-xl border-2 transition-all ${
                  idx === editorState.currentPageIndex
                    ? 'border-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.3)]'
                    : 'border-white/10 hover:border-white/20'
                } overflow-hidden relative group`}
                style={{ backgroundColor: page.background }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-white/40 font-bold">Page {idx + 1}</span>
                </div>
                <div className="absolute top-2 right-2 bg-black/50 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                  {page.elements.length} elements
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center canvas-container p-4 md:p-8 overflow-auto">
          <div
            id="design-canvas"
            className="relative bg-white shadow-2xl"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          >
            <div
              className="absolute inset-0"
              style={{ backgroundColor: editorState.pages[editorState.currentPageIndex]?.background }}
              onClick={() => setEditorState(prev => ({ ...prev, selectedElementId: null }))}
            />
            {editorState.pages[editorState.currentPageIndex]?.elements.map(el => (
              <ElementRenderer
                key={el.id}
                element={el}
                isSelected={el.id === editorState.selectedElementId}
                onSelect={(id) => setEditorState(prev => ({ ...prev, selectedElementId: id }))}
                onAutoResize={(id, newHeight) => updateElement(id, { box: { ...el.box, height: newHeight } })}
              />
            ))}
          </div>
        </div>

        <div className="hidden md:block">
          <Sidebar
            selectedElement={selectedElement}
            themeColors={editorState.themeColors}
            pages={editorState.pages}
            currentPageIndex={editorState.currentPageIndex}
            availableFonts={availableFonts}
            recentImages={recentImages}
            updateElement={updateElement}
            updatePage={updatePage}
            onAddText={addText}
            onAddShape={addShape}
            onAddImage={addImage}
            onColorChange={onColorChange}
            onReorder={onReorder}
            onAddCustomFont={onAddCustomFont}
            onDeleteCustomFont={onDeleteCustomFont}
            onUpdateColors={(colors) => setEditorState(prev => ({ ...prev, themeColors: colors }))}
            onReplaceFonts={setAvailableFonts}
          />
        </div>
      </div>
    );
  }

  return null;
}

export default App;
