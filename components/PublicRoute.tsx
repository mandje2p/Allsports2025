import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute - Redirects authenticated users away from auth pages
 * Use this for login, signup, welcome pages
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { currentUser, loading, redirectLoading } = useAuth();

  // Wait for both auth state and redirect result to be resolved
  if (loading || redirectLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is already authenticated, redirect to home
  if (currentUser) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};



