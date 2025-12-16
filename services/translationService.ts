const STORAGE_KEY = 'allsports_user_translations';

export interface UserTranslations {
  [language: string]: {
    [key: string]: string;
  };
}

export const translationService = {
  /**
   * Get user's custom translations from localStorage
   */
  getUserTranslations(): UserTranslations {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return {};
      }
      return JSON.parse(stored) || {};
    } catch (error) {
      console.error('[TRANSLATION] Error getting user translations from localStorage:', error);
      return {};
    }
  },

  /**
   * Save user's custom translations to localStorage
   */
  saveUserTranslations(translations: UserTranslations): UserTranslations {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(translations));
      return translations;
    } catch (error) {
      console.error('[TRANSLATION] Error saving user translations to localStorage:', error);
      throw error;
    }
  },

  /**
   * Update a specific translation key for a language
   */
  updateTranslation(language: string, key: string, value: string): UserTranslations {
    try {
      // Get existing translations
      const existing = this.getUserTranslations();
      
      // Ensure the structure exists
      if (!existing[language]) {
        existing[language] = {};
      }
      existing[language][key] = value;

      // Save updated translations
      return this.saveUserTranslations(existing);
    } catch (error) {
      console.error('[TRANSLATION] Error updating translation:', error);
      throw error;
    }
  },
};
