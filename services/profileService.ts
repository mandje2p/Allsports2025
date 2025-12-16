const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface UserProfile {
  name: string;
  companyName: string;
  companyAddress: string;
  email: string;
  avatarUrl: string;
  subscription?: 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM'; // Optional - not set during onboarding
}

export const profileService = {
  async getProfile(userId: string, idToken: string): Promise<UserProfile | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Profile doesn't exist yet
        }
        throw new Error(`Failed to get profile: ${response.statusText}`);
      }

      const data = await response.json();
      return data as UserProfile;
    } catch (error) {
      console.error('[PROFILE] Error getting profile:', error);
      throw error;
    }
  },

  async saveProfile(userId: string, idToken: string, profile: UserProfile): Promise<UserProfile> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        // Create error object with translation data if available
        const error = new Error(errorData.message || errorData.error || `Failed to save profile: ${response.statusText}`);
        // Attach translation data for frontend to use
        if (errorData.translationKey) {
          (error as any).translationKey = errorData.translationKey;
          (error as any).daysRemaining = errorData.daysRemaining;
        }
        throw error;
      }

      const data = await response.json();
      return data.profile as UserProfile;
    } catch (error) {
      console.error('[PROFILE] Error saving profile:', error);
      throw error;
    }
  },
};






