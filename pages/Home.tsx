
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StickyHeader } from '../components/StickyHeader';
import { useLanguage } from '../contexts/LanguageContext';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const leagueData = [
    {
      id: 1,
      targetId: '61', // Ligue 1
      title: t('banner_l1_title'),
      description: t('banner_l1_desc'),
      image: "https://all-sports.co/app/img/home/ligue1.png",
    },
    {
      id: 2,
      targetId: '39', // Premier League
      title: t('banner_pl_title'),
      description: t('banner_pl_desc'),
      image: "https://all-sports.co/app/img/home/premiereleague.png",
    },
    {
      id: 3,
      targetId: '2', // Champions League
      title: t('banner_c1_title'),
      description: t('banner_c1_desc'),
      image: "https://all-sports.co/app/img/home/c1.png",
    },
    {
      id: 4,
      targetId: '3', // Europa League
      title: t('banner_c3_title'),
      description: t('banner_c3_desc'),
      image: "https://all-sports.co/app/img/home/c3.png",
    },
  ];

  return (
    <div className="w-full min-h-screen bg-black text-white fade-in">
      {/* Fixed Header */}
      <StickyHeader />

      {/* Scrollable Content with reduced top padding */}
      <div className="pt-[124px] px-4 flex flex-col gap-4">
        {leagueData.map((league) => (
          <article
            key={league.id}
            className="relative w-full h-[168px] rounded-[30px] overflow-hidden shrink-0 group cursor-pointer"
            onClick={() => navigate(`/calendar/${league.targetId}`)}
          >
            {/* Background Image */}
            <div className="absolute inset-0 bg-gray-900">
                 <img
                    className="w-full h-full object-cover"
                    alt={`${league.title} banner`}
                    src={league.image}
                />
            </div>
            
            {/* Content Container - Reduced sizes */}
            <div className="absolute bottom-0 left-0 p-5 w-full z-10">
                {/* Title */}
                <h2 
                    className="text-lg font-bold text-white mb-1"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                >
                    {league.title}
                </h2>

                {/* Description - Forced wrap with max-width */}
                <p className="text-[9px] text-gray-200 mb-2 max-w-[120px] leading-tight drop-shadow-md">
                    {league.description}
                </p>

                {/* Button - Syne font, increased padding */}
                <div 
                  className="bg-white text-black text-[9px] font-bold px-5 py-2 rounded-full inline-block mt-1"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                    {t('btn_create')}
                </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
