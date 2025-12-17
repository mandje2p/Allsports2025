const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface SavedPoster {
  id: string;
  match: {
    id: string;
    competition: string;
    date: string;
    time: string;
    homeTeam: {
      name: string;
      logoUrl?: string;
    };
    awayTeam: {
      name: string;
      logoUrl?: string;
    };
    venue?: string;
  };
  backgroundImage: string;
  finalPosterUrl: string;
  style: 'stadium' | 'players' | 'abstract' | 'prestige';
  type?: 'program' | 'classic';
  createdAt?: any;
}

export const posterService = {
  async savePoster(
    idToken: string,
    poster: Omit<SavedPoster, 'id' | 'createdAt'>
  ): Promise<SavedPoster> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/posters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(poster),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || `Failed to save poster: ${response.statusText}`);
      }

      const data = await response.json();
      return data.poster as SavedPoster;
    } catch (error) {
      console.error('[POSTER] Error saving poster:', error);
      throw error;
    }
  },

  async getPosters(idToken: string): Promise<SavedPoster[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/posters`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || `Failed to get posters: ${response.statusText}`);
      }

      const data = await response.json();
      return data.posters as SavedPoster[];
    } catch (error) {
      console.error('[POSTER] Error getting posters:', error);
      throw error;
    }
  },

  async deletePoster(idToken: string, posterId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/posters/${posterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || `Failed to delete poster: ${response.statusText}`);
      }
    } catch (error) {
      console.error('[POSTER] Error deleting poster:', error);
      throw error;
    }
  },
};







