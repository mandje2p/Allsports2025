
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StickyHeader } from '../components/StickyHeader';
import { useLanguage } from '../contexts/LanguageContext';

interface CompetitionGroup {
  countryKey: string;
  flag: string;
  leagues: {
    id: string;
    name: string;
    imageUrl: string;
  }[];
}

// Data mapping using keys for translation
const COMPETITIONS_DATA: CompetitionGroup[] = [
  {
    countryKey: "country_france",
    flag: "🇫🇷",
    leagues: [
      { id: '61', name: "Ligue 1", imageUrl: "https://all-sports.co/app/img/leagues/Icons-Ligue1.png" },
      { id: '66', name: "Coupe de France", imageUrl: "https://all-sports.co/app/img/leagues/Icons-Coupe-France.png" }
    ]
  },
  {
    countryKey: "country_england",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    leagues: [
      { id: '39', name: "Premier League", imageUrl: "https://all-sports.co/app/img/leagues/Icons-PremierLeague.png" },
      { id: '45', name: "Coupe d'Angleterre", imageUrl: "https://all-sports.co/app/img/leagues/Icons-Coupe-England.png" }
    ]
  },
  {
    countryKey: "country_spain",
    flag: "🇪🇸",
    leagues: [
      { id: '140', name: "La Liga", imageUrl: "https://all-sports.co/app/img/leagues/Icons-LaLiga.png" },
      { id: '143', name: "Coupe d'Espagne", imageUrl: "https://all-sports.co/app/img/leagues/Icons-Coupe-Espagne.png" }
    ]
  },
  {
    countryKey: "country_italy",
    flag: "🇮🇹",
    leagues: [
      { id: '135', name: "Serie A", imageUrl: "https://all-sports.co/app/img/leagues/Icons-SerieA.png" },
      { id: '137', name: "Coupe d'Italie", imageUrl: "https://all-sports.co/app/img/leagues/Icons-Coupe-Italie.png" }
    ]
  },
  {
    countryKey: "country_germany",
    flag: "🇩🇪",
    leagues: [
      { id: '78', name: "Bundesliga", imageUrl: "https://all-sports.co/app/img/leagues/Icons-Bundesliga.png" },
      { id: '81', name: "Coupe d'Allemagne", imageUrl: "https://all-sports.co/app/img/leagues/Icons-Coupe-Allemagne.png" }
    ]
  },
  {
    countryKey: "country_portugal",
    flag: "🇵🇹",
    leagues: [
      { id: '94', name: "Primeira Liga", imageUrl: "https://all-sports.co/app/img/leagues/Icons-LigaPortugal.png" },
      { id: '96', name: "Coupe du Portugal", imageUrl: "https://all-sports.co/app/img/leagues/Icons-Coupe-Portugal.png" }
    ]
  },
  {
    countryKey: "country_netherlands",
    flag: "🇳🇱",
    leagues: [
      { id: '88', name: "Eredivisie", imageUrl: "https://all-sports.co/app/img/leagues/Icons-Eredivisie.png" },
      { id: '90', name: "Coupe des Pays-Bas", imageUrl: "https://all-sports.co/app/img/leagues/Icons-Coupe-PaysBas.png" }
    ]
  },
  {
    countryKey: "country_belgium",
    flag: "🇧🇪",
    leagues: [
      { id: '144', name: "Jupiler Pro League", imageUrl: "https://all-sports.co/app/img/leagues/Icons-JupilerPro.png" },
      { id: '146', name: "Coupe de Belgique", imageUrl: "https://all-sports.co/app/img/leagues/Icons-Coupe-Belgique.png" }
    ]
  },
  {
    countryKey: "region_big_competitions",
    flag: "🌍",
    leagues: [
      { id: '2', name: "Champions League", imageUrl: "https://all-sports.co/app/img/leagues/Icons-C1.png" },
      { id: '3', name: "Europa League", imageUrl: "https://all-sports.co/app/img/leagues/Icons-C3.png" },
      { id: '1', name: "Coupe du Monde", imageUrl: "https://all-sports.co/app/img/leagues/Icons-Worldcup.png" },
      { id: '4', name: "Euro", imageUrl: "https://all-sports.co/app/img/leagues/Icons-Euro.png" },
      { id: '5', name: "Ligue des Nations", imageUrl: "https://all-sports.co/app/img/leagues/Icons-NationsLeague.png" },
      { id: '6', name: "CAN", imageUrl: "https://all-sports.co/app/img/leagues/Icons-CAN.png" },
      { id: '9', name: "Copa America", imageUrl: "https://all-sports.co/app/img/leagues/Icons-COPA.png" }
    ]
  }
];

export const Competitions: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLeagueSelect = (leagueId: string) => {
    navigate(`/calendar/${leagueId}`);
  };

  return (
    <div className="min-h-screen bg-black fade-in text-white">
      {/* Removed Title */}
      <StickyHeader />

      {/* Increased top padding to 48 - Reduced spacing */}
      <div className="pt-[145px] px-6 pb-24 flex flex-col gap-8">
        {COMPETITIONS_DATA.map((group) => (
          <div key={group.countryKey} className="w-full">
            {/* Country Header */}
            <div className="flex items-center gap-3 mb-4">
               <span className="text-xl">{group.flag}</span>
               <h3 
                 style={{ fontFamily: "'Syne', sans-serif" }}
                 className="text-sm font-bold uppercase tracking-wide text-white"
               >
                 {t(group.countryKey)}
               </h3>
            </div>

            {/* Grid of Leagues - Icons only, no background/border */}
            <div className="grid grid-cols-2 gap-4">
              {group.leagues.map((league) => (
                <button
                  key={league.id}
                  onClick={() => handleLeagueSelect(league.id)}
                  className="relative w-full aspect-square flex items-center justify-center active:scale-95 transition-transform"
                >
                  <img 
                    src={league.imageUrl} 
                    alt={league.name}
                    className="w-full h-full object-contain drop-shadow-lg"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
