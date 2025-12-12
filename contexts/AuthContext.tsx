import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider, appleProvider } from '../config/firebase';

interface User {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  redirectLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Detect if user is on a mobile device
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Check for mobile user agents
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  
  // Also check for touch capability and screen size as additional indicators
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  
  return mobileRegex.test(userAgent.toLowerCase()) || (isTouchDevice && isSmallScreen);
};

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
  const [redirectLoading, setRedirectLoading] = useState(true);
  const redirectChecked = useRef(false);

  // Handle redirect result on mount (for mobile OAuth flow)
  useEffect(() => {
    const handleRedirectResult = async () => {
      // Prevent duplicate checks
      if (redirectChecked.current) return;
      redirectChecked.current = true;
      
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log('Redirect sign-in successful:', result.user.email);
          // User is already set by onAuthStateChanged, but we can confirm here
        }
      } catch (error: any) {
        console.error('Redirect result error:', error);
        // Common errors: popup_closed_by_user, cancelled_popup_request
        // These are usually not critical errors
      } finally {
        setRedirectLoading(false);
      }
    };

    handleRedirectResult();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setCurrentUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email
        });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    if (isMobileDevice()) {
      // Use redirect on mobile - this will navigate away from the page
      // and return after authentication
      await signInWithRedirect(auth, googleProvider);
    } else {
      // Use popup on desktop
      await signInWithPopup(auth, googleProvider);
    }
  };

  const loginWithApple = async () => {
    if (isMobileDevice()) {
      // Use redirect on mobile
      await signInWithRedirect(auth, appleProvider);
    } else {
      // Use popup on desktop
      await signInWithPopup(auth, appleProvider);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    currentUser,
    loading,
    redirectLoading,
    login,
    signup,
    logout,
    loginWithGoogle,
    loginWithApple
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
