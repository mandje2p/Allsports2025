import { PosterConfig } from "../types";
import { auth } from "../config/firebase";

// Backend API URL - configured via environment variable
// In production with Docker, use empty string to use relative URLs (nginx proxy)
// In development, use the full backend URL
const API_URL = import.meta.env.VITE_BACKEND_URL || '';

/**
 * Check if we're in development mode
 */
const isDev = () => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

/**
 * Get Firebase ID token for authenticated API calls
 */
const getAuthToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Authentication required. Please log in to generate posters.");
  }
  
  try {
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    throw new Error("Failed to get authentication token. Please try logging in again.");
  }
};

/**
 * Make authenticated API call to backend
 */
const apiCall = async <T>(endpoint: string, body: object): Promise<T> => {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || data.message || 'API request failed');
  }
  
  return data;
};

interface GenerateImageResponse {
  success: boolean;
  image?: string;
  error?: string;
}

/**
 * Generate a poster background image via backend API
 * The backend handles Gemini API calls securely with server-side API key
 */
export const generatePosterImage = async (
  config: PosterConfig, 
  style: 'stadium' | 'players' | 'abstract' | 'prestige' = 'stadium'
): Promise<string> => {
  if (isDev()) {
    console.log(`[Gemini] Generating ${style} poster for ${config.teamA} vs ${config.teamB}`);
  }
  
  try {
    const response = await apiCall<GenerateImageResponse>('/api/gemini/generate-match-background', {
      homeTeam: config.teamA,
      awayTeam: config.teamB,
      style,
    });
    
    if (response.success && response.image) {
      if (isDev()) {
        console.log('[Gemini] Image generated successfully');
      }
      return response.image;
    }
    
    throw new Error(response.error || 'Failed to generate image');
  } catch (error: any) {
    if (isDev()) {
      console.error('[Gemini] Error:', error.message);
    }
    throw error;
  }
};

/**
 * Generate a program poster background via backend API
 */
export const generateProgramBackground = async (matchCount: number): Promise<string> => {
  if (isDev()) {
    console.log(`[Gemini] Generating program background for ${matchCount} matches`);
  }
  
  try {
    const response = await apiCall<GenerateImageResponse>('/api/gemini/generate-program-background', {
      matchCount,
    });
    
    if (response.success && response.image) {
      if (isDev()) {
        console.log('[Gemini] Program background generated successfully');
      }
      return response.image;
    }
    
    throw new Error(response.error || 'Failed to generate program background');
  } catch (error: any) {
    if (isDev()) {
      console.error('[Gemini] Error:', error.message);
    }
    throw error;
  }
};
