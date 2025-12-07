
import React from 'react';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  // Only hide on specific auth/intro pages. 
  // It will show on '/' and '/home' automatically as they are not in this list.
  const hideNavRoutes = ['/login', '/welcome'];
  const showNav = !hideNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-black flex justify-center overflow-hidden">
      {/* Mobile container constraint 
          Changed h-screen to h-[100dvh] to fix mobile browser bottom bar issues 
          Removed border-x and shadow-2xl for borderless look
      */}
      <div className="w-full max-w-md bg-black relative flex flex-col h-[100dvh]">
        
        {/* Content Area 
            Reduced pb to pb-24 to minimize empty space at bottom while keeping nav accessible
        */}
        <main className="flex-1 overflow-y-auto hide-scrollbar pb-24 relative">
          {children}
        </main>

        {/* Bottom Navigation */}
        {showNav && <BottomNav />}
      </div>
    </div>
  );
};
