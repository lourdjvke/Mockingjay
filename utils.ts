
export const generateId = () => Math.random().toString(36).substring(2, 11);

export const downloadTemplate = (state: any) => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mockingjay-template-${Date.now()}.json`;
  a.click();
};

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

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
