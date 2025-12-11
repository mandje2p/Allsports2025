
import { Match } from "../types";

export interface SavedPoster {
  id: string;
  match: Match;
  backgroundImage: string;
  finalPosterUrl?: string;
  style: 'stadium' | 'players' | 'abstract' | 'prestige';
  type?: 'program' | 'classic';
  createdAt: number;
}

export interface UserBackground {
  id: string;
  imageUrl: string;
  createdAt: number;
}

const DB_NAME = 'AllSportsDB';
const STORE_NAME = 'posters';
const BG_STORE_NAME = 'user_backgrounds';
const DB_VERSION = 3; // Bump version for new store

// Helper to open the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(BG_STORE_NAME)) {
        db.createObjectStore(BG_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const savePoster = async (poster: Omit<SavedPoster, 'id' | 'createdAt'>): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const newPoster: SavedPoster = {
      ...poster,
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(newPoster);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      request.onerror = (e) => reject((e.target as any).error);
    });
  } catch (error) {
    console.error("IndexedDB Save Poster Error:", error);
    throw new Error("Failed to save poster.");
  }
};

export const getSavedPosters = async (): Promise<SavedPoster[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result as SavedPoster[];
        results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("IndexedDB Read Posters Error:", error);
    return [];
  }
};

export const deletePoster = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("IndexedDB Delete Poster Error:", error);
    throw error;
  }
};

// --- User Backgrounds Functions ---

export const saveUserBackground = async (imageUrl: string): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(BG_STORE_NAME, 'readwrite');
    const store = tx.objectStore(BG_STORE_NAME);

    const newBg: UserBackground = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      imageUrl,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(newBg);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      request.onerror = (e) => reject((e.target as any).error);
    });
  } catch (error) {
    console.error("IndexedDB Save BG Error:", error);
    throw new Error("Failed to save background.");
  }
};

export const getUserBackgrounds = async (): Promise<UserBackground[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(BG_STORE_NAME, 'readonly');
    const store = tx.objectStore(BG_STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result as UserBackground[];
        results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("IndexedDB Read BG Error:", error);
    return [];
  }
};
