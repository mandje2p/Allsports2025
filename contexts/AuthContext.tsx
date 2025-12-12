
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Mock User Interface
interface User {
    uid: string;
    email: string | null;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string) => Promise<void>; // Simplified login
  signup: (email: string) => Promise<void>; // Simplified signup
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
    // Check local storage for a "mock session"
    const storedUser = localStorage.getItem('allsports_mock_user');
    if (storedUser) {
        try {
            setCurrentUser(JSON.parse(storedUser));
        } catch (e) {
            console.error("Failed to parse stored user", e);
            localStorage.removeItem('allsports_mock_user');
        }
    }
    setLoading(false);
  }, []);

  const login = async (email: string) => {
     // Mock Login
     const user = { uid: 'mock-user-123', email };
     setCurrentUser(user);
     localStorage.setItem('allsports_mock_user', JSON.stringify(user));
  };

  const signup = async (email: string) => {
     // Mock Signup
     const user = { uid: 'mock-user-123', email };
     setCurrentUser(user);
     localStorage.setItem('allsports_mock_user', JSON.stringify(user));
  };

  const loginWithGoogle = async () => {
      // Mock Google Login
      const user = { uid: 'mock-google-user', email: 'user@gmail.com' };
      setCurrentUser(user);
      localStorage.setItem('allsports_mock_user', JSON.stringify(user));
  };

  const logout = async () => {
      setCurrentUser(null);
      localStorage.removeItem('allsports_mock_user');
  };

  const value = {
    currentUser,
    loading,
    login,
    signup,
    logout,
    loginWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
