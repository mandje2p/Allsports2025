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
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-sm">Loading...</div>
      </div>
    );
  }

  // If user is already authenticated, redirect to home
  if (currentUser) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};


