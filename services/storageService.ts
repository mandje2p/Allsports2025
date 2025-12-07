

import { Match } from "../types";

export interface SavedPoster {
  id: string;
  match: Match;
  backgroundImage: string; // Base64 data (original background)
  finalPosterUrl?: string; // Base64 data (full composite with text/logos)
  style: 'stadium' | 'players';
  createdAt: number;
}

const STORAGE_KEY = 'allsports_gallery_v1';

export const savePoster = (poster: Omit<SavedPoster, 'id' | 'createdAt'>): void => {
  const current = getSavedPosters();
  const newPoster: SavedPoster = {
    ...poster,
    id: Date.now().toString() + Math.random().toString(36).substring(7),
    createdAt: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([newPoster, ...current]));
};

export const getSavedPosters = (): SavedPoster[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const deletePoster = (id: string): void => {
  const current = getSavedPosters();
  const updated = current.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};
