import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AUTH] AuthProvider mounted - Initializing auth state');
    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    // Set up auth state listener
    console.log('[AUTH] Setting up auth state listener...');
    unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[AUTH] Auth state changed:', user ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified
      } : 'No user');
      
      if (mounted) {
        setCurrentUser(user);
        setLoading(false);

        // Auto-create profile with demo data for new users
        if (user) {
          try {
            const idToken = await user.getIdToken();
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            
            // Try to get profile - backend will auto-create if it doesn't exist
            const response = await fetch(`${API_BASE_URL}/api/profile/${user.uid}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const profile = await response.json();
              console.log('[AUTH] Profile loaded/created for user:', user.uid, profile.name);
            } else if (response.status === 404) {
              // Profile doesn't exist - backend should have created it, but if not, log it
              console.log('[AUTH] Profile not found, should be auto-created on next access');
            }
          } catch (error) {
            // Silently fail - profile will be created when user accesses profile page
            console.warn('[AUTH] Could not auto-create profile (will be created on first access):', error);
          }
        }
      }
    });
    console.log('[AUTH] Auth state listener registered');
    
    return () => {
      console.log('[AUTH] AuthProvider unmounting - cleaning up');
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    console.log('[AUTH] ========== loginWithGoogle called ==========');
    console.log('[AUTH] Current URL:', window.location.href);
    console.log('[AUTH] Current origin:', window.location.origin);
    console.log('[AUTH] Current hostname:', window.location.hostname);
    console.log('[AUTH] Auth instance:', auth ? 'Initialized' : 'Not initialized');
    console.log('[AUTH] Google provider:', googleProvider ? 'Initialized' : 'Not initialized');
    console.log('[AUTH] Current user before popup:', auth?.currentUser ? {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email
    } : 'No user');
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      const error = new Error('Window object not available - not in browser environment');
      console.error('[AUTH] ✗', error.message);
      throw error;
    }
    
    try {
      console.log('[AUTH] Calling signInWithPopup with:', {
        authName: auth.name,
        providerId: googleProvider.providerId
      });
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[AUTH] ✓ signInWithPopup completed successfully');
      console.log('[AUTH] Popup result:', {
        user: result.user ? {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName
        } : null,
        providerId: result.providerId,
        operationType: result.operationType
      });
      console.log('[AUTH] ============================================');
    } catch (error: any) {
      console.error('[AUTH] ✗ Error in signInWithPopup:', error);
      console.error('[AUTH] Error details:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        customData: error?.customData
      });
      
      // Common error codes
      if (error?.code === 'auth/popup-closed-by-user') {
        console.error('[AUTH] ⚠️ POPUP CLOSED BY USER');
        console.error('[AUTH] User closed the popup window before completing authentication');
      } else if (error?.code === 'auth/popup-blocked') {
        console.error('[AUTH] ⚠️ POPUP BLOCKED');
        console.error('[AUTH] Browser blocked the popup. Please allow popups for this site.');
      } else if (error?.code === 'auth/unauthorized-domain') {
        console.error('[AUTH] ⚠️ UNAUTHORIZED DOMAIN ERROR');
        console.error('[AUTH] Your domain', window.location.hostname, 'is not authorized in Firebase Console');
        console.error('[AUTH] Go to Firebase Console > Authentication > Settings > Authorized domains');
        console.error('[AUTH] Add', window.location.hostname, 'to the list');
      }
      
      console.error('[AUTH] ============================================');
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!currentUser) {
      return null;
    }
    try {
      const token = await currentUser.getIdToken();
      return token;
    } catch (error) {
      console.error('[AUTH] Error getting ID token:', error);
      return null;
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    signup,
    logout,
    loginWithGoogle,
    getIdToken
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
