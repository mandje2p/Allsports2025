
import React from 'react';
import { StickyHeader } from '../components/StickyHeader';
import { useLanguage } from '../contexts/LanguageContext';

export const Badges: React.FC = () => {
  const { t } = useLanguage();

  // URL de l'image du badge
  const BADGE_IMAGE = "https://all-sports.co/app/img/badges/badge-C1.png";

  // Configuration des badges selon la demande
  const allBadges = [
    { 
      id: 1, 
      imageUrl: BADGE_IMAGE, 
      topText: "ROI EUROPÉEN", 
      bottomText: "LVL 3", 
      active: true 
    },
    // Génération de 7 autres badges bloqués identiques
    ...Array.from({ length: 7 }).map((_, i) => ({
      id: i + 2,
      imageUrl: BADGE_IMAGE,
      topText: "BLOQUÉ",
      bottomText: "",
      active: false
    }))
  ];

  return (
    <div className="min-h-screen bg-black text-white fade-in">
      <StickyHeader />

      {/* Increased padding-top to 56 - Reduced spacing */}
      <div className="pt-[160px] px-4 pb-24">
        {/* Grid: 4 columns, gap-x-0 for horizontal, reduced gap-y-0.5 for vertical spacing */}
        <div className="grid grid-cols-4 gap-x-0 gap-y-0.5">
            {allBadges.map((badge) => (
                <div 
                    key={badge.id}
                    className="relative w-full aspect-[2.5/4] flex items-center justify-center"
                >
                    {/* Image Full Size - Acts as background */}
                    <img 
                        src={badge.imageUrl} 
                        alt="Badge"
                        className={`absolute inset-0 w-full h-full object-contain drop-shadow-2xl ${!badge.active ? 'grayscale opacity-30' : ''}`}
                    />
                    
                    {/* Overlay Text */}
                    <div className="relative z-10 flex flex-col items-center justify-center mt-6 w-full px-1">
                        <span className="text-[9px] font-bold uppercase text-center leading-tight text-white drop-shadow-md font-['Syne'] break-words w-full">
                            {/* Explicitly mapping words to ensure multi-line if more than 1 word */}
                            {badge.topText.split(' ').map((word, i) => (
                                <React.Fragment key={i}>
                                    {word}
                                    {i < badge.topText.split(' ').length - 1 && <br />}
                                </React.Fragment>
                            ))}
                        </span>
                        {badge.bottomText && (
                            <span className="text-[8px] font-bold text-gray-200 mt-1 font-['Syne'] drop-shadow-sm">
                                {badge.bottomText}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
