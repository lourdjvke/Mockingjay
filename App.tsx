import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { EditorState, DesignElement, BoundingBox, Page, ElementStyle, HistoryEntry } from './types.ts';
import { INITIAL_STATE, CANVAS_WIDTH, CANVAS_HEIGHT, FONTS as BASE_FONTS } from './constants.ts';
import { generateId, downloadTemplate, FontStore, MediaStore, sanitizeAiJson, embedGoogleFonts } from './utils.ts';
import Sidebar from './components/Sidebar.tsx';
import ElementRenderer from './components/ElementRenderer.tsx';
import { Icons } from './components/IconLibrary.tsx';
import BrandDna from './components/BrandDna.tsx';
import { domToPng } from 'modern-screenshot';
import { auth, database, provider, signInWithPopup, onAuthStateChanged, ref, set, onValue, get, child, remove, runTransaction } from './firebase.ts';
import type { User } from 'firebase/auth';
import { useDebouncedCallback } from 'use-debounce';
import QuickTools from './components/QuickTools.tsx';
import Share from './components/Share.tsx';
import { motion, AnimatePresence } from 'framer-motion';


interface SnapLine {
  type: 'vertical' | 'horizontal';
  position: number;
}

type ExportStatus = 'idle' | 'processing' | 'success' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved';

