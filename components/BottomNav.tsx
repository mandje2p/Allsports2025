
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Trophy, PlusSquare, Image as ImageIcon, User } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { icon: Home, path: '/home', label: t('nav_home') },
    { icon: Trophy, path: '/disciplines', label: t('nav_sports') },
    // Direct link to competitions/football for the Create button
    { icon: PlusSquare, path: '/competitions/football', label: t('nav_create') }, 
    { icon: ImageIcon, path: '/gallery', label: t('nav_gallery') },
    { icon: User, path: '/profile', label: t('nav_profile') },
  ];

  const isCreateFlow = (path: string) => {
    return path.startsWith('/competitions') || 
           path.startsWith('/calendar') || 
           path.startsWith('/generator') || 
           path.startsWith('/backgrounds');
  };

  return (
    <div className="absolute bottom-0 left-0 w-full bg-black px-6 pt-5 pb-[calc(env(safe-area-inset-bottom)+5px)] flex justify-between items-center z-[100]">
      {navItems.map((item) => {
        let isActive = location.pathname === item.path;
        
        // Special case for the Create flow (Plus icon)
        // Check if this is the Create button AND we are in the create flow
        if (item.label === t('nav_create') && isCreateFlow(location.pathname)) {
            isActive = true;
        }
        
        // Avoid double activation if both Sports and Create might overlap (though paths are different now)
        if (item.label === t('nav_sports') && isActive && isCreateFlow(location.pathname)) {
            isActive = false;
        }

        return (
          <button
            key={`${item.path}-${item.label}`}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center transition-colors relative h-10 w-10`}
          >
            <item.icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2} 
                className={isActive ? 'text-white' : 'text-gray-500'}
            />
            {isActive && (
                <div className="absolute -bottom-2 w-5 h-0.5 bg-white rounded-full"></div>
            )}
          </button>
        );
      })}
    </div>
  );
};
