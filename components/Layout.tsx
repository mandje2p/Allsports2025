
import React from 'react';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const hideNavRoutes = ['/login', '/welcome', '/signup', '/onboarding'];
  const showNav = !hideNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-black flex justify-center overflow-hidden">
      <div className="w-full max-w-md bg-black relative flex flex-col h-[100dvh]">
        <main className={`flex-1 overflow-y-auto hide-scrollbar relative ${showNav ? 'pb-24' : 'pb-0'}`}>
          {children}
        </main>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
};
