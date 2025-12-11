
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SportType } from '../types';
import { StickyHeader } from '../components/StickyHeader';
import { useLanguage } from '../contexts/LanguageContext';

const SportCard: React.FC<{
  sportName: string; // Translated name
  image: string;
  isAvailable?: boolean;
  onSelect?: () => void;
}> = ({ sportName, image, isAvailable = false, onSelect }) => {
  const { t } = useLanguage();

  return (
    <div 
      onClick={isAvailable ? onSelect : undefined}
      className={`relative w-full h-48 rounded-3xl overflow-hidden mb-4 group ${isAvailable ? 'cursor-pointer' : ''}`}
    >
      {/* Image Layer - Grayscale if not available */}
      <img 
        src={image} 
        alt={sportName} 
        className={`absolute inset-0 w-full h-full object-cover ${!isAvailable ? 'grayscale' : ''}`} 
      />
      
      <div className="absolute bottom-0 left-0 p-5 w-full">
        <h3 
          className="text-lg font-bold text-white mb-1"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {sportName}
        </h3>
        {isAvailable ? (
          <>
            <p className="text-[9px] text-gray-300 mb-2 max-w-[120px] leading-tight">{t('sport_available_desc')}</p>
            <div 
              className="bg-white text-black text-[9px] font-bold px-5 py-2 rounded-full inline-block mt-1"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {t('btn_create')}
            </div>
          </>
        ) : (
          <>
             <p className="text-[9px] text-gray-300 mb-2 max-w-[120px] leading-tight">{t('sport_soon_desc')}</p>
             <div 
              className="bg-black text-white text-[9px] font-bold px-5 py-2 rounded-full inline-block mt-1 border border-white/10"
              style={{ fontFamily: "'Syne', sans-serif" }}
             >
              {t('btn_coming_soon')}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const Disciplines: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-black fade-in">
      <StickyHeader />

      {/* Increased top padding to 44 for PWA clearance - Reduced for better spacing */}
      <div className="pt-[129px] px-6 flex flex-col">
        <SportCard 
          sportName={t('sport_football')}
          image="https://all-sports.co/app/img/sports/football.png"
          isAvailable={true}
          onSelect={() => navigate('/competitions/football')}
        />
        <SportCard 
          sportName={t('sport_basketball')}
          image="https://all-sports.co/app/img/sports/basket.png"
          isAvailable={false}
        />
        <SportCard 
          sportName={t('sport_fighting')}
          image="https://all-sports.co/app/img/sports/fighting.png"
          isAvailable={false}
        />
        <SportCard 
          sportName={t('sport_tennis')}
          image="https://all-sports.co/app/img/sports/tennis.png"
          isAvailable={false}
        />
      </div>
    </div>
  );
};
