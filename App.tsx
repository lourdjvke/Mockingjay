import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EditorState, DesignElement, BoundingBox, Page } from './types.ts';
import { INITIAL_STATE, CANVAS_WIDTH, CANVAS_HEIGHT, FONTS as BASE_FONTS } from './constants.ts';
import { generateId, downloadTemplate, FontStore, MediaStore, sanitizeAiJson, embedGoogleFonts } from './utils.ts';
import Sidebar from './components/Sidebar.tsx';
import ElementRenderer from './components/ElementRenderer.tsx';
import { Icons } from './components/IconLibrary.tsx';
import { domToPng } from 'modern-screenshot';
import { auth, database, provider, signInWithPopup, onAuthStateChanged, ref, set, onValue, get, child } from './firebase.ts';
import type { User } from 'firebase/auth';
import { useDebouncedCallback } from 'use-debounce';

interface SnapLine {
  type: 'vertical' | 'horizontal';
  position: number;
}

type ExportStatus = 'idle' | 'processing' | 'success' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved';

const App: React.FC = () => {
  const [state, setState] = useState<EditorState>(INITIAL_STATE);
  const [dragStart, setDragStart] = useState<{ x: number, y: number, type: 'move' | 'resize' | 'rotate', handle?: string, initialAngle?: number } | null>(null);
  const [elementStartPos, setElementStartPos] = useState<BoundingBox | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [userFonts, setUserFonts] = useState<{ name: string; value: string }[]>([]);
  const [recentImages, setRecentImages] = useState<string[]>([]);
  const [aiAttachedImages, setAiAttachedImages] = useState<string[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  // Firebase and Design-related state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [designs, setDesigns] = useState<any[]>([]);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiImageInputRef = useRef<HTMLInputElement>(null);

  const allFonts = [...userFonts, ...BASE_FONTS];

  // Debounced save function
  const debouncedSave = useDebouncedCallback((designState: EditorState, designId: string) => {
    if (!user) return;
    setSaveStatus('saving');
    const dbRef = ref(database, `users/${user.uid}/designs/${designId}`);
    set(dbRef, { ...designState, lastModified: Date.now() })
      .then(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      })
      .catch(error => {
        console.error("Failed to save design:", error);
        setSaveStatus('idle');
      });
  }, 3000);

  // Autosave effect
  useEffect(() => {
    if (user && currentDesignId && !isAuthLoading && state !== INITIAL_STATE) {
      debouncedSave(state, currentDesignId);
    }
  }, [state, user, currentDesignId, isAuthLoading, debouncedSave]);

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthLoading(false);
      if (!user) {
        setState(INITIAL_STATE);
        setCurrentDesignId(null);
        setDesigns([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load user's designs from Firebase
  useEffect(() => {
    if (user) {
      const designsRef = ref(database, `users/${user.uid}/designs`);
      const unsubscribe = onValue(designsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const userDesigns = Object.keys(data)
            .map(key => ({ id: key, ...data[key] }))
            .sort((a, b) => b.lastModified - a.lastModified);
          setDesigns(userDesigns);
          // If no design is loaded, load the most recent one
          if (!currentDesignId && userDesigns.length > 0) {
            loadDesign(userDesigns[0].id);
          }
        } else {
          setDesigns([]);
          // If user has no designs, create a new one
          if (!currentDesignId) {
            createNewDesign();
          }
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      alert("Could not sign in with Google. Please try again.");
    }
  };

  const createNewDesign = () => {
    const newId = generateId();
    setState(INITIAL_STATE);
    setCurrentDesignId(newId);
  };

  const loadDesign = (designId: string) => {
    const designToLoad = designs.find(d => d.id === designId);
    if (designToLoad) {
      // Ensure pages and elements arrays exist to prevent crashes from legacy data.
      const sanitizedPages = (designToLoad.pages || INITIAL_STATE.pages).map((page: Page) => ({
        ...page,
        elements: page.elements || [],
      }));

      setState({
        pages: sanitizedPages,
        currentPageIndex: designToLoad.currentPageIndex || 0,
        selectedElementId: designToLoad.selectedElementId || null,
        themeColors: designToLoad.themeColors || INITIAL_STATE.themeColors,
      });
      setCurrentDesignId(designId);
    }
  };

  const addPage = () => {
    setState(prev => {
      const newPage: Page = { id: generateId(), background: '#18181b', elements: [] };
      const newPages = [...prev.pages, newPage];
      return {
        ...prev,
        pages: newPages,
        currentPageIndex: newPages.length - 1,
      };
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
            const fontFace = new FontFace(font.name, font.data);
            const loadedFace = await fontFace.load();
            document.fonts.add(loadedFace);
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

  // Added handleAddCustomFont to fix missing name error
  const handleAddCustomFont = useCallback(async (name: string, data: ArrayBuffer) => {
    try {
      await FontStore.saveFont(name, data);
      const base64 = bufferToBase64(data);
      injectFontFace(name, base64);
      
      const fontFace = new FontFace(name, data);
      const loadedFace = await fontFace.load();
      document.fonts.add(loadedFace);
      
      setUserFonts(prev => [...prev, { name, value: `'${name}', sans-serif` }]);
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);
    } catch (err) {
      console.error("Font save failed:", err);
    }
  }, []);

  // Added handleDeleteCustomFont to fix missing name error
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
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // PWA install prompt handling
  useEffect(() => {
    // Check if already installed as PWA
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

  useEffect(() => {
    const updateScale = () => {
      if (!workspaceRef.current) return;
      const ws = workspaceRef.current;
      const padding = isMobile ? 40 : 120;
      const availableWidth = ws.clientWidth - padding;
      const availableHeight = ws.clientHeight - padding;
      const sx = availableWidth / CANVAS_WIDTH;
      const sy = availableHeight / CANVAS_HEIGHT;
      setScale(Math.min(sx, sy, 1));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
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
    const maxImages = 4;
    const remaining = maxImages - aiAttachedImages.length;
    const toProcess = Array.from(files).slice(0, remaining);

    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          setAiAttachedImages(prev => {
            if (prev.length >= maxImages) return prev;
            return [...prev, dataUrl];
          });
        }
      };
      reader.readAsDataURL(file);
    });
    // Reset input so same files can be re-selected
    e.target.value = '';
  };

  const fetchWithRetry = async (url: string, payload: any, retries = 5): Promise<any> => {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) return await response.json();

        const errData = await response.json();
        lastError = new Error(errData.error?.message || `Request failed with status ${response.status}`);
        
        if (response.status === 429 || response.status >= 500) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        
        throw lastError;
      } catch (err) {
        lastError = err;
        if (i === retries - 1) throw lastError;
        await new Promise(res => setTimeout(res, 1000));
      }
    }
    throw lastError;
  };

  const handleAiRefine = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    triggerHaptic(30);

    try {
      const apiUrl = '/api/ai';

      const systemInstruction = `You are "Mockingjay AI", a world-class Lead Designer and UI/UX expert.
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

AVAILABLE FONTS: ${allFonts.map(f => f.value).join(', ')}.

ELEMENT STRUCTURE - REQUIRED FIELDS FOR EACH ELEMENT:
{
  "id": "unique_id",
  "type": "text|shape|image|icon",
  "name": "descriptive name",
  "box": { "x": number, "y": number, "width": number, "height": number, "rotation": 0 },
  "content": "text content or SVG path or image URL",
  "style": {
    "color": "#hexcolor or white/black",
    "backgroundColor": "#hexcolor (optional)",
    "fontSize": number (14-70 for text),
    "fontFamily": "font name from available list",
    "fontWeight": "normal|bold|300|400|600|700",
    "textAlign": "left|center|right",
    "letterSpacing": 0,
    "lineHeight": 1.4,
    "borderRadius": 0,
    "opacity": 1,
    "strokeColor": "#hexcolor (optional)",
    "strokeWidth": 0
  },
  "visible": true,
  "locked": false
}

DESIGN PATTERNS BY REQUEST TYPE:

FOR BRAND/COMPANY REQUESTS:
1. Background color or image (applies to page.background)
2. Large headline (40-70px) with brand name
3. Tagline/subtitle (24-30px)
4. 2-3 descriptive text elements (14-18px)
5. Accent shapes or icons for visual interest
6. All text in theme colors from user request

FOR COLOR/STYLE REQUESTS:
- Update ALL element colors to match the requested theme
- If "purple" mentioned, use gradients of purple: #8B5CF6, #A78BFA, #DDD6FE
- If "brand colors" requested, create a palette and apply consistently

POSITIONING GUIDELINES:
- Use margins of 20-40px from canvas edges
- Space elements 15-20px apart
- Center headline at x: ${Math.round(CANVAS_WIDTH / 4)}, y: 40
- Place secondary elements below with proper spacing
- Use full width (${CANVAS_WIDTH}) for visual elements

RESPONSE FORMAT:
Return ONLY valid JSON matching this structure (NO markdown, NO code blocks):
{
  "pages": [
    {
      "id": "page_1",
      "background": "#colorhex or image_url",
      "elements": [
        { element objects as defined above }
      ]
    }
  ],
  "currentPageIndex": 0,
  "selectedElementId": null,
  "themeColors": ["#color1", "#color2", "#color3", "#color4"]
}

REMEMBER: Never generate empty pages. Always fill pages with rich, varied content.${aiAttachedImages.length > 0 ? `

USER HAS ATTACHED ${aiAttachedImages.length} IMAGE(S). You MUST include them in the design as image elements.
For each attached image, create an image element with type "image" and set content to the placeholder:
- First image: "ATTACHED_IMAGE_0"
- Second image: "ATTACHED_IMAGE_1"
- Third image: "ATTACHED_IMAGE_2"
- Fourth image: "ATTACHED_IMAGE_3"
Position them prominently in the design with good sizing (at least 200x200).` : ''}`;

      const payload = {
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction}\n\nCurrent Editor State: ${JSON.stringify(state)}\n\nUser Request: ${aiPrompt}`
              }
            ]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.9,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192
        }
      };

      const result = await fetchWithRetry(apiUrl, payload);
      
      if (!result) {
        throw new Error("Received an empty response from the AI service.");
      }

      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        console.error("Invalid AI Response:", result);
        throw new Error("No response content from API. The AI may be experiencing issues.");
      }

      let newState;
      try {
        const cleanedJson = sanitizeAiJson(textResponse);
        newState = JSON.parse(cleanedJson);
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr, "Raw response:", textResponse);
        throw new Error("Failed to parse AI response as JSON");
      }

      if (!newState.pages || !Array.isArray(newState.pages) || newState.pages.length === 0) {
        console.error("Invalid response structure:", newState);
        throw new Error("AI response missing pages array");
      }

      // Replace ATTACHED_IMAGE placeholders with actual data URLs
      if (aiAttachedImages.length > 0) {
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

      const currentPage = newState.pages[newState.currentPageIndex || 0];
      if (!currentPage.elements || currentPage.elements.length === 0) {
        console.warn("Warning: AI generated page with no elements");
      }

      const pageAdded = newState.pages.length > state.pages.length;
      const targetPageIndex = pageAdded ? newState.pages.length - 1 : (newState.currentPageIndex || 0);

      setState({
        ...newState,
        currentPageIndex: targetPageIndex
      });
      setIsAiModalOpen(false);
      setAiPrompt("");
      setAiAttachedImages([]);
      triggerHaptic(50);
    } catch (err: any) {
      console.error("Design Engine Fail:", err);
      const errorMsg = err?.message || "Unknown error";
      alert(`AI Error: ${errorMsg}. Please try again with a more specific design prompt.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const deleteElement = (id: string) => {
    setState(prev => {
      const newPages = [...prev.pages];
      newPages[prev.currentPageIndex].elements = newPages[prev.currentPageIndex].elements.filter(el => el.id !== id);
      return { ...prev, pages: newPages, selectedElementId: null };
    });
  };

  const updateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    setState(prev => {
      const newPages = [...prev.pages];
      const page = newPages[prev.currentPageIndex];
      page.elements = page.elements.map(el => {
        if (el.id === id) {
          const newStyle = updates.style ? { ...el.style, ...updates.style } : el.style;
          return { ...el, ...updates, style: newStyle };
        }
        return el;
      });
      return { ...prev, pages: newPages };
    });
  }, []);

  const updatePage = (updates: Partial<Page>) => {
    setState(prev => {
      const newPages = [...prev.pages];
      newPages[prev.currentPageIndex] = { ...newPages[prev.currentPageIndex], ...updates };
      return { ...prev, pages: newPages };
    });
  };

  const handleSelect = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    if (state.selectedElementId !== id) triggerHaptic(5);
    setState(prev => ({ ...prev, selectedElementId: id }));
    const element = currentPage.elements.find(el => el.id === id);
    if (element && !element.locked) {
      setDragStart({ x: e.clientX, y: e.clientY, type: 'move' });
      setElementStartPos({ ...element.box });
    }
  }, [currentPage.elements, state.selectedElementId, triggerHaptic]);

  const deselectAll = () => setState(prev => ({ ...prev, selectedElementId: null }));

  const addElement = useCallback((element: Partial<DesignElement>) => {
    const defaultFont = allFonts.length > 0 ? allFonts[0].value : "'Inter', sans-serif";
    const newElement: DesignElement = {
      id: generateId(),
      name: element.name || (element.type ? `${element.type.charAt(0).toUpperCase() + element.type.slice(1)}` : 'Element'),
      type: (element.type as any) || 'shape',
      box: { x: (CANVAS_WIDTH - 200) / 2, y: (CANVAS_HEIGHT - 200) / 2, width: 200, height: 200, rotation: 0 },
      content: '',
      style: { backgroundColor: '#FFFFFF', color: '#000000', borderRadius: 0, opacity: 1, strokeWidth: 0, strokePattern: 'solid', strokeColor: '#000000', letterSpacing: 0, lineHeight: 1.2, fontFamily: defaultFont, fontSize: 24, fontWeight: '400', textAlign: 'center' },
      visible: true,
      locked: false,
      ...element
    };
    setState(prev => {
      const newPages = [...prev.pages];
      newPages[prev.currentPageIndex].elements.push(newElement);
      return { ...prev, pages: newPages, selectedElementId: newElement.id };
    });
    if (element.type === 'image' && element.content) {
      MediaStore.saveImage(element.content).then(() => {
        MediaStore.getImages().then(imgs => setRecentImages(imgs.map(i => i.data)));
      });
    }
    triggerHaptic(15);
  }, [allFonts, triggerHaptic]);

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
      style: { backgroundColor: state.themeColors[0] || '#FFFFFF', borderRadius, clipPath },
      box: { x: (CANVAS_WIDTH - width) / 2, y: (CANVAS_HEIGHT - height) / 2, width, height, rotation: 0 }
    });
  }, [addElement, state.themeColors]);

  const onReorder = useCallback((id: string, direction: 'up' | 'down') => {
    setState(prev => {
      const newPages = [...prev.pages];
      const page = { ...newPages[prev.currentPageIndex] };
      const index = page.elements.findIndex(el => el.id === id);
      if (index === -1) return prev;
      const newElements = [...page.elements];
      if (direction === 'up') {
        if (index < newElements.length - 1) [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      } else {
        if (index > 0) [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
      }
      page.elements = newElements;
      newPages[prev.currentPageIndex] = page;
      return { ...prev, pages: newPages };
    });
    triggerHaptic(5);
  }, [triggerHaptic]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragStart || !elementStartPos || !state.selectedElementId) return;
    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;
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
      width = Math.max(10, width);
      height = Math.max(10, height);
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
  }, [dragStart, elementStartPos, state.selectedElementId, scale, updateElement]);

  const handlePointerUp = useCallback(() => {
    setDragStart(null);
    setElementStartPos(null);
    setSnapLines([]);
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleAutoResize = useCallback((id: string, newHeight: number) => {
    setState(prev => {
      const newPages = [...prev.pages];
      const page = newPages[prev.currentPageIndex];
      page.elements = page.elements.map(el => {
        if (el.id === id && newHeight > el.box.height) {
          return { ...el, box: { ...el.box, height: newHeight } };
        }
        return el;
      });
      return { ...prev, pages: newPages };
    });
  }, []);

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    setExportStatus('processing');
    triggerHaptic(20);

    const canvasNode = canvasRef.current;
    const originalBoxShadow = canvasNode.style.boxShadow;
    const originalTransform = canvasNode.style.transform;
    const originalTransition = canvasNode.style.transition;
    
    canvasNode.style.boxShadow = 'none';
    canvasNode.style.transform = 'none';
    canvasNode.style.transition = 'none';

    let fontStyleEl: HTMLStyleElement | null = null;
    try {
      // Embed Google Fonts as inline base64 @font-face rules
      const googleFontsLink = document.querySelector('link[href*="fonts.googleapis.com"]') as HTMLLinkElement;
      if (googleFontsLink) {
        const inlineFontCss = await embedGoogleFonts(googleFontsLink.href);
        if (inlineFontCss) {
          fontStyleEl = document.createElement('style');
          fontStyleEl.setAttribute('data-export-fonts', 'true');
          fontStyleEl.textContent = inlineFontCss;
          canvasNode.prepend(fontStyleEl);
        }
      }

      // Also collect user-uploaded font @font-face rules already in <head>
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
        backgroundColor: currentPage.background.startsWith('#') ? currentPage.background : 'transparent',
        style: {
          transform: 'none',
          left: '0',
          top: '0',
          position: 'relative',
          margin: '0',
          padding: '0',
        }
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
      // Restore styles
      canvasNode.style.boxShadow = originalBoxShadow;
      canvasNode.style.transform = originalTransform;
      canvasNode.style.transition = originalTransition;
      // Clean up injected font style element
      if (fontStyleEl && fontStyleEl.parentNode) {
        fontStyleEl.parentNode.removeChild(fontStyleEl);
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-black overflow-hidden select-none touch-none">
       {/* Authentication Overlay */}
       {!user && !isAuthLoading && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Mockingjay</h1>
            <p className="text-white/50">Your AI-powered design companion</p>
          </div>
          <button 
            onClick={handleGoogleSignIn} 
            className="bg-lime-400 text-black px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 hover:bg-lime-300 transition-all active:scale-95 shadow-lg shadow-lime-500/20"
          >
            Continue with Google
          </button>
        </div>
      )}
      
      <input type="file" ref={fileInputRef} className="hidden" accept="application/json" onChange={(e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { try { const s = JSON.parse(ev.target?.result as string); if (s.pages) setState(s); } catch (er) { console.error(er); } };
        reader.readAsText(file);
      }} />

      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${exportStatus === 'success' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12 scale-90'}`}>
        <div className="bg-zinc-900/90 backdrop-blur-3xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-4 shadow-[0_12px_48px_rgba(0,0,0,0.6)]">
           <div className="w-6 h-6 bg-lime-400 text-black rounded-full flex items-center justify-center shadow-inner">
             <Icons.Sparkles className="w-3.5 h-3.5" />
           </div>
           <span className="text-[13px] font-bold tracking-tight text-white uppercase italic">Design Finalized</span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col relative canvas-container overflow-hidden">
        {/* DESIGN ENGINE THINKING STATE */}
        {isAiLoading && (
          <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
             <div className="relative">
                <div className="w-32 h-32 border-2 border-lime-400/20 rounded-full animate-ping absolute inset-0"></div>
                <div className="w-32 h-32 border-4 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Icons.Wand2 className="w-10 h-10 text-lime-400 animate-pulse" />
                </div>
             </div>
             <div className="text-center space-y-2">
                <h2 className="text-lg md:text-2xl font-black italic uppercase tracking-tighter text-white">Creating Design</h2>
                <p className="text-lime-400/60 text-[10px] font-bold uppercase tracking-[0.4em] animate-pulse">Hang on tight</p>
             </div>
          </div>
        )}

        <div className={`absolute top-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 shadow-2xl transition-opacity ${isBottomSheetOpen && isMobile ? 'opacity-0' : 'opacity-100'}`}>
           <button className="p-1 text-white/30 hover:text-white transition-colors" onClick={() => { setState(p => ({ ...p, currentPageIndex: Math.max(0, p.currentPageIndex - 1) })); triggerHaptic(2); }}><Icons.ArrowLeft className="w-5 h-5"/></button>
           <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{state.currentPageIndex + 1}/{state.pages.length}</span>
           <button className="p-1 text-white/30 hover:text-white transition-colors" onClick={() => { setState(p => ({ ...p, currentPageIndex: Math.min(p.pages.length - 1, p.currentPageIndex + 1) })); triggerHaptic(2); }}><Icons.ArrowRight className="w-5 h-5"/></button>
           <div className="w-[1px] h-4 bg-white/10 mx-1" />
            <button className="p-1 text-lime-400 hover:scale-125 transition-transform w-5 h-5 flex items-center justify-center" onClick={addPage}>
              {saveStatus === 'saving' && <Icons.RotateCw className="w-4 h-4 animate-spin" />}
              {saveStatus === 'saved' && <Icons.Check className="w-4 h-4 text-green-400" />}
              {saveStatus === 'idle' && <Icons.Plus className="w-5 h-5" />}
            </button>
           <button className="p-1.5 bg-gradient-to-tr from-lime-600 to-lime-400 rounded-full text-black hover:rotate-12 transition-all shadow-[0_0_15px_rgba(163,230,53,0.4)]" onClick={() => { setIsAiModalOpen(true); triggerHaptic(10); }}><Icons.Wand2 className="w-4 h-4" /></button>
           <button className="p-1 text-red-400/60 hover:text-red-400 transition-colors" onClick={() => selectedElement && deleteElement(selectedElement.id)}><Icons.Trash2 className="w-5 h-5"/></button>
        </div>

        <div ref={workspaceRef} className="flex-1 flex items-center justify-center relative overflow-hidden">
           {snapLines.map((line, i) => (
             <div key={i} className="absolute bg-lime-400 z-[100] pointer-events-none" style={{
                 left: line.type === 'vertical' ? `calc(50% + (${line.position - CANVAS_WIDTH / 2}px * ${scale}))` : 0,
                 top: line.type === 'horizontal' ? `calc(50% + (${line.position - CANVAS_HEIGHT / 2}px * ${scale}))` : 0,
                 width: line.type === 'vertical' ? '1px' : '100%',
                 height: line.type === 'horizontal' ? '1px' : '100%',
                 opacity: 0.6
               }}
             />
           ))}

           <div id="design-canvas" ref={canvasRef} onPointerDown={deselectAll} className="relative shadow-[0_0_120px_rgba(0,0,0,0.8)] transition-all duration-300 origin-center bg-zinc-800 overflow-hidden"
             style={{ 
               width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `scale(${scale})`,
               backgroundColor: currentPage?.background.startsWith('#') ? currentPage.background : undefined,
               backgroundImage: !currentPage?.background.startsWith('#') ? `url(${currentPage.background})` : undefined,
               backgroundSize: 'cover', backgroundPosition: 'center'
             }}
           >
              {currentPage?.elements.map(el => (
                <div key={el.id}>
                  <ElementRenderer element={el} isSelected={state.selectedElementId === el.id} onSelect={handleSelect} onAutoResize={handleAutoResize} />
                  {state.selectedElementId === el.id && !el.locked && (
                    <div className="absolute pointer-events-none" style={{ left: el.box.x, top: el.box.y, width: el.box.width, height: el.box.height, transform: `rotate(${el.box.rotation}deg)`, zIndex: 60, border: '2px solid #bef264' }}>
                      {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map(h => {
                        let s: React.CSSProperties = {};
                        if (h === 'nw') s = { top: '-12px', left: '-12px' }; if (h === 'ne') s = { top: '-12px', right: '-12px' };
                        if (h === 'sw') s = { bottom: '-12px', left: '-12px' }; if (h === 'se') s = { bottom: '-12px', right: '-12px' };
                        if (h === 'n') s = { top: '-12px', left: '50%', transform: 'translateX(-50%)' }; if (h === 's') s = { bottom: '-12px', left: '50%', transform: 'translateX(-50%)' };
                        if (h === 'e') s = { right: '-12px', top: '50%', transform: 'translateY(-50%)' }; if (h === 'w') s = { left: '-12px', top: '50%', transform: 'translateY(-50%)' };
                        const isC = h.length === 2;
                        return (
                          <div key={h} onPointerDown={(e) => { e.stopPropagation(); setDragStart({ x: e.clientX, y: e.clientY, type: 'resize', handle: h }); setElementStartPos({...el.box}); triggerHaptic(5); }}
                            style={s} className={`absolute bg-white border-2 border-lime-400 pointer-events-auto shadow-lg ${isC ? 'w-6 h-6 rounded-full' : 'w-10 h-3 rounded-sm'} z-50 hover:scale-110 transition-transform`}
                          />
                        );
                      })}
                      <div onPointerDown={(e) => { e.stopPropagation(); const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return; const cX = rect.left + (el.box.x + el.box.width / 2) * scale; const cY = rect.top + (el.box.y + el.box.height / 2) * scale; const initialAngle = Math.atan2(e.clientY - cY, e.clientX - cX) * (180 / Math.PI); setDragStart({ x: e.clientX, y: e.clientY, type: 'rotate', initialAngle }); setElementStartPos({...el.box}); triggerHaptic(10); }}
                        className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-14 h-14 bg-zinc-900 border border-white/20 rounded-full flex items-center justify-center pointer-events-auto shadow-2xl"
                      >
                         <Icons.RotateCw className="w-7 h-7 text-lime-400" />
                      </div>
                      <div onPointerDown={(e) => handleSelect(el.id, e)} className="absolute -top-24 left-1/2 -translate-x-1/2 bg-lime-400 px-6 py-2.5 rounded-full flex items-center gap-3 text-[12px] text-black font-bold uppercase tracking-widest shadow-xl animate-bounce pointer-events-auto cursor-grab active:cursor-grabbing">
                         <Icons.Move className="w-5 h-5" /> Move
                      </div>
                    </div>
                  )}
                </div>
              ))}
           </div>
        </div>

        {isAiModalOpen && (
          <div className="absolute inset-x-0 bottom-0 z-[200] p-4 animate-in slide-in-from-bottom duration-500">
             <div className="bg-lime-900/40 backdrop-blur-3xl border border-lime-400/30 rounded-[24px] p-6 md:p-8 shadow-[0_40px_100px_rgba(0,0,0,0.9)]">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 bg-lime-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.4)]">
                      <Icons.Wand2 className="w-5 h-5 text-black" />
                   </div>
                   <div className="space-y-0.5">
                      <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-white italic">Mockingjay Intelligence</h3>
                      <p className="text-white/40 text-[8px] md:text-[9px] font-bold uppercase tracking-widest">Global Design Engine v3.1</p>
                   </div>
                </div>
                <input type="file" ref={aiImageInputRef} className="hidden" accept="image/*" multiple onChange={handleAiImageAttach} />
                <div className="relative">
                  <input 
                    autoFocus
                    placeholder="e.g., 'Advertise my noodle brand', 'Create a new coffee flyer'"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiRefine()}
                    disabled={isAiLoading}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl h-16 pl-12 pr-14 text-sm focus:outline-none focus:border-lime-400 transition-all placeholder:text-white/20"
                  />
                  <button onClick={() => aiImageInputRef.current?.click()} disabled={aiAttachedImages.length >= 4} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors disabled:opacity-30">
                    <Icons.Paperclip className="w-5 h-5" />
                  </button>
                  <button onClick={handleAiRefine} disabled={isAiLoading} className={`absolute right-2 top-2 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isAiLoading ? 'bg-zinc-800' : 'bg-lime-400 text-black active:scale-90 hover:shadow-[0_0_15px_rgba(163,230,53,0.5)]'}`}>
                    {isAiLoading ? <Icons.Sparkles className="w-5 h-5 animate-spin-custom" /> : <Icons.ArrowRight className="w-6 h-6" />}
                  </button>
                </div>
                {aiAttachedImages.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {aiAttachedImages.map((img, i) => (
                      <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 group">
                        <img src={img} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                        <button onClick={() => setAiAttachedImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Icons.X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                    {aiAttachedImages.length < 4 && (
                      <button onClick={() => aiImageInputRef.current?.click()} className="w-14 h-14 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-white/20 hover:text-white/40 hover:border-white/20 transition-colors">
                        <Icons.Plus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}
                <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar pb-2">
                   {["Advertise my noodle brand", "Create a new page with coffee ad", "Cyberpunk flyer", "Minimalist layout", "Bold brand poster"].map(s => (
                     <button key={s} onClick={() => setAiPrompt(s)} className="shrink-0 bg-white/5 border border-white/5 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase hover:bg-white/10 hover:border-white/20 transition-all text-white/60 hover:text-white">{s}</button>
                   ))}
                </div>
                <button onClick={() => { setIsAiModalOpen(false); setAiAttachedImages([]); }} className="w-full mt-8 text-[10px] font-black uppercase text-white/20 hover:text-white/60 transition-colors tracking-[0.4em]">Abort Engine Session</button>
             </div>
          </div>
        )}

        {!isMobile && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-4 bg-zinc-900/90 backdrop-blur rounded-3xl border border-white/10 shadow-2xl">
            <button className="text-white/40 hover:text-white" onClick={() => triggerHaptic(5)}><Icons.Undo2 className="w-5 h-5"/></button>
            <button className="text-white/40 hover:text-white" onClick={() => triggerHaptic(5)}><Icons.Redo2 className="w-5 h-5"/></button>
            <div className="w-[1px] h-6 bg-white/10" />
            <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 bg-lime-400 text-black px-6 py-2 rounded-full font-bold hover:bg-lime-300 transition-all text-sm shadow-xl active:scale-95">
              <Icons.Download className="w-4 h-4" /> Export
            </button>
          </div>
        )}

        {isMobile && !isAiModalOpen && !isPwaInstalled && deferredPrompt && (
          <div className={`absolute bottom-0 left-0 right-0 z-[100] transition-transform duration-300 ${isBottomSheetOpen ? 'translate-y-full' : 'translate-y-0'}`}>
            <div className="mx-4 mb-4 bg-zinc-900/95 backdrop-blur-lg border border-lime-400/20 rounded-2xl shadow-2xl p-4">
              <button onClick={handlePwaInstall} className="w-full flex items-center gap-4">
                <div className="w-12 h-12 bg-lime-400 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(163,230,53,0.3)]">
                  <Icons.Download className="w-6 h-6 text-black" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-bold text-white">Install Mockingjay</div>
                  <div className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Add to Home Screen for the best experience</div>
                </div>
                <Icons.ArrowRight className="w-5 h-5 text-lime-400 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {isMobile && !isAiModalOpen && (isPwaInstalled || !deferredPrompt) && (
          <div className={`absolute bottom-0 left-0 right-0 z-[100] transition-transform duration-300 ${isBottomSheetOpen ? 'translate-y-full' : 'translate-y-0'}`}>
            <div className="mx-4 mb-4 bg-zinc-900/95 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                  {selectedElement ? (
                    <>
                      <button onClick={() => setIsBottomSheetOpen(true)} className="flex flex-col items-center gap-1 text-lime-400 p-2 min-w-[50px]"><Icons.Sparkles className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Style</span></button>
                      <button onClick={() => setIsBottomSheetOpen(true)} className="flex flex-col items-center gap-1 text-white/60 p-2 min-w-[50px]"><Icons.Layout className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Layer</span></button>
                      <button onClick={() => deleteElement(selectedElement.id)} className="flex flex-col items-center gap-1 text-red-400 p-2 min-w-[50px]"><Icons.Trash2 className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Delete</span></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setIsBottomSheetOpen(true)} className="flex flex-col items-center gap-1 text-lime-400 p-2 min-w-[50px]"><Icons.Plus className="w-5 h-5" /><span className="text-[10px] font-bold uppercase">Add</span></button>
                      <div className="flex gap-2 items-center">
                         {state.themeColors.slice(0, 3).map(c => (
                           <button key={c} onClick={() => updatePage({ background: c })} className={`w-8 h-8 rounded-full border ${currentPage.background === c ? 'border-white' : 'border-white/20'}`} style={{ backgroundColor: c }} />
                         ))}
                      </div>
                    </>
                  )}
                </div>
                <button onClick={() => setIsExportModalOpen(true)} className="bg-lime-400 p-3 rounded-full shrink-0 shadow-lg active:scale-90"><Icons.Download className="w-6 h-6 text-black" /></button>
                <button onClick={() => setIsBottomSheetOpen(true)} className="bg-white/5 p-3 rounded-full shrink-0"><Icons.ChevronUp className="w-6 h-6 text-white" /></button>
              </div>
            </div>
          </div>
        )}

        {isMobile && isBottomSheetOpen && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" onClick={() => setIsBottomSheetOpen(false)}>
            <div className="absolute bottom-0 left-0 right-0 h-[85vh] bg-[#111] rounded-t-[20px] overflow-hidden bottom-sheet-transition flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 shrink-0" />
              <div className="flex-1 overflow-y-auto">
                <Sidebar 
                  user={user}
                  designs={designs}
                  currentDesignId={currentDesignId}
                  loadDesign={loadDesign}
                  createNewDesign={createNewDesign}
                  importDesign={() => fileInputRef.current?.click()}
                  selectedElement={selectedElement} 
                  themeColors={state.themeColors} 
                  pages={state.pages} 
                  currentPageIndex={state.currentPageIndex} 
                  updateElement={updateElement} 
                  updatePage={updatePage} 
                  onReorder={onReorder} 
                  recentImages={recentImages}
                  isMobile={true}
                  availableFonts={allFonts}
                  onAddCustomFont={handleAddCustomFont}
                  onDeleteCustomFont={handleDeleteCustomFont}
                  onColorChange={(color) => { if (selectedElement) { const key = selectedElement.type === 'text' || selectedElement.type === 'icon' ? 'color' : 'backgroundColor'; updateElement(selectedElement.id, { style: { ...selectedElement.style, [key]: color } }); } }}
                  onAddText={(type) => { addElement({ type: 'text', name: type, content: type === 'Header' ? 'HEADER' : (type === 'Subheader' ? 'Subheader' : 'Paragraph text.'), style: { fontSize: type === 'Header' ? 42 : 24, fontFamily: allFonts[0].value, color: '#FFF', textAlign: 'center', lineHeight: 1.2, letterSpacing: 0, fontWeight: '700' }, box: { x: 30, y: 150, width: 300, height: 100, rotation: 0 } }); setIsBottomSheetOpen(false); }}
                  onAddShape={onAddShape}
                  onAddImage={(src) => { addElement({ type: 'image', name: 'Image', content: src, style: { borderRadius: 24 }, box: { x: 40, y: 200, width: 280, height: 400, rotation: 0 } }); setIsBottomSheetOpen(false); }}
                  onUpdateColors={(cols) => setState(p => ({ ...p, themeColors: cols }))}
                />
              </div>
              <div className="p-5 bg-zinc-900 border-t border-white/10 flex justify-end">
                 <button onClick={() => setIsBottomSheetOpen(false)} className="w-full bg-lime-400 text-black h-12 rounded-xl font-bold text-sm">Done</button>
              </div>
            </div>
          </div>
        )}

        {isExportModalOpen && exportStatus === 'idle' && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setIsExportModalOpen(false)}>
            <div className="bg-zinc-900 border border-white/10 rounded-[24px] w-full max-sm overflow-hidden shadow-2xl scale-100 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
               <div className="p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl md:text-2xl font-black text-white italic tracking-tight uppercase">Export Design</h2>
                    <p className="text-white/40 text-sm">Select format for high-res output</p>
                  </div>
                  <div className="grid gap-3">
                    <button onClick={handleExportPng} className="group flex items-center gap-4 bg-lime-400 p-5 rounded-2xl text-black font-bold transition-all hover:bg-lime-300 active:scale-95">
                      <div className="w-12 h-12 bg-black/10 rounded-xl flex items-center justify-center"><Icons.ImageIcon className="w-6 h-6" /></div>
                      <div className="text-left"><div className="text-lg">Download PNG</div><div className="text-[10px] font-bold opacity-60 italic uppercase tracking-widest">Ultra High Fidelity</div></div>
                    </button>
                    <button onClick={() => { downloadTemplate(state); setIsExportModalOpen(false); triggerHaptic(15); }} className="group flex items-center gap-4 bg-zinc-800 p-5 rounded-2xl text-white font-bold border border-white/5 transition-all hover:bg-zinc-700 active:scale-95">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center"><Icons.Layout className="w-6 h-6" /></div>
                      <div className="text-left"><div className="text-lg">Export JSON</div><div className="text-[10px] font-bold opacity-60 italic uppercase tracking-widest">Mockingjay Raw File</div></div>
                    </button>
                  </div>
               </div>
               <button onClick={() => setIsExportModalOpen(false)} className="w-full py-5 text-white/30 text-xs font-bold uppercase tracking-widest border-t border-white/5 hover:text-white transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {(exportStatus === 'processing' || exportStatus === 'success') && (
          <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm animate-in fade-in duration-500">
            <div className={`absolute bottom-0 left-0 right-0 h-[35vh] rounded-t-[24px] shadow-[0_-20px_60px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center gap-6 p-8 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${exportStatus === 'processing' ? 'bg-[#F5E6D3] translate-y-0' : 'bg-[#EAE2D6] translate-y-0'}`}>
               <div className="relative">
                 {exportStatus === 'processing' ? (
                   <>
                     <div className="w-20 h-20 border-[3px] border-[#4A3F35]/10 border-t-[#4A3F35] rounded-full animate-spin"></div>
                     <div className="absolute inset-0 flex items-center justify-center text-[#4A3F35]">
                       <Icons.Download className="w-8 h-8 animate-bounce" />
                     </div>
                   </>
                 ) : (
                   <div className="w-20 h-20 bg-[#4A3F35] text-[#F5E6D3] rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-500">
                     <Icons.ThumbsUp className="w-10 h-10" />
                   </div>
                 )}
               </div>
               <div className="text-center space-y-1">
                 <h3 className="text-2xl font-light tracking-tight text-[#4A3F35] italic">
                   {exportStatus === 'processing' ? 'Downloading...' : 'Complete!'}
                 </h3>
                 <p className="text-[#4A3F35]/40 text-[11px] font-bold uppercase tracking-[0.2em]">
                   {exportStatus === 'processing' ? 'Encoding literal snapshot assets' : 'Your file has been saved'}
                 </p>
               </div>
            </div>
          </div>
        )}
      </div>

      {!isMobile && (
        <Sidebar 
          user={user}
          designs={designs}
          currentDesignId={currentDesignId}
          loadDesign={loadDesign}
          createNewDesign={createNewDesign}
          importDesign={() => fileInputRef.current?.click()}
          selectedElement={selectedElement} 
          themeColors={state.themeColors} 
          pages={state.pages} 
          currentPageIndex={state.currentPageIndex} 
          updateElement={updateElement} 
          updatePage={updatePage} 
          onReorder={onReorder} 
          recentImages={recentImages}
          isMobile={false}
          availableFonts={allFonts}
          onAddCustomFont={handleAddCustomFont}
          onDeleteCustomFont={handleDeleteCustomFont}
          onColorChange={(color) => { if (selectedElement) { const key = selectedElement.type === 'text' || selectedElement.type === 'icon' ? 'color' : 'backgroundColor'; updateElement(selectedElement.id, { style: { ...selectedElement.style, [key]: color } }); } }}
          onAddText={(type) => addElement({ type: 'text', name: type, content: type === 'Header' ? 'HEADER' : (type === 'Subheader' ? 'Subheader' : 'Paragraph text.'), style: { fontSize: type === 'Header' ? 42 : 24, fontFamily: allFonts[0].value, color: '#FFF', textAlign: 'center', lineHeight: 1.2, letterSpacing: 0, fontWeight: '700' }, box: { x: 30, y: 150, width: 300, height: 100, rotation: 0 } })}
          onAddShape={onAddShape}
          onAddImage={(src) => addElement({ type: 'image', name: 'Image', content: src, style: { borderRadius: 24 }, box: { x: 40, y: 200, width: 280, height: 400, rotation: 0 } })}
          onUpdateColors={(cols) => setState(p => ({ ...p, themeColors: cols }))}
        />
      )}
    </div>
  );
};

export default App;
