
import { PosterConfig } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const generatePosterImage = async (
  config: PosterConfig, 
  style: 'stadium' | 'players' | 'abstract' | 'prestige' = 'stadium',
  getIdToken: () => Promise<string | null>
): Promise<string> => {
  try {
    const idToken = await getIdToken();
    if (!idToken) {
      throw new Error('Authentication required. Please sign in again.');
    }

    console.log(`[GEMINI] Generating image with style: ${style}`);

    const response = await fetch(`${API_BASE_URL}/api/generate-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config, style }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Check if we should redirect to subscription page (FREE user exceeded limit)
      if (errorData.redirectToSubscription) {
        const error: any = new Error(errorData.message || errorData.error || 'Generation limit reached');
        error.redirectToSubscription = true;
        error.remainingCredits = errorData.remainingCredits;
        error.monthlyCredits = errorData.monthlyCredits;
        error.usedCredits = errorData.usedCredits;
        throw error;
      }
      
      throw new Error(errorData.message || errorData.error || `Failed to generate image: ${response.statusText}`);
    }

    const data = await response.json();
    return data.imageUrl;
  } catch (error: any) {
    console.error('[GEMINI] Error generating image:', error);
    
    // Preserve redirect properties if they exist
    if (error.redirectToSubscription) {
      throw error; // Re-throw with all properties intact
    }
    
    throw new Error(error.message || 'Failed to generate image');
  }
};
    