const PricingModal = ({ show, onClose, onSelectPlan }) => {
  if (!show) return null;

  const plans = [
    { amount: 500, tokens: 500, name: "Starter" },
    { amount: 1000, tokens: 1200, name: "Pro" },
    { amount: 3500, tokens: 4000, name: "Ultimate" },
  ];

  return (
    <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4" onClick={onClose}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="bg-zinc-900 border border-white/10 rounded-[24px] w-full max-w-md overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white italic tracking-tight uppercase">Get More Tokens</h2>
            <p className="text-white/40 text-sm">You need at least 150 tokens to generate a design.</p>
          </div>
          <div className="grid gap-4">
            {plans.map((plan) => (
              <div key={plan.name} onClick={() => onSelectPlan(plan.amount)} className="relative group bg-zinc-800 p-5 rounded-2xl text-white font-bold border border-white/5 transition-all hover:bg-zinc-700 active:scale-95 cursor-pointer overflow-hidden">
                <div className="shimmer-overlay" />
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="text-lg">{plan.name}</div>
                    <div className="text-[10px] font-bold opacity-60 italic uppercase tracking-widest">{plan.tokens} Tokens</div>
                  </div>
                  <div className="text-2xl font-black">₦{plan.amount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="w-full py-5 text-white/30 text-xs font-bold uppercase tracking-widest border-t border-white/5 hover:text-white transition-colors">Cancel</button>
      </motion.div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<EditorState>(INITIAL_STATE);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyPointer, setHistoryPointer] = useState(-1);
  const [dragStart, setDragStart] = useState<{ x: number, y: number, type: 'move' | 'resize' | 'rotate' | 'swipe', handle?: string, initialAngle?: number } | null>(null);
  const [elementStartPos, setElementStartPos] = useState<BoundingBox | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [userFonts, setUserFonts] = useState<{ name: string; value: string }[]>([]);
  const [recentImages, setRecentImages] = useState<string[]>([]);
  const [aiAttachedImages, setAiAttachedImages] = useState<string[]>([]);
  const [useImageAsReference, setUseImageAsReference] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isBrandDnaOpen, setIsBrandDnaOpen] = useState(false);
  const [brandData, setBrandData] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showStar, setShowStar] = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);

  // Firebase and Design-related state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [designs, setDesigns] = useState<any[]>([]);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [userTokens, setUserTokens] = useState(0);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiImageInputRef = useRef<HTMLInputElement>(null);
  const topToolbarRef = useRef<HTMLDivElement>(null);
  const quickToolsRef = useRef<HTMLDivElement>(null);
  const mobileSidebarRef = useRef<HTMLDivElement>(null);

  const allFonts = [...userFonts, ...BASE_FONTS];

  const triggerStarAnimation = () => {
    setShowStar(true);
    setTimeout(() => setShowStar(false), 1600); // Animation duration
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const payWithPaystack = (amountToPay) => {
    if (!(window as any).PaystackPop) {
      alert("Paystack SDK not loaded yet. Please wait.");
      return;
    }
    if (!user) {
      alert("You must be logged in to make a purchase.");
      return;
    }

    setPaymentLoading(true);

    const handler = (window as any).PaystackPop.setup({
      key: "pk_live_8bfda55664a1327e5d47c4acc6767c123514b826", // Replace with your public key
      email: user.email,
      amount: amountToPay * 100, // Amount in Kobo
      currency: "NGN",
      ref: `ref_${Math.floor(Math.random() * 1000000000 + 1)}`,
      callback: (response) => {
        const tokenMap = {
          500: 500,
          1000: 1200,
          3500: 4000
        };
        const tokensToAdd = tokenMap[amountToPay];
        const userCreditRef = ref(database, `users/${user.uid}/ugcredit`);
        runTransaction(userCreditRef, (currentTokens) => {
          return (currentTokens || 0) + tokensToAdd;
        });
        setPaymentLoading(false);
        setShowPricingModal(false);
      },
      onClose: () => {
        setPaymentLoading(false);
      },
    });

    handler.openIframe();
  };

  const updateHistory = useCallback((newState: EditorState) => {
      const newEntry = { pages: newState.pages, selectedElementId: newState.selectedElementId };
      const newHistory = history.slice(0, historyPointer + 1);
      newHistory.push(newEntry);
      setHistory(newHistory);
      setHistoryPointer(newHistory.length - 1);
  }, [history, historyPointer]);

  const debouncedSave = useDebouncedCallback(async (designState: EditorState, designId: string) => {
    if (!user || !canvasRef.current) return;

    setSaveStatus('saving');

    try {
        const thumbnail = await domToPng(canvasRef.current, {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            scale: 0.2,
        });

        const designData = {
            ...designState,
            lastModified: Date.now(),
            thumbnail,
        };

        const dbRef = ref(database, `users/${user.uid}/designs/${designId}`);
        await set(dbRef, designData);

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);

    } catch (error) {
        console.error("Failed to save design or generate thumbnail:", error);
        setSaveStatus('idle');
    }
  }, 3000);

  useEffect(() => {
    if (user && currentDesignId && !isAuthLoading && state !== INITIAL_STATE) {
      debouncedSave(state, currentDesignId);
    }
  }, [state, user, currentDesignId, isAuthLoading, debouncedSave]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthLoading(false);
      if (!user) {
        setState(INITIAL_STATE);
        setCurrentDesignId(null);
        setDesigns([]);
        setUserTokens(0);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setDesigns([]);
      return;
    }
    const designsRef = ref(database, `users/${user.uid}/designs`);
    const unsubscribe = onValue(designsRef, (snapshot) => {
      const data = snapshot.val();
      const userDesigns = data
        ? Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .sort((a, b) => b.lastModified - a.lastModified)
        : [];
      setDesigns(userDesigns);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUserTokens(0);
      return;
    }
    const userCreditRef = ref(database, `users/${user.uid}/ugcredit`);
    const unsubscribe = onValue(userCreditRef, (snapshot) => {
      const tokens = snapshot.val() || 0;
      setUserTokens(tokens);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
        setBrandData(null);
        return;
    }
    const brandRef = ref(database, 'brands');
    const unsubscribe = onValue(brandRef, (snapshot) => {
        const data = snapshot.val();
        const [firstBrand] = data ? Object.values(data) : [];
        setBrandData(firstBrand || null);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (isAuthLoading || !user) return;

    if (currentDesignId) return;

    if (designs.length > 0) {
      loadDesign(designs[0].id);
    } else if (designs.length === 0) {
        createNewDesign();
    }
}, [user, designs, currentDesignId, isAuthLoading]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      alert("Could not sign in with Google. Please try again.");
    }
  };

  const createNewDesign = useCallback(() => {
    const newId = generateId();
    setState(INITIAL_STATE);
    setCurrentDesignId(newId);
    updateHistory(INITIAL_STATE);
  }, [updateHistory]);

  const deleteDesign = async (designId: string) => {
    if (!user) return;

    const confirmed = window.confirm("Are you sure you want to delete this design?");
    if (confirmed) {
        const designRef = ref(database, `users/${user.uid}/designs/${designId}`);
        await remove(designRef);

        if (currentDesignId === designId) {
            setCurrentDesignId(null);
            createNewDesign();
        }
    }
};

  const loadDesign = useCallback((designId: string) => {
    const designToLoad = designs.find(d => d.id === designId);
    if (designToLoad) {
      const sanitizedPages = (designToLoad.pages || INITIAL_STATE.pages).map((page: Page) => ({
        ...page,
        width: page.width || CANVAS_WIDTH,
        height: page.height || CANVAS_HEIGHT,
        elements: page.elements || [],
      }));

      const newState = {
        pages: sanitizedPages,
        currentPageIndex: designToLoad.currentPageIndex || 0,
        selectedElementId: null, // Always deselect on load
        themeColors: designToLoad.themeColors || INITIAL_STATE.themeColors,
        isAiCreated: designToLoad.isAiCreated || false,
        aiPrompt: designToLoad.aiPrompt || '',
      };
      setState(newState);
      setCurrentDesignId(designId);
      updateHistory(newState);
    }
  }, [designs, updateHistory]);

  const handleScanSuccess = async (decodedText: string) => {
    try {
        const pathParts = decodedText.split('/');
        if (pathParts.length !== 4 || pathParts[0] !== 'users' || pathParts[2] !== 'designs') {
            throw new Error("Invalid QR code format.");
        }

        const designRef = ref(database, decodedText);
        const snapshot = await get(designRef);

        if (!snapshot.exists()) {
            throw new Error("Design not found in database.");
        }

        const designData = snapshot.val();
        if (!designData) {
            throw new Error("Scanned design data is empty or invalid.");
        }

        let finalPages = (designData.pages || []).map((page: Page) => ({
            ...page,
            elements: (page.elements || []).map(el => sanitizeElement(el)),
        }));

        if (finalPages.length === 0) finalPages = INITIAL_STATE.pages;

        let finalPageIndex = designData.currentPageIndex || 0;
        if (finalPageIndex < 0 || finalPageIndex >= finalPages.length) finalPageIndex = 0;

        const newId = generateId();
        const newState = {
            pages: finalPages,
            currentPageIndex: finalPageIndex,
            selectedElementId: null,
            themeColors: designData.themeColors || INITIAL_STATE.themeColors,
        };
        setState(newState);
        setCurrentDesignId(newId);
        updateHistory(newState);

    } catch (error) {
        console.error("Failed to load shared design:", error);
        alert(`Failed to load design: ${(error as Error).message}`);
    }
  };

  const addPage = () => {
    setState(prev => {
      const newPage: Page = { id: generateId(), background: '#FFFFFF', width: CANVAS_WIDTH, height: CANVAS_HEIGHT, elements: [] };
      const newPages = [...prev.pages, newPage];
      const newState = {
        ...prev,
        pages: newPages,
        currentPageIndex: newPages.length - 1,
        selectedElementId: null
      };
      updateHistory(newState);
      return newState;
    });
  };

  const bufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const injectFontFace = (name: string, base64: string) => {
    const styleId = `font-face-${name.replace(/\s+/g, '-').toLowerCase()}`;
    document.getElementById(styleId)?.remove();
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `@font-face { font-family: '${name}'; src: url(data:font/ttf;base64,${base64}); font-weight: normal; font-style: normal; }`;
    document.head.appendChild(style);
  };

  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const storedFonts = await FontStore.getFonts();
        const loadedFonts: { name: string; value: string }[] = [];
        for (const font of storedFonts) {
          try {
            const base64 = bufferToBase64(font.data);
            injectFontFace(font.name, base64);
            const fontFace = new FontFace(font.name, data);
            await fontFace.load();
            document.fonts.add(fontFace);
            loadedFonts.push({ name: font.name, value: `'${font.name}', sans-serif` });
          } catch (e) { console.error(`Font init fail: ${font.name}`, e); }
        }
        setUserFonts(loadedFonts);
        const storedImages = await MediaStore.getImages();
        setRecentImages(storedImages.map(img => img.data));
      } catch (err) { console.error("IndexedDB loading failed:", err); }
    };
    loadStoredData();
  }, []);

  const handleAddCustomFont = useCallback(async (name: string, data: ArrayBuffer) => {
    try {
      await FontStore.saveFont(name, data);
      const base64 = bufferToBase64(data);
      injectFontFace(name, base64);
      
      const fontFace = new FontFace(name, data);
      await fontFace.load();
      document.fonts.add(fontFace);
      
      setUserFonts(prev => [...prev, { name, value: `'${name}', sans-serif` }]);
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);
    } catch (err) {
      console.error("Font save failed:", err);
    }
  }, []);

  const handleDeleteCustomFont = useCallback(async (name: string) => {
    try {
      await FontStore.deleteFont(name);
      const styleId = `font-face-${name.replace(/\s+/g, '-').toLowerCase()}`;
      document.getElementById(styleId)?.remove();
      setUserFonts(prev => prev.filter(f => f.name !== name));
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(5);
    } catch (err) {
      console.error("Font delete failed:", err);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
        if(window.innerWidth >= 768) setIsSidebarOpen(true);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsPwaInstalled(isStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useLayoutEffect(() => {
    if (isMobile) {
        setCanvasScale(0.85);
        return;
    }

    const calculateScale = () => {
        if (!workspaceRef.current) return;
        const { clientWidth, clientHeight } = workspaceRef.current;

        const verticalPadding = 120;
        const horizontalPadding = 120;

        const availableWidth = clientWidth - horizontalPadding;
        const availableHeight = clientHeight - verticalPadding;
        
        const scaleX = availableWidth / CANVAS_WIDTH;
        const scaleY = availableHeight / CANVAS_HEIGHT;
        
        setCanvasScale(Math.min(scaleX, scaleY, 1));
    };

    calculateScale();
    const resizeObserver = new ResizeObserver(calculateScale);
    if (workspaceRef.current) resizeObserver.observe(workspaceRef.current);

    return () => resizeObserver.disconnect();
}, [isMobile]);

  const currentPage = state.pages[state.currentPageIndex];
  const selectedElement = currentPage?.elements.find(e => e.id === state.selectedElementId) || null;

  const triggerHaptic = useCallback((intensity = 10) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(intensity);
    }
  }, []);

  const handlePwaInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsPwaInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleAiImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const toProcess = Array.from(files).slice(0, useImageAsReference ? 1 : 4 - aiAttachedImages.length);

    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          if (useImageAsReference) {
            setAiAttachedImages([dataUrl]);
          } else {
            setAiAttachedImages(prev => [...prev, dataUrl]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const fetchWithRetry = async (url: string, payload: any): Promise<any> => {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        return await response.json();
    }

    const errData = await response.json().catch(() => ({ error: `Request failed with status ${response.status}` }));
    throw new Error(errData.error || `Request failed with status ${response.status}`);
  };

  const sanitizeElement = useCallback((el: any): DesignElement => {
    const defaultStyle: ElementStyle = {
        color: '#000000',
        backgroundColor: 'transparent',
        fontSize: 24,
        fontFamily: "'Inter', sans-serif",
        fontWeight: '400',
        textAlign: 'left',
        letterSpacing: 0,
        lineHeight: 1.2,
        borderRadius: 0,
        opacity: 1,
        strokeColor: null,
        strokeWidth: 0,
        strokePattern: 'solid',
        clipPath: null,
        filter: null
    };

    const style = { ...defaultStyle, ...(el.style || {}) };

    style.opacity = typeof style.opacity === 'number' ? style.opacity : 1;
    style.borderRadius = typeof style.borderRadius === 'number' ? style.borderRadius : 0;
    style.strokeWidth = typeof style.strokeWidth === 'number' ? style.strokeWidth : 0;
    
    if (el.type === 'text') {
        style.fontSize = typeof style.fontSize === 'number' ? style.fontSize : 24;
        style.fontFamily = style.fontFamily || (allFonts.length > 0 ? allFonts[0].value : "'Inter', sans-serif");
        style.fontWeight = style.fontWeight || '400';
        style.textAlign = style.textAlign || 'left';
        style.letterSpacing = typeof style.letterSpacing === 'number' ? style.letterSpacing : 0;
        style.lineHeight = typeof style.lineHeight === 'number' ? style.lineHeight : 1.2;
        style.backgroundColor = 'transparent'; // Enforce transparent background
    } else if (el.type === 'image') {
        style.backgroundColor = 'transparent'; // Enforce transparent background
    } else {
        style.fontSize = null;
        style.fontFamily = null;
        style.fontWeight = null;
        style.textAlign = null;
        style.letterSpacing = null;
        style.lineHeight = null;
    }

     if (el.type !== 'text' && el.type !== 'icon') {
        style.color = null;
    }

    return {
      id: el.id || generateId(),
      name: el.name || 'AI Element',
      type: el.type || 'shape',
      box: {
        x: typeof el.box?.x === 'number' ? el.box.x : 50,
        y: typeof el.box?.y === 'number' ? el.box.y : 50,
        width: typeof el.box?.width === 'number' && el.box.width > 0 ? el.box.width : 200,
        height: typeof el.box?.height === 'number' && el.box.height > 0 ? el.box.height : 100,
        rotation: typeof el.box?.rotation === 'number' ? el.box.rotation : 0,
      },
      content: el.content === undefined ? '' : el.content,
      style,
      visible: typeof el.visible === 'boolean' ? el.visible : true,
      locked: typeof el.locked === 'boolean' ? el.locked : false,
    };
  }, [allFonts]);

  const handleGenerateCampaign = async (brandDna, prompt, tags, images) => {
    if (userTokens < 150) {
      setShowPricingModal(true);
      return;
    }
    
    setIsBrandDnaOpen(false);
    setIsAiLoading(true);
    triggerHaptic(30);

    try {
      const userCreditRef = ref(database, `users/${user.uid}/ugcredit`);
      await runTransaction(userCreditRef, (currentTokens) => {
        if (currentTokens < 150) {
          throw "Insufficient tokens";
        }
        return currentTokens - 150;
      });

      const apiUrl = '/api/ai';

      const systemInstruction = `You are "Mockingjay AI", a world-class Lead Designer specializing in brand campaigns.
Your task is to generate a complete, multi-page design campaign based on a brand's DNA.

**Brand DNA Context:**
- Business Name: ${brandDna.businessName}
- Overview: ${brandDna.overview}
- Values: ${brandDna.values.join(', ')}
- Tone: ${brandDna.tone}
- Aesthetic: ${brandDna.aesthetic}
- Colors: ${brandDna.colors.join(', ')}
- Fonts: ${brandDna.fonts.join(', ')}

**Campaign Details:**
- User Prompt: ${prompt}
- Campaign Tags (Page Themes): ${tags.join(', ')}

**Instructions:**
1.  Generate a complete design with exactly ${tags.length} pages.
2.  Each page's design should be inspired by one of the campaign tags: [${tags.join(', ')}] respectively.
3.  All design elements (colors, fonts, text, imagery) MUST strictly adhere to the provided Brand DNA.
4.  The returned \`themeColors\` array MUST be populated with the brand's colors: [${brandDna.colors.join(', ')}].

YOU MUST RETURN ONLY A RAW JSON OBJECT. No markdown, no code fences, no explanation text before or after the JSON.
Do NOT wrap in \`\`\`json code blocks. Return ONLY the raw JSON starting with { and ending with }.

CRITICAL RULES:
1. ALWAYS populate EVERY page with multiple elements (minimum 3-5 elements).
2. NEVER return an empty page.
3. Elements MUST have proper positioning, sizing, font families, colors, and spacing.
4. Match the Canvas dimensions: ${CANVAS_WIDTH}x${CANVAS_HEIGHT}.
5. Use reasonable borderRadius values (0-24px for rectangles, 999 for circles/pills). Do NOT use excessive values.
6. For optional style properties that are not applicable to an element, you MUST return them with a value of null.
7. For 'text' and 'image' elements, backgroundColor MUST ALWAYS be null.

**NEW: PRIORITIZE IMAGE-CENTRIC LAYOUTS & MINIMAL TEXT**
- **Layout 1 (Focus):** Full-screen image as the page background with minimal, high-contrast text overlaid.
- **Layout 2 (Classic):** Text block at top, large image in the center, and a call-to-action (CTA) button at the bottom.
- **Layout 3 (Dynamic):** Text block at the top, with a CTA and a smaller image placed at the bottom.
- **General:** Use shapes as subtle accents. Keep text very short and impactful.

AVAILABLE FONTS: ${allFonts.map(f => f.value).join(', ')}.

ELEMENT STRUCTURE - ALL FIELDS ARE REQUIRED FOR EACH ELEMENT:
{
  "id": "unique_id",
  "type": "text|shape|image|icon",
  "name": "descriptive name",
  "box": { "x": number, "y": number, "width": number, "height": number, "rotation": 0 },
  "content": "text content or SVG path or image URL",
  "style": { "color": "#hex or null", "backgroundColor": "#hex or null", "fontSize": "number or null", "fontFamily": "font or null", "fontWeight": "string or null", "textAlign": "string or null", "letterSpacing": "number or null", "lineHeight": "number or null", "borderRadius": "number or null", "opacity": 1, "strokeColor": "#hex or null", "strokeWidth": "number or null", "strokePattern": "string or null", "clipPath": "string or null", "filter": "css filter value or null" },
  "visible": true,
  "locked": false
}

RESPONSE FORMAT:
{
  "pages": [ { "id": "page_1", "background": "#colorhex or image_url", "elements": [ { ... } ] } ],
  "currentPageIndex": 0,
  "selectedElementId": null,
  "themeColors": ["${brandDna.colors.join('", "')}"]
}

${images.length > 0 ? `
USER HAS ATTACHED ${images.length} IMAGE(S). You MUST include them in the design as image elements using placeholders like "ATTACHED_IMAGE_0".
` : ''}
`;

      const userMessages = [
        {
          role: "user",
          content: [ { type: "text", text: systemInstruction } ]
        }
      ];

      if (images && images.length > 0) {
        images.forEach((image, index) => {
            userMessages[0].content.push({
                type: "image_url",
                image_url: { url: image }
            });
        });
      }

      const payload = {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: userMessages,
        temperature: 0.1,
        max_tokens: 8192,
      };

      const result = await fetchWithRetry(apiUrl, payload);

      if (!result) {
        throw new Error("Received an empty response from the AI service.");
      }

      const textResponse = result.choices?.[0]?.message?.content;

      if (!textResponse) {
        console.error("Invalid AI Response:", result);
        throw new Error("No response content from API. The AI may be experiencing issues.");
      }

      let aiResponse;
      try {
        const cleanedJson = sanitizeAiJson(textResponse);
        aiResponse = JSON.parse(cleanedJson);
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr, "Raw response:", textResponse);
        throw new Error("Failed to parse AI response as JSON");
      }

      if (!aiResponse.pages || !Array.isArray(aiResponse.pages) || aiResponse.pages.length === 0) {
        console.error("Invalid response structure:", aiResponse);
        throw new Error("AI response missing or empty pages array");
      }

      const sanitizedPages = aiResponse.pages.map((page: any) => ({
        id: page.id || generateId(),
        background: page.background || '#18181b',
        elements: (page.elements || []).map(el => sanitizeElement(el)),
      }));

      if (images.length > 0) {
        for (const page of sanitizedPages) {
          if (page.elements) {
            page.elements = page.elements.map((el: any) => {
              if (typeof el.content === 'string' && el.content.startsWith('ATTACHED_IMAGE_')) {
                const idx = parseInt(el.content.replace('ATTACHED_IMAGE_', ''), 10);
                if (!isNaN(idx) && idx < images.length) {
                  return { ...el, content: images[idx], type: 'image' };
                }
              }
              return el;
            });
          }
        }
      }
      
      const newState: EditorState = {
        pages: sanitizedPages,
        currentPageIndex: 0,
        selectedElementId: null,
        themeColors: aiResponse.themeColors && aiResponse.themeColors.length > 0 ? aiResponse.themeColors : brandDna.colors,
        isAiCreated: true,
        aiPrompt: prompt,
      };

      setState(newState);
      const newId = generateId();
      setCurrentDesignId(newId);
      updateHistory(newState);
      triggerHaptic(50);

    } catch (err: any) {
      console.error("Campaign Generation Fail:", err);
      alert(`AI Error: ${err?.message || "Unknown error"}. Please try again.`);
    } finally {
      setIsAiLoading(false);
      triggerStarAnimation();
    }
  };

  const handleAiRefine = async () => {
    if (!aiPrompt.trim() && aiAttachedImages.length === 0) return;
    if (userTokens < 150) {
      setShowPricingModal(true);
      return;
    }

    setIsAiLoading(true);
    triggerHaptic(30);

    try {
      const userCreditRef = ref(database, `users/${user.uid}/ugcredit`);
      await runTransaction(userCreditRef, (currentTokens) => {
        if (currentTokens < 150) {
          throw "Insufficient tokens";
        }
        return currentTokens - 150;
      });

      const apiUrl = '/api/ai';

      const base64Map: { [key: string]: string } = {};
      let placeholderIndex = 0;
      const cleansedState = JSON.parse(JSON.stringify(state));

      if (cleansedState.pages && Array.isArray(cleansedState.pages)) {
        cleansedState.pages.forEach((page: Page) => {
            if (page.background && typeof page.background === 'string' && page.background.startsWith('data:image')) {
                const placeholder = `__BASE64_PLACEHOLDER_${placeholderIndex++}__`;
                base64Map[placeholder] = page.background;
                page.background = placeholder;
            }
            if (page.elements && Array.isArray(page.elements)) {
                page.elements.forEach((element: DesignElement) => {
                    if (element.type === 'image' && element.content && typeof element.content === 'string' && element.content.startsWith('data:image')) {
                        const placeholder = `__BASE64_PLACEHOLDER_${placeholderIndex++}__`;
                        base64Map[placeholder] = element.content;
                        element.content = placeholder;
                    }
                });
            }
        });
      }

      let systemInstruction;

      if (useImageAsReference) {
        systemInstruction = `You are an expert UI/UX designer with a powerful vision model. Your task is to meticulously replicate an attached reference image within the Mockingjay editor. Your goal is to create a template that is as close to a pixel-perfect copy as possible using only the available tools (text, shape, icon). You are performing a high-fidelity 'image-to-template' conversion.

**CRITICAL INSTRUCTIONS:**
1. **Exact Replication is Key:** Analyze the attached image with extreme precision. Replicate the layout, dimensions, colors, typography, and spacing of every single element.
2. **Use Vision, Don't Hallucinate:** Your response must be based *only* on the visual information in the image. Do not add any new elements or content that is not present in the reference.
3. **Tool Conversion:** Convert visual elements into Mockingjay elements:
    - **Color Palette:** Use an eyedropper tool on the image to extract the exact hex codes for all colors (background, text, shapes) and use them in your output.
    - **Layout & Sizing:** Measure the position (x, y) and dimensions (width, height) of every element relative to the canvas size (${CANVAS_WIDTH}x${CANVAS_HEIGHT}) and replicate them precisely.
    - **Typography:** Identify the font family (e.g., serif, sans-serif), font weight, font size, and letter spacing. Match them as closely as possible using the available fonts.
    - **Shapes & Graphics:** Recreate all shapes, lines, and graphic elements using 'shape' elements with appropriate backgroundColor, borderRadius, clipPath, etc.
4. **DO NOT INCLUDE THE IMAGE:** The reference image must **NOT** be included in the final output. You are recreating it, not embedding it.
5. **Return Only JSON:** Your entire response must be ONLY the raw JSON object. No explanations, no markdown.`;
      } else {
        systemInstruction = `You are "Mockingjay AI", a world-class Lead Designer and UI/UX expert.
Your task is to transform user prompts into complete, high-fidelity design structures.
ALWAYS generate RICH content with multiple elements. Never generate empty or minimal designs.

YOU MUST RETURN ONLY A RAW JSON OBJECT. No markdown, no code fences, no explanation text before or after the JSON.
Do NOT wrap in \`\`\`json code blocks. Return ONLY the raw JSON starting with { and ending with }.

CRITICAL RULES:
1. ALWAYS populate the current page with multiple elements (minimum 3-5 elements)
2. NEVER return an empty page with only a background color
3. Elements MUST have proper positioning, sizing, font families, colors, and spacing
4. Apply the user's request (color theme, brand, style) throughout ALL elements
5. Match the Canvas dimensions: ${CANVAS_WIDTH}x${CANVAS_HEIGHT}
6. When user asks for additional pages, append new pages to the pages array. Every page MUST have elements.
7. Use reasonable borderRadius values (0-24px for rectangles, 999 for circles/pills). Do NOT use excessive values.
8. For optional style properties that are not applicable to an element, you MUST return them with a value of null.
9. For 'text' and 'image' elements, backgroundColor MUST ALWAYS be null.

**NEW: PRIORITIZE IMAGE-CENTRIC LAYOUTS & MINIMAL TEXT**
- **Layout 1 (Focus):** Full-screen image as the page background with minimal, high-contrast text overlaid.
- **Layout 2 (Classic):** Text block at top, large image in the center, and a call-to-action (CTA) button at the bottom.
- **Layout 3 (Dynamic):** Text block at the top, with a CTA and a smaller image placed at the bottom.
- **General:** Use shapes as subtle accents. Keep text very short and impactful.

AVAILABLE FONTS: ${allFonts.map(f => f.value).join(', ')}.

ELEMENT STRUCTURE - ALL FIELDS ARE REQUIRED FOR EACH ELEMENT:
{
  "id": "unique_id",
  "type": "text|shape|image|icon",
  "name": "descriptive name",
  "box": { "x": number, "y": number, "width": number, "height": number, "rotation": 0 },
  "content": "text content or SVG path or image URL",
  "style": { "color": "#hexcolor or null", "backgroundColor": "#hexcolor or null", "fontSize": "number (for text) or null", "fontFamily": "font name or null", "fontWeight": "string or null", "textAlign": "string or null", "letterSpacing": "number or null", "lineHeight": "number or null", "borderRadius": "number or null", "opacity": 1, "strokeColor": "#hexcolor or null", "strokeWidth": "number or null", "strokePattern": "'solid'|'dashed'|'dotted' or null", "clipPath": "CSS clip-path value or null", "filter": "css filter value or null" },
  "visible": true,
  "locked": false
}

RESPONSE FORMAT:
{
  "pages": [ { "id": "page_1", "background": "#colorhex or image_url", "elements": [ { ... } ] } ],
  "currentPageIndex": 0,
  "selectedElementId": null,
  "themeColors": ["#color1", "#color2", "#color3", "#color4"]
}

REMEMBER: Never generate empty pages. Always fill pages with rich, varied content.
The user's current design contains placeholders for images in the format __BASE64_PLACEHOLDER_X__. If you wish to retain an image in the updated design, you must use its corresponding placeholder in the 'content' for image elements or 'background' for pages.

${aiAttachedImages.length > 0 ? `

USER HAS ATTACHED ${aiAttachedImages.length} IMAGE(S). You MUST include them in the design as image elements.
For each attached image, create an image element with type "image" and set content to the placeholder:
- First image: "ATTACHED_IMAGE_0"
- Second image: "ATTACHED_IMAGE_1"
- Third image: "ATTACHED_IMAGE_2"
- Fourth image: "ATTACHED_IMAGE_3"
Position them prominently in the design with good sizing (at least 200x200).` : ''}`;
      }

      const userMessages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${systemInstruction}\n\nCurrent Editor State: ${JSON.stringify(cleansedState)}\n\nUser Request: ${aiPrompt}`
            }
          ]
        }
      ];

      if (aiAttachedImages.length > 0) {
        aiAttachedImages.forEach(image => {
          userMessages[0].content.push({
            type: "image_url",
            image_url: { url: image }
          });
        });
      }

      const payload = {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: userMessages,
        temperature: 0,
        max_tokens: 8192
      };

      const result = await fetchWithRetry(apiUrl, payload);
      
      if (!result) {
        throw new Error("Received an empty response from the AI service.");
      }

      const textResponse = result.choices?.[0]?.message?.content;

      if (!textResponse) {
        console.error("Invalid AI Response:", result);
        throw new Error("No response content from API. The AI may be experiencing issues.");
      }

      let aiState;
      try {
        const cleanedJson = sanitizeAiJson(textResponse);
        aiState = JSON.parse(cleanedJson);
        
        if (aiState.pages && Array.isArray(aiState.pages)) {
            aiState.pages.forEach((page: any) => {
                if (page.background && typeof page.background === 'string' && base64Map[page.background]) {
                    page.background = base64Map[page.background];
                }
                if (page.elements && Array.isArray(page.elements)) {
                    page.elements.forEach((element: any) => {
                        if (element.content && typeof element.content === 'string' && base64Map[element.content]) {
                            element.content = base64Map[element.content];
                        }
                    });
                }
            });
        }

      } catch (parseErr) {
        console.error("JSON parse error:", parseErr, "Raw response:", textResponse);
        throw new Error("Failed to parse AI response as JSON");
      }

      if (!aiState.pages || !Array.isArray(aiState.pages) || aiState.pages.length === 0) {
        console.error("Invalid response structure:", aiState);
        throw new Error("AI response missing pages array");
      }

      const sanitizedPages = aiState.pages.map((page: any) => ({
        id: page.id || generateId(),
        background: page.background || '#FFFFFF',
        elements: (page.elements || []).map(el => sanitizeElement(el)),
      }));

      const newState = {
        ...state,
        ...aiState,
        pages: sanitizedPages,
        currentPageIndex: aiState.currentPageIndex || 0,
        selectedElementId: aiState.selectedElementId || null,
        themeColors: aiState.themeColors || state.themeColors,
        isAiCreated: true,
        aiPrompt,
      };

      if (aiAttachedImages.length > 0 && !useImageAsReference) {
        for (const page of newState.pages) {
          if (page.elements) {
            page.elements = page.elements.map((el: any) => {
              if (typeof el.content === 'string' && el.content.startsWith('ATTACHED_IMAGE_')) {
                const idx = parseInt(el.content.replace('ATTACHED_IMAGE_', ''), 10);
                if (!isNaN(idx) && idx < aiAttachedImages.length) {
                  return { ...el, content: aiAttachedImages[idx], type: 'image' };
                }
              }
              return el;
            });
          }
        }
      }

      const pageAdded = newState.pages.length > state.pages.length;
      const targetPageIndex = pageAdded ? newState.pages.length - 1 : (newState.currentPageIndex || 0);

      const finalState = {
        ...newState,
        currentPageIndex: targetPageIndex
      };
      setState(finalState);
      updateHistory(finalState);
      setIsAiModalOpen(false);
      setAiPrompt("");
      setAiAttachedImages([]);
      triggerHaptic(50);
    } catch (err: any) {
      console.error("Design Engine Fail:", err, "Raw Response:", (err as any).textResponse);
      const errorMsg = err?.message || "Unknown error";
      alert(`AI Error: ${errorMsg}. Please try again with a more specific design prompt.`);
    } finally {
      setIsAiLoading(false);
      triggerStarAnimation();
    }
  };

  const deleteElement = (id: string) => {
    setState(prev => {
      const newPages = prev.pages.map((page, index) => 
        index === prev.currentPageIndex 
        ? { ...page, elements: page.elements.filter(el => el.id !== id) }
        : page
      );
      const newState = { ...prev, pages: newPages, selectedElementId: null };
      updateHistory(newState);
      return newState;
    });
  };

  const updateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    setState(prev => {
        const newPages = [...prev.pages];
        const page = newPages[prev.currentPageIndex];
        page.elements = page.elements.map(el => {
            if (el.id === id) {
                const newBox = updates.box ? { ...el.box, ...updates.box } : el.box;
                const newStyle = updates.style ? { ...el.style, ...updates.style } : el.style;
                return { ...el, ...updates, box: newBox, style: newStyle };
            }
            return el;
        });
        const newState = { ...prev, pages: newPages };
        // Do not update history on every minor update like auto-resizing
        // This will be handled by pointer up or explicit save actions
        return newState;
    });
  }, []);

  const updatePage = useCallback((updates: Partial<Page>) => {
    setState(prev => {
      const newPages = [...prev.pages];
      newPages[prev.currentPageIndex] = { ...newPages[prev.currentPageIndex], ...updates };
      const newState = { ...prev, pages: newPages };
      updateHistory(newState);
      return newState;
    });
  }, [updateHistory]);

  const handleElementPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    if (dragStart?.type === 'swipe') return;
    e.stopPropagation();
    const element = currentPage.elements.find(el => el.id === id);
    if (!element) return;

    setState(prev => {
        if(prev.selectedElementId !== id) triggerHaptic(5);
        return { ...prev, selectedElementId: id }
    });
    
    if (element.locked) return;

    setDragStart({ x: e.clientX, y: e.clientY, type: 'move' });
    setElementStartPos({ ...element.box });

  }, [currentPage, triggerHaptic, dragStart]);

  const handleResizePointerDown = useCallback((id: string, handle: string, e: React.PointerEvent) => {
      e.stopPropagation();
      const element = currentPage.elements.find(el => el.id === id);
      if (!element || element.locked) return;
      setDragStart({ x: e.clientX, y: e.clientY, type: 'resize', handle });
      setElementStartPos({ ...element.box });
  }, [currentPage]);

  const handleRotatePointerDown = useCallback((id: string, e: React.PointerEvent) => {
      e.stopPropagation();
      const element = currentPage.elements.find(el => el.id === id);
      if (!element || !canvasRef.current || element.locked) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const cX = rect.left + (element.box.x + element.box.width / 2) * canvasScale;
      const cY = rect.top + (element.box.y + element.box.height / 2) * canvasScale;
      const initialAngle = Math.atan2(e.clientY - cY, e.clientX - cX) * (180 / Math.PI);
      
      setDragStart({ x: e.clientX, y: e.clientY, type: 'rotate', initialAngle });
      setElementStartPos({ ...element.box });
  }, [currentPage, canvasScale]);


  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;

    if (state.selectedElementId) {
        setState(prev => ({ ...prev, selectedElementId: null }));
        updateHistory(state);
    } else if (isMobile && state.pages.length > 1 && !state.selectedElementId) {
        setDragStart({ x: e.clientX, y: e.clientY, type: 'swipe' });
    }
  };

  const addElement = useCallback((element: Partial<DesignElement>) => {
    const defaultFont = allFonts.length > 0 ? allFonts[0].value : "'Inter', sans-serif";
    const newElement: DesignElement = {
      id: generateId(),
      name: element.name || (element.type ? `${element.type.charAt(0).toUpperCase() + element.type.slice(1)}` : 'Element'),
      type: (element.type as any) || 'shape',
      box: { x: (CANVAS_WIDTH - 200) / 2, y: (CANVAS_HEIGHT - 200) / 2, width: 200, height: 50, rotation: 0, ...element.box },
      content: '',
      style: { backgroundColor: 'transparent', color: '#000000', borderRadius: 0, opacity: 1, strokeWidth: 0, strokePattern: 'solid', strokeColor: '#000000', letterSpacing: 0, lineHeight: 1.2, fontFamily: defaultFont, fontSize: 24, fontWeight: '400', textAlign: 'center', filter: 'none', ...element.style },
      visible: true,
      locked: false,
      ...element
    };
    setState(prev => {
      const newPages = [...prev.pages];
      newPages[prev.currentPageIndex].elements.push(newElement);
      const newState = { ...prev, pages: newPages, selectedElementId: newElement.id };
      updateHistory(newState);
      return newState;
    });
    if (element.type === 'image' && element.content) {
      MediaStore.saveImage(element.content).then(() => {
        MediaStore.getImages().then(imgs => setRecentImages(imgs.map(i => i.data)));
      });
    }
    triggerHaptic(15);
  }, [allFonts, triggerHaptic, updateHistory]);

  const onAddShape = useCallback((type: string) => {
    let clipPath = undefined;
    let borderRadius = 0;
    let width = 200;
    let height = 200;
    if (type === 'circle') borderRadius = 999;
    if (type === 'pill') { borderRadius = 999; height = 100; }
    if (type === 'triangle') clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
    if (type === 'diamond') clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    if (type === 'pentagon') clipPath = 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
    if (type === 'hexagon') clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    if (type === 'star') clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
    if (type === 'parallelogram') clipPath = 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)';

    addElement({
      type: 'shape',
      name: type.charAt(0).toUpperCase() + type.slice(1),
      style: { backgroundColor: state.themeColors[0] || '#CCCCCC', borderRadius, clipPath },
      box: { x: (CANVAS_WIDTH - width) / 2, y: (CANVAS_HEIGHT - height) / 2, width, height, rotation: 0 }
    });
  }, [addElement, state.themeColors]);

  const onAddText = useCallback((type: 'Header' | 'Subheader' | 'Paragraph') => {
    let fontSize = 24;
    let content = 'Paragraph';
    if(type === 'Header') {
        fontSize = 48;
        content = 'Header';
    } else if (type === 'Subheader') {
        fontSize = 32;
        content = 'Subheader';
    }
    addElement({
        type: 'text',
        name: type,
        content,
        style: { fontSize, color: '#000000', textAlign: 'center' },
        box: { width: 300, height: 60 }
    })
  }, [addElement]);

  const onAddImage = useCallback((src: string) => {
    addElement({
        type: 'image',
        name: 'Image',
        content: src,
        box: { width: 400, height: 300 },
        style: { borderRadius: 16 }
    });
  }, [addElement]);

  const onReorder = useCallback((id: string, direction: 'up' | 'down') => {
    setState(prev => {
      const newPages = [...prev.pages];
      const page = { ...newPages[prev.currentPageIndex] };
      const index = page.elements.findIndex(el => el.id === id);
      if (index === -1) return prev;

      const newElements = [...page.elements];
      const targetIndex = direction === 'up' ? index + 1 : index - 1;

      if (targetIndex >= 0 && targetIndex < newElements.length) {
        const temp = newElements[index];
        newElements[index] = newElements[targetIndex];
        newElements[targetIndex] = temp;
      }
      
      page.elements = newElements;
      newPages[prev.currentPageIndex] = page;
      const newState = { ...prev, pages: newPages };
      updateHistory(newState);
      return newState;
    });
    triggerHaptic(5);
  }, [triggerHaptic, updateHistory]);

  const onLayerReorder = useCallback((startIndex: number, endIndex: number) => {
    setState(prev => {
      const page = prev.pages[prev.currentPageIndex];
      const newElements = Array.from(page.elements);
      const [removed] = newElements.splice(startIndex, 1);
      newElements.splice(endIndex, 0, removed);

      const newPages = prev.pages.map((p, i) => 
        i === prev.currentPageIndex ? { ...p, elements: newElements } : p
      );
      
      const newState = { ...prev, pages: newPages };
      updateHistory(newState);
      return newState;
    });
  }, [updateHistory]);

  const handleApplyEffect = useCallback((effect: string) => {
      if (!selectedElement) return;
      let filterValue = 'none';
      switch (effect) {
          case 'grayscale': filterValue = 'grayscale(100%)'; break;
          case 'sepia': filterValue = 'sepia(100%)'; break;
          case 'invert': filterValue = 'invert(100%)'; break;
          case 'motion-blur': filterValue = 'blur(8px)'; break;
      }
      updateElement(selectedElement.id, { style: { ...selectedElement.style, filter: filterValue } });
  }, [selectedElement, updateElement]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragStart) return;

    const scale = canvasScale;
    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;

    if (dragStart.type === 'swipe' && isMobile && !selectedElement) {
        const swipeThreshold = 50;
        if (Math.abs(dx) > swipeThreshold) {
            setState(p => ({ ...p, currentPageIndex: Math.min(p.pages.length - 1, Math.max(0, p.currentPageIndex + (dx > 0 ? -1 : 1))) }));
            setDragStart(null);
        }
        return;
    }

    if (!elementStartPos || !state.selectedElementId) return;

    if (dragStart.type === 'move') {
      const newX = elementStartPos.x + dx;
      const newY = elementStartPos.y + dy;
      const centerX = CANVAS_WIDTH / 2 - elementStartPos.width / 2;
      const centerY = CANVAS_HEIGHT / 2 - elementStartPos.height / 2;
      const isSnappedX = Math.abs(newX - centerX) < 5;
      const isSnappedY = Math.abs(newY - centerY) < 5;
      const snappedX = isSnappedX ? centerX : newX;
      const snappedY = isSnappedY ? centerY : newY;
      const lines: SnapLine[] = [];
      if (isSnappedX) lines.push({ type: 'vertical', position: CANVAS_WIDTH / 2 });
      if (isSnappedY) lines.push({ type: 'horizontal', position: CANVAS_HEIGHT / 2 });
      setSnapLines(lines);
      updateElement(state.selectedElementId, { box: { ...elementStartPos, x: snappedX, y: snappedY } });
    } else if (dragStart.type === 'resize' && dragStart.handle) {
      const h = dragStart.handle;
      let { x, y, width, height } = elementStartPos;
      if (h.includes('e')) width += dx;
      if (h.includes('w')) { width -= dx; x += dx; }
      if (h.includes('s')) height += dy;
      if (h.includes('n')) { height -= dy; y += dy; }
      width = Math.max(20, width);
      height = Math.max(20, height);
      updateElement(state.selectedElementId, { box: { ...elementStartPos, x, y, width, height } });
    } else if (dragStart.type === 'rotate') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cX = rect.left + (elementStartPos.x + elementStartPos.width / 2) * scale;
      const cY = rect.top + (elementStartPos.y + elementStartPos.height / 2) * scale;
      const currentAngle = Math.atan2(e.clientY - cY, e.clientX - cX) * (180 / Math.PI);
      let rotation = elementStartPos.rotation + (currentAngle - (dragStart.initialAngle || 0));
      if (Math.abs(rotation % 45) < 5) rotation = Math.round(rotation / 45) * 45;
      updateElement(state.selectedElementId, { box: { ...elementStartPos, rotation } });
    }
  }, [dragStart, elementStartPos, state.selectedElementId, canvasScale, updateElement, isMobile, selectedElement]);

  const handlePointerUp = useCallback(() => {
    if (dragStart) {
        // If the action was a resize or move, update the history
        if (dragStart.type === 'move' || dragStart.type === 'resize' || dragStart.type === 'rotate') {
            updateHistory(state);
        }
        debouncedSave.flush();
    }
    setDragStart(null);
    setElementStartPos(null);
    setSnapLines([]);
}, [dragStart, debouncedSave, state, updateHistory]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const saveToPublicTemplates = async () => {
    if (!canvasRef.current || !currentDesignId) return;

    const publicTemplateRef = ref(database, `public_templates/${currentDesignId}`);
    const snapshot = await get(publicTemplateRef);

    if (snapshot.exists()) {
      console.log("Design already exists in public templates.");
      return;
    }

    try {
      const thumbnail = await domToPng(canvasRef.current, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        scale: 0.2,
      });

      const designData = {
        content: state,
        thumbnail,
        name: state.pages[0]?.elements.find(e => e.type === 'text')?.content || 'Untitled Design',
        lastModified: Date.now(),
        isAiCreated: state.isAiCreated || false,
        aiPrompt: state.aiPrompt || null,
      };

      await set(publicTemplateRef, designData);
      console.log("Design saved to public templates.");

    } catch (error) {
      console.error("Failed to save to public templates:", error);
    }
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    setExportStatus('processing');
    triggerHaptic(20);
    saveToPublicTemplates();

    const canvasNode = canvasRef.current;
    
    let fontStyleEl: HTMLStyleElement | null = null;
    try {
      const fontFamilies = [
        'Inter:wght@300;400;500;600;700', 'Playfair Display:ital,wght@0,400..900;1,400..900',
        'Montserrat:wght@400;700;900', 'Bangers', 'Lobster', 'Permanent Marker', 'Sacramento',
        'Press Start 2P', 'Monoton', 'Alfa Slab One', 'Cinzel Decorative:wght@400;700;900',
        'Faster One', 'Righteous', 'Fredoka One', 'Orbitron:wght@400;700;900', 'Special Elite',
        'Cookie', 'Satisfy', 'Kaushan Script', 'Pinyon Script', 'Rochester', 'Abril Fatface',
        'Comfortaa:wght@300;700', 'UnifrakturMaguntia', 'Creepster', 'Nosifer', 'Bungee Shade'
      ];
      const googleFontsUrl = `https://fonts.googleapis.com/css2?${fontFamilies.map(f => `family=${f.replace(/ /g, '+')}`).join('&')}&display=swap`;

      const inlineFontCss = await embedGoogleFonts(googleFontsUrl);
      if (inlineFontCss) {
        fontStyleEl = document.createElement('style');
        fontStyleEl.setAttribute('data-export-fonts', 'true');
        fontStyleEl.textContent = inlineFontCss;
        canvasNode.prepend(fontStyleEl);
      }

      const userFontStyles = document.querySelectorAll('style[id^="font-face-"]');
      let userFontCss = '';
      userFontStyles.forEach(el => { userFontCss += el.textContent + '\n'; });
      if (userFontCss && fontStyleEl) {
        fontStyleEl.textContent += '\n' + userFontCss;
      } else if (userFontCss && !fontStyleEl) {
        fontStyleEl = document.createElement('style');
        fontStyleEl.setAttribute('data-export-fonts', 'true');
        fontStyleEl.textContent = userFontCss;
        canvasNode.prepend(fontStyleEl);
      }

      const dataUrl = await domToPng(canvasNode, {
        scale: 3,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: currentPage.background.startsWith('#') ? currentPage.background : undefined,
      });
      const link = document.createElement('a');
      link.download = `mockingjay-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setExportStatus('success');
      triggerHaptic(40);
      setTimeout(() => setExportStatus('idle'), 3000);
      setIsExportModalOpen(false);
    } catch (err) {
      console.error("Export failed:", err);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 3000);
    } finally {
      if (fontStyleEl && fontStyleEl.parentNode) {
        fontStyleEl.parentNode.removeChild(fontStyleEl);
      }
    }
  };

  const handleExportJson = () => {
    downloadTemplate(state);
    saveToPublicTemplates();
    setIsExportModalOpen(false);
    triggerHaptic(15);
  };

  useEffect(() => {
    const openModal = () => setIsExportModalOpen(true);
    window.addEventListener('open-export-modal', openModal);
    return () => window.removeEventListener('open-export-modal', openModal);
  }, []);

  const motionProps = {
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  };

  return (
    <div className="flex h-screen w-full bg-gray-100 font-sans overflow-hidden select-none touch-none">
      <PricingModal 
        show={showPricingModal} 
        onClose={() => setShowPricingModal(false)}
        onSelectPlan={payWithPaystack} 
      />

      <Share 
        show={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        designId={currentDesignId}
        uid={user?.uid || null}
        onScanSuccess={handleScanSuccess}
      />

       <AnimatePresence>
       {!user && !isAuthLoading && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center gap-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black text-gray-800 italic tracking-tighter uppercase">Mockingjay</h1>
            <p className="text-gray-500">Your AI-powered design companion</p>
          </div>
          <button 
            onClick={handleGoogleSignIn} 
            className="bg-lime-400 text-black px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 hover:bg-lime-300 transition-all active:scale-95 shadow-lg shadow-lime-500/20"
          >
            Continue with Google
          </button>
        </motion.div>
      )}
      </AnimatePresence>
      
      <input type="file" ref={fileInputRef} className="hidden" accept="application/json" onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const importedState = JSON.parse(ev.target?.result as string);
                if (importedState.pages) {
                    const newId = generateId();
                    setState(importedState);
                    setCurrentDesignId(newId);
                    updateHistory(importedState);
                }
            } catch (er) {
                console.error("Failed to import design:", er);
                alert("Failed to import design. The file might be corrupted or in the wrong format.");
            }
            if (e.target) e.target.value = '';
        };
        reader.readAsText(file);
      }} />

      <AnimatePresence>
      {isAiLoading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-white/60 backdrop-blur-xl flex flex-col items-center justify-center gap-8">
             <div className="relative">
                <div className="w-32 h-32 border-2 border-lime-400/20 rounded-full animate-ping absolute inset-0"></div>
                <div className="w-32 h-32 border-4 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Icons.Wand2 className="w-10 h-10 text-lime-500 animate-pulse" />
                </div>
             </div>
             <div className="text-center space-y-2">
                <h2 className="text-lg md:text-2xl font-black italic uppercase tracking-tighter text-gray-800">Creating Design</h2>
                <p className="text-lime-500/80 text-[10px] font-bold uppercase tracking-[0.4em] animate-pulse">Hang on tight</p>
             </div>
          </motion.div>
      )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isBrandDnaOpen && <BrandDna onClose={() => setIsBrandDnaOpen(false)} onStartCampaign={handleGenerateCampaign} />}
      </AnimatePresence>
      
      <AnimatePresence>
        {isSidebarOpen && !isMobile && (
          <motion.div
              key="sidebar-desktop"
              initial={{ x: -380 }}
              animate={{ x: 0 }}
              exit={{ x: -380 }}
              transition={motionProps}
              className="h-full w-[380px] z-40 bg-white shadow-2xl"
          >
            <Sidebar 
              user={user} designs={designs} brandData={brandData} currentDesignId={currentDesignId}
              loadDesign={loadDesign} createNewDesign={createNewDesign} deleteDesign={deleteDesign}
              importDesign={() => fileInputRef.current?.click()} openBrandDna={() => setIsBrandDnaOpen(true)}
              selectedElement={selectedElement} themeColors={state.themeColors} pages={state.pages}
              currentPageIndex={state.currentPageIndex} updateElement={updateElement} updatePage={updatePage}
              onLayerReorder={onLayerReorder} recentImages={recentImages} isMobile={false} availableFonts={allFonts}
              onAddCustomFont={handleAddCustomFont} onDeleteCustomFont={handleDeleteCustomFont}
              onAddText={onAddText} onAddShape={onAddShape} onAddImage={onAddImage}
              onUpdateColors={(cols) => setState(p => ({ ...p, themeColors: cols }))}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div ref={topToolbarRef} className={`absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-2 rounded-full border border-gray-200/80 shadow-lg transition-opacity ${isSidebarOpen && isMobile ? 'opacity-0' : 'opacity-100'}`}>
           <button className="p-1 text-gray-500 hover:text-gray-900 transition-colors" onClick={() => setState(p => ({ ...p, currentPageIndex: Math.max(0, p.currentPageIndex - 1) }))}><Icons.ArrowLeft className="w-5 h-5"/></button>
           <span className="text-[10px] w-12 text-center font-bold text-gray-500 uppercase tracking-widest">{state.currentPageIndex + 1}/{state.pages.length}</span>
           <button className="p-1 text-gray-500 hover:text-gray-900 transition-colors" onClick={() => setState(p => ({ ...p, currentPageIndex: Math.min(p.pages.length - 1, p.currentPageIndex + 1) }))}><Icons.ArrowRight className="w-5 h-5"/></button>
           <div className="w-[1px] h-4 bg-gray-200 mx-1" />
            <button className="p-1 text-lime-500 hover:scale-125 transition-transform w-5 h-5 flex items-center justify-center" onClick={addPage}>
              {saveStatus === 'saving' ? <Icons.RotateCw className="w-4 h-4 animate-spin" /> : 
               saveStatus === 'saved' ? <Icons.Check className="w-4 h-4 text-green-500" /> : 
               <Icons.Plus className="w-5 h-5" />}
            </button>
           <button className="p-1.5 bg-gray-800 rounded-full text-white hover:rotate-12 transition-all shadow-md" onClick={() => setIsAiModalOpen(true)}><Icons.Wand2 className="w-4 h-4" /></button>
           {selectedElement ? 
            <button className="p-1 text-red-500/60 hover:text-red-500 transition-colors" onClick={() => deleteElement(selectedElement.id)}><Icons.Trash2 className="w-5 h-5"/></button> :
            <button className="p-1 text-gray-500 hover:text-gray-800 transition-colors" onClick={() => setIsShareModalOpen(true)}><Icons.Share2 className="w-5 h-5"/></button>
           }
        </div>

        <div ref={workspaceRef} className="flex-1 flex items-center justify-center relative overflow-hidden p-4 transition-all duration-300">
           {snapLines.map((line, i) => (
             <div key={i} className="absolute bg-lime-400 z-[100] pointer-events-none" style={{
                 left: line.type === 'vertical' ? `calc(50% + (${line.position - CANVAS_WIDTH / 2}px * ${canvasScale}))` : 0,
                 top: line.type === 'horizontal' ? `calc(50% + (${line.position - CANVAS_HEIGHT / 2}px * ${canvasScale}))` : 0,
                 width: line.type === 'vertical' ? '1px' : '100%',
                 height: line.type === 'horizontal' ? '1px' : '100%',
                 opacity: 0.8
               }}
             />
           ))}
           
           <motion.div
             key={state.currentPageIndex}
             initial={{ scale: 0.95, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
             className="relative"
             style={{ transform: `scale(${canvasScale})`, transformOrigin: 'center center' }}
            >
               <div id="design-canvas" ref={canvasRef} onPointerDown={handleCanvasPointerDown} onContextMenu={e => e.preventDefault()} className="relative shadow-2xl shadow-gray-500/20 transition-all duration-300 origin-center overflow-hidden rounded-2xl"
                 style={{ 
                   width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
                   backgroundColor: currentPage?.background.startsWith('#') ? currentPage.background : '#FFFFFF',
                   backgroundImage: !currentPage?.background.startsWith('#') ? `url(${currentPage.background})` : undefined,
                   backgroundSize: 'cover', backgroundPosition: 'center'
                 }}
               >
                  {currentPage?.elements.map(el => (
                      <ElementRenderer 
                        key={el.id}
                        element={el} 
                        isSelected={state.selectedElementId === el.id} 
                        onSelect={handleElementPointerDown}
                        onResizeStart={handleResizePointerDown}
                        onRotateStart={handleRotatePointerDown}
                        updateElement={updateElement}
                      />
                  ))}
               </div>

                <AnimatePresence>
                {showStar && (
                    <motion.svg className="absolute inset-0 w-full h-full pointer-events-none z-50" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} fill="none">
                        <rect x="1" y="1" width={CANVAS_WIDTH - 2} height={CANVAS_HEIGHT - 2} rx="16" style={{
                            stroke: '#84cc16', strokeWidth: 3, strokeDasharray: '150 1600',
                            filter: 'drop-shadow(0 0 10px #a3e635)',
                            animation: 'star-trail 1.5s ease-out forwards'
                        }}/>
                        <rect x="1" y="1" width={CANVAS_WIDTH - 2} height={CANVAS_HEIGHT - 2} rx="16" style={{
                            stroke: 'white', strokeWidth: 1.5, strokeDasharray: '30 1720',
                            animation: 'star-trail 1.5s ease-out forwards'
                        }}/>
                    </motion.svg>
                )}
                </AnimatePresence>

           </motion.div>
        </div>

        <AnimatePresence>
        {isAiModalOpen && (
          <motion.div 
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={motionProps}
            className="absolute inset-x-0 bottom-0 z-[200] p-4">
             <div className="bg-white/80 backdrop-blur-3xl border border-gray-200/80 rounded-[24px] p-6 shadow-2xl">
                <div className="flex items-center justify-between gap-3 mb-4">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-lime-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.4)]">
                        <Icons.Wand2 className="w-5 h-5 text-black" />
                     </div>
                     <h3 className="text-sm font-bold uppercase tracking-widest text-gray-800 italic">Mock-AI</h3>
                   </div>
                   <div className="text-right">
                      <div className="text-sm font-bold text-gray-800">{userTokens}</div>
                      <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wider">Tokens</div>
                   </div>
                </div>
                <input type="file" ref={aiImageInputRef} className="hidden" accept="image/*" multiple onChange={handleAiImageAttach} />
                <div className="relative">
                  <input 
                    autoFocus
                    placeholder={useImageAsReference ? 'Describe the style or content to recreate...' : 'e.g., \'Advertise my noodle brand\''}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiRefine()}
                    disabled={isAiLoading}
                    className="w-full bg-gray-100 border border-gray-200 rounded-2xl h-16 pl-12 pr-14 text-sm focus:outline-none focus:border-lime-400 transition-all placeholder:text-gray-400 text-gray-800"
                  />
                  <button onClick={() => aiImageInputRef.current?.click()} disabled={useImageAsReference ? aiAttachedImages.length >= 1 : aiAttachedImages.length >= 4} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-30">
                    <Icons.Paperclip className="w-5 h-5" />
                  </button>
                  <button onClick={handleAiRefine} disabled={isAiLoading || (useImageAsReference && aiAttachedImages.length === 0)} className={`absolute right-2 top-2 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isAiLoading ? 'bg-gray-200' : 'bg-lime-400 text-black active:scale-90 hover:shadow-lg hover:shadow-lime-500/30'} disabled:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed`}>
                    {isAiLoading ? <Icons.Sparkles className="w-5 h-5 animate-spin-custom text-gray-500" /> : <Icons.ArrowRight className="w-6 h-6" />}
                  </button>
                </div>
                {aiAttachedImages.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {aiAttachedImages.map((img, i) => (
                      <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 group">
                        <img src={img} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                        <button onClick={() => setAiAttachedImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Icons.X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setIsAiModalOpen(false)} className="w-full mt-4 text-[10px] font-bold uppercase text-gray-400 hover:text-gray-700 transition-colors tracking-widest">Cancel</button>
             </div>
          </motion.div>
        )}
        </AnimatePresence>
        
        {isMobile && !isAiModalOpen && (
          <div ref={quickToolsRef} className="absolute bottom-0 left-0 right-0 z-20">
                <QuickTools
                    selectedElement={selectedElement}
                    updateElement={updateElement}
                    onReorder={onReorder}
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                    availableFonts={allFonts}
                    themeColors={state.themeColors}
                    deleteElement={deleteElement}
                    updatePage={updatePage}
                    onApplyEffect={handleApplyEffect}
                />
          </div>
        )}
        
        <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div 
            ref={mobileSidebarRef}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={motionProps}
            className="fixed inset-0 z-[110] flex flex-col justify-end"
            onClick={() => setIsSidebarOpen(false)}
          >
            <div className="h-[85vh] bg-white rounded-t-[20px] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />
              <div className="flex-1 overflow-y-auto">
                <Sidebar 
                  user={user} designs={designs} brandData={brandData} currentDesignId={currentDesignId}
                  loadDesign={loadDesign} createNewDesign={createNewDesign} deleteDesign={deleteDesign}
                  importDesign={() => fileInputRef.current?.click()} openBrandDna={() => setIsBrandDnaOpen(true)}
                  selectedElement={selectedElement} themeColors={state.themeColors} pages={state.pages}
                  currentPageIndex={state.currentPageIndex} updateElement={updateElement} updatePage={updatePage}
                  onLayerReorder={onLayerReorder} recentImages={recentImages} isMobile={true} availableFonts={allFonts}
                  onAddCustomFont={handleAddCustomFont} onDeleteCustomFont={handleDeleteCustomFont}
                  onAddText={(type) => { onAddText(type); setIsSidebarOpen(false); }}
                  onAddShape={(shape) => { onAddShape(shape); setIsSidebarOpen(false); }}
                  onAddImage={(src) => { onAddImage(src); setIsSidebarOpen(false); }}
                  onUpdateColors={(cols) => setState(p => ({ ...p, themeColors: cols }))}
                  onClose={() => setIsSidebarOpen(false)}
                />
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
        
        <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-lg flex items-center justify-center p-6" onClick={() => setIsExportModalOpen(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={motionProps}
              className="bg-white border border-gray-200 rounded-[24px] w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl md:text-2xl font-black text-gray-800 italic tracking-tight uppercase">Export Design</h2>
                    <p className="text-gray-500 text-sm">Select format for high-res output</p>
                  </div>
                  <div className="grid gap-3">
                    <button onClick={handleExportPng} className="group flex items-center gap-4 bg-lime-400 p-5 rounded-2xl text-black font-bold transition-all hover:bg-lime-300 active:scale-95">
                      <div className="w-12 h-12 bg-black/10 rounded-xl flex items-center justify-center"><Icons.ImageIcon className="w-6 h-6" /></div>
                      <div className="text-left"><div className="text-lg">Download PNG</div><div className="text-[10px] font-bold opacity-60 italic uppercase tracking-widest">Ultra High Fidelity</div></div>
                    </button>
                    <button onClick={handleExportJson} className="group flex items-center gap-4 bg-gray-100 p-5 rounded-2xl text-gray-800 font-bold border border-gray-200 transition-all hover:bg-gray-200 active:scale-95">
                      <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center"><Icons.Layout className="w-6 h-6" /></div>
                      <div className="text-left"><div className="text-lg">Export JSON</div><div className="text-[10px] font-bold opacity-60 italic uppercase tracking-widest">Mockingjay Raw File</div></div>
                    </button>
                  </div>
               </div>
               <button onClick={() => setIsExportModalOpen(false)} className="w-full py-5 text-gray-400 text-xs font-bold uppercase tracking-widest border-t border-gray-200 hover:text-gray-800 transition-colors">Cancel</button>
            </motion.div>
          </div>
        )}
        </AnimatePresence>

      </main>

    </div>
  );
};

export default App;
