
export const generateId = () => Math.random().toString(36).substring(2, 11);

/**
 * Sanitizes AI response text to extract valid JSON.
 * Strips markdown code fences, leading/trailing text, and other non-JSON content.
 */
export const sanitizeAiJson = (raw: string): string => {
  let cleaned = raw.trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  // Find the first { and last } to extract the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    // No valid JSON object found, return original for error handling downstream
    return cleaned;
  }

  return cleaned.substring(firstBrace, lastBrace + 1);
};

export const downloadTemplate = (state: any) => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mockingjay-template-${Date.now()}.json`;
  a.click();
};

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

/**
 * Fetches Google Fonts CSS, downloads font binaries, and returns inline @font-face CSS
 * with base64-encoded font data. This enables modern-screenshot to embed fonts in exports.
 */
export const embedGoogleFonts = async (googleFontsCssUrl: string): Promise<string> => {
  try {
    // Fetch the CSS with a user-agent that triggers woff2 URLs
    const cssResponse = await fetch(googleFontsCssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!cssResponse.ok) return '';
    const cssText = await cssResponse.text();

    // Parse all @font-face blocks and extract URLs
    const fontFaceRegex = /@font-face\s*\{[^}]+\}/g;
    const urlRegex = /url\(([^)]+)\)/g;

    const fontFaces = cssText.match(fontFaceRegex);
    if (!fontFaces) return '';

    let inlineCss = '';

    for (const block of fontFaces) {
      let inlineBlock = block;
      const urls: string[] = [];

      let match;
      while ((match = urlRegex.exec(block)) !== null) {
        urls.push(match[1]);
      }

      for (const url of urls) {
        try {
          const fontResponse = await fetch(url);
          if (!fontResponse.ok) continue;
          const buffer = await fontResponse.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          const format = url.includes('.woff2') ? 'woff2' : (url.includes('.woff') ? 'woff' : 'truetype');
          inlineBlock = inlineBlock.replace(`url(${url})`, `url(data:font/${format};base64,${base64})`);
        } catch {
          // Skip individual font files that fail
          continue;
        }
      }
      inlineCss += inlineBlock + '\n';
    }

    return inlineCss;
  } catch (err) {
    console.error('Font embedding failed:', err);
    return '';
  }
};

// IndexedDB Font Store
const DB_NAME = 'MockingjayFonts';
const FONT_STORE_NAME = 'fonts';

export const FontStore = {
  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(FONT_STORE_NAME)) {
          request.result.createObjectStore(FONT_STORE_NAME, { keyPath: 'name' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveFont(name: string, data: ArrayBuffer): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FONT_STORE_NAME, 'readwrite');
      tx.objectStore(FONT_STORE_NAME).put({ name, data });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getFonts(): Promise<{ name: string; data: ArrayBuffer }[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FONT_STORE_NAME, 'readonly');
      const request = tx.objectStore(FONT_STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteFont(name: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(FONT_STORE_NAME, 'readwrite');
      tx.objectStore(FONT_STORE_NAME).delete(name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
};

// IndexedDB Media Store
const MEDIA_DB_NAME = 'MockingjayMedia';
const MEDIA_STORE_NAME = 'recentImages';

export const MediaStore = {
  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(MEDIA_DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(MEDIA_STORE_NAME)) {
          request.result.createObjectStore(MEDIA_STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveImage(data: string): Promise<void> {
    const db = await this.init();
    const images = await this.getImages();
    
    // Don't save if duplicate content exists
    if (images.find(img => img.data === data)) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE_NAME, 'readwrite');
      const store = tx.objectStore(MEDIA_STORE_NAME);
      
      store.add({ data, timestamp: Date.now() });
      
      tx.oncomplete = async () => {
        const all = await this.getImages();
        if (all.length > 3) {
           // Sort by timestamp and keep only the latest 3
           const sorted = all.sort((a, b) => b.timestamp - a.timestamp);
           const toDelete = sorted.slice(3);
           const delTx = db.transaction(MEDIA_STORE_NAME, 'readwrite');
           const delStore = delTx.objectStore(MEDIA_STORE_NAME);
           toDelete.forEach(item => delStore.delete(item.id));
        }
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  async getImages(): Promise<{ id: number; data: string; timestamp: number }[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE_NAME, 'readonly');
      const request = tx.objectStore(MEDIA_STORE_NAME).getAll();
      request.onsuccess = () => {
        const sorted = request.result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  }
};
