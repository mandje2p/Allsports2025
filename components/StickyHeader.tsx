import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { ChevronDown } from 'lucide-react';

interface StickyHeaderProps {
  title?: string;
  subtitle?: string; 
  showLogo?: boolean;
  rightAction?: React.ReactNode;
  headerMiddle?: React.ReactNode; 
  isHomeStyle?: boolean; 
}

export const StickyHeader: React.FC<StickyHeaderProps> = ({ 
  title, 
  subtitle,
  showLogo = true, 
  rightAction,
  headerMiddle,
  isHomeStyle = true
}) => {
  const [logoError, setLogoError] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => setIsLangMenuOpen(!isLangMenuOpen);

  const selectLanguage = (lang: 'FR' | 'EN' | 'SP') => {
    setLanguage(lang);
    setIsLangMenuOpen(false);
  };

  return (
    // Updated padding-top to respect safe-area-inset-top for iPhone PWA fullscreen mode
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5 pt-[calc(max(3rem,env(safe-area-inset-top)+1rem))] pb-4 px-6 max-w-md mx-auto transition-all duration-200 shadow-lg">
      <div className="flex items-center justify-between h-12">
        {/* Left Side: Logo */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {showLogo && (
            <div onClick={() => navigate('/home')} className="cursor-pointer h-10 flex items-center shrink-0">
               {!logoError ? (
                <img 
                  src="https://all-sports.co/app/img/Allsports-logo.png" 
                  alt="All Sports" 
                  className="h-full object-contain" 
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="font-black italic text-xl tracking-tighter text-white">ALL <span className="font-light">SPORTS</span></span>
              )}
            </div>
          )}
          
          {title && (
            <h1 className="text-xl font-bold font-['Syne'] uppercase tracking-wide text-white truncate">
              {title}
            </h1>
          )}
          
          {headerMiddle && (
            <div className="flex-1 min-w-0">
                {headerMiddle}
            </div>
          )}
        </div>

        {/* Right Side: Language Selector or Custom Action */}
        <div className="flex flex-col items-end justify-center shrink-0 ml-2 relative">
           {rightAction ? (
             rightAction
           ) : (
             <div className="relative z-50">
               <button 
                onClick={toggleLanguage}
                className="flex items-center justify-center gap-1 transition-colors outline-none bg-black px-2 py-1"
               >
                 <span className="text-xs font-bold text-white font-['Montserrat']">{language}</span>
                 <ChevronDown size={12} className={`text-white transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
               </button>

               {isLangMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)}></div>
                   <div className="absolute top-full right-0 mt-2 w-20 bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 flex flex-col">
                     {['FR', 'EN', 'SP'].map((lang) => (
                       <button
                         key={lang}
                         onClick={() => selectLanguage(lang as any)}
                         className={`px-3 py-2 text-xs font-bold text-center hover:bg-white/10 transition-colors font-['Montserrat'] ${language === lang ? 'text-white bg-white/5' : 'text-gray-500'}`}
                       >
                         {lang}
                       </button>
                     ))}
                   </div>
                 </>
               )}
             </div>
           )}
        </div>
      </div>
    </header>
  );
};