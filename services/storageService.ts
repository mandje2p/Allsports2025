
import { Match } from "../types";

export interface SavedPoster {
  id: string;
  match: Match;
  backgroundImage: string;
  finalPosterUrl?: string;
  style: 'stadium' | 'players';
  type?: 'program' | 'classic';
  createdAt: number;
}

const DB_NAME = 'AllSportsDB';
const STORE_NAME = 'posters';
const DB_VERSION = 2; // Bump version to force schema update

// Helper to open the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
      
      // Wait for transaction to complete to ensure data is committed
      tx.oncomplete = () => resolve();
      
      tx.onerror = () => reject(tx.error);
      request.onerror = (e) => {
          const error = (e.target as any).error;
          console.error("IndexedDB Add Error", error);
          reject(error);
      };
    });
  } catch (error) {
    console.error("IndexedDB Save Exception:", error);
    throw new Error("Failed to save poster to local database.");
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
        // Sort by createdAt desc (newest first)
        results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("IndexedDB Read Error:", error);
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
      
      // Wait for transaction to complete to ensure data is removed
      tx.oncomplete = () => resolve();
      
      tx.onerror = () => reject(tx.error);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("IndexedDB Delete Error:", error);
    throw error;
  }
};
