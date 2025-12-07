
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CalendarDays, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { getMatchesForLeague } from '../services/sportsService';
import { Match } from '../types';
import { Button } from '../components/Button';
import { StickyHeader } from '../components/StickyHeader';
import { useLanguage } from '../contexts/LanguageContext';

const LEAGUES = [
    { id: '61', name: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png' },
    { id: '39', name: 'Premier League', logo: 'https://media.api-sports.io/football/leagues/39.png' },
    { id: '140', name: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png' },
    { id: '135', name: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png' },
    { id: '78', name: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png' },
    { id: '94', name: 'Primeira Liga', logo: 'https://media.api-sports.io/football/leagues/94.png' },
    { id: '2', name: 'Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png' },
    { id: '3', name: 'Europa League', logo: 'https://media.api-sports.io/football/leagues/3.png' },
];

export const MatchCalendar: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [uniqueDates, setUniqueDates] = useState<string[]>([]);
  const [dateIndex, setDateIndex] = useState<number>(-1);
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isLeagueSelectorOpen, setIsLeagueSelectorOpen] = useState(false);

  useEffect(() => {
    if (leagueId) {
        loadData(leagueId);
    }
  }, [leagueId]);

  const loadData = async (id: string) => {
    setIsLoading(true);
    try {
        const { dates, matches } = await getMatchesForLeague(id);
        setAllMatches(matches);
        setUniqueDates(dates);

        const targetDate = "2025-12-06"; // Target 2025 date
        const today = new Date().toISOString().split('T')[0];
        
        let initialIndex = dates.findIndex(d => d === targetDate);
        if (initialIndex === -1) {
             initialIndex = dates.findIndex(d => d >= today);
        }
        
        setDateIndex(initialIndex >= 0 ? initialIndex : 0);

    } catch (err) {
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  const toggleSelection = (matchId: string) => {
    const newSet = new Set(selectedMatches);
    if (newSet.has(matchId)) {
        newSet.delete(matchId);
    } else {
        newSet.add(matchId);
    }
    setSelectedMatches(newSet);
  };

  const handleGenerate = () => {
    if (selectedMatches.size === 0) return;
    const matchesToSend = allMatches.filter(m => selectedMatches.has(m.id));
    if (matchesToSend.length > 0) {
        navigate('/generator', { state: { matches: matchesToSend } });
    }
  };

  const handlePrevDay = () => {
    if (dateIndex > 0) setDateIndex(dateIndex - 1);
  };

  const handleNextDay = () => {
    if (dateIndex < uniqueDates.length - 1) setDateIndex(dateIndex + 1);
  };

  const handleLeagueChange = (newId: string) => {
      if (newId !== leagueId) {
          navigate(`/calendar/${newId}`);
      }
      setIsLeagueSelectorOpen(false);
  };

  const currentDate = uniqueDates[dateIndex];
  
  // Filtering and Sorting logic
  const currentMatches = allMatches.filter(m => {
      if (m.date !== currentDate) return false;
      
      // Filter out past matches based on Time
      // Construct a Date object from the match date and time
      const matchDateTime = new Date(`${m.date}T${m.time}`);
      const now = new Date();
      
      // Since mock data is in 2025, they are all in future relative to "now".
      // But adhering to the logic requested: "lorsque le match est passé, il n'est plus visible"
      return matchDateTime > now;
  }).sort((a, b) => {
      // Sort by Time ascending
      return a.time.localeCompare(b.time);
  });

  const currentLeague = LEAGUES.find(l => l.id === leagueId) || LEAGUES[0];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    // Formats date to short style: SAM 6 DÉC
    const date = new Date(dateStr);
    const str = date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    // Remove periods and uppercase
    return str.replace(/\./g, '').toUpperCase();
  };

  return (
    <div className="bg-black text-white fade-in min-h-screen flex flex-col">
       <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;700;900&display=swap');
      `}</style>

      {/* Top Header: Logo - Sticky */}
      <StickyHeader 
        showLogo={true}
      />

      {/* Content Container - Adjusted pt to move secondary toolbar up by 3px (150 - 3 = 147) */}
      <div className="pt-[147px] pb-24 flex-1 flex flex-col">
          
          {/* Secondary Toolbar: Date Nav & League Selector - STATIC (Scrolls with page) */}
          <div className="bg-black/95 backdrop-blur-md px-4 py-3 w-full flex items-center justify-between border-b border-white/5 shadow-md h-16 shrink-0 relative z-30">
              
              {/* Date Navigation - Centered, Syne Font, UPPERCASE */}
              <div className="flex items-center justify-center gap-2 flex-1 pr-2">
                  <button 
                      onClick={handlePrevDay}
                      disabled={dateIndex === 0}
                      className={`p-2 rounded-full transition-colors ${dateIndex === 0 ? 'text-gray-800' : 'text-white hover:bg-white/10'}`}
                  >
                      <ChevronLeft size={20} />
                  </button>

                  <span 
                      style={{ fontFamily: "'Syne', sans-serif" }}
                      className="text-sm font-bold text-white text-center w-[120px] uppercase"
                  >
                      {formatDate(currentDate)}
                  </span>

                  <button 
                      onClick={handleNextDay}
                      disabled={dateIndex === uniqueDates.length - 1}
                      className={`p-2 rounded-full transition-colors ${dateIndex === uniqueDates.length - 1 ? 'text-gray-800' : 'text-white hover:bg-white/10'}`}
                  >
                      <ChevronRight size={20} />
                  </button>
              </div>

              {/* League Selector (Right) - Fixed Width */}
              <div className="relative z-50 shrink-0">
                  <button 
                      onClick={() => setIsLeagueSelectorOpen(!isLeagueSelectorOpen)}
                      className="bg-white rounded-[30px] flex items-center justify-between px-3 gap-2 transition-all active:scale-95 shadow-lg h-[32px] w-[150px]"
                  >
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                          <img src={currentLeague.logo} className="w-5 h-5 object-contain shrink-0" alt="League Logo" />
                          <span className="text-[11px] font-bold text-black uppercase tracking-tight truncate font-['Montserrat'] leading-none pt-[2px]">
                              {currentLeague.name}
                          </span>
                      </div>
                      <ChevronDown size={14} className={`text-black shrink-0 transition-transform duration-200 ${isLeagueSelectorOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isLeagueSelectorOpen && (
                      <>
                          <div className="fixed inset-0 z-30" onClick={() => setIsLeagueSelectorOpen(false)} />
                          <div className="absolute top-full right-0 mt-2 w-[160px] bg-white rounded-[16px] shadow-2xl overflow-hidden py-1 z-40 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 origin-top-right">
                              {LEAGUES.map(league => (
                                  <button
                                      key={league.id}
                                      onClick={() => handleLeagueChange(league.id)}
                                      className={`w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-100 transition-colors ${league.id === leagueId ? 'bg-gray-50' : ''}`}
                                  >
                                      <img src={league.logo} className="w-5 h-5 object-contain" alt={league.name} />
                                      <span className={`text-[10px] uppercase font-['Montserrat'] text-left flex-1 ${league.id === leagueId ? 'font-black text-black' : 'font-bold text-gray-600'}`}>
                                          {league.name}
                                      </span>
                                  </button>
                              ))}
                          </div>
                      </>
                  )}
              </div>
          </div>

          {/* Content Area - Scrolls naturally */}
          <div className="flex-1 flex flex-col pt-4">
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4 mt-20">
                <Loader2 className="animate-spin text-white" size={32} />
                <p className="text-xs tracking-widest uppercase animate-pulse">{t('loading')}</p>
                </div>
            ) : uniqueDates.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-10 opacity-60 mt-20">
                    <CalendarDays size={48} className="mb-4" />
                    <p className="text-lg font-bold mb-2">No matches found</p>
                </div>
            ) : (
                <>
                    {/* Matches List - Rounded Rect Design */}
                    <div className="px-4 space-y-3">
                        {currentMatches.length === 0 ? (
                           <div className="flex flex-col items-center justify-center mt-10 opacity-50">
                               <p className="text-sm">No upcoming matches for this date.</p>
                           </div>
                        ) : (
                            currentMatches.map((match) => {
                                const isSelected = selectedMatches.has(match.id);
                                return (
                                    <div 
                                        key={match.id}
                                        onClick={() => toggleSelection(match.id)}
                                        className={`w-full h-20 rounded-[40px] px-6 flex items-center justify-between cursor-pointer transition-all border ${
                                            isSelected 
                                            ? 'bg-[#111] border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                                            : 'bg-black border-white/10 hover:border-white/30'
                                        }`}
                                    >
                                        {/* Left: Selection Circle & Teams */}
                                        <div className="flex items-center gap-6 overflow-hidden flex-1">
                                            {/* Selection Dot */}
                                            <div className={`w-5 h-5 rounded-full shrink-0 transition-colors border border-white/20 ${isSelected ? 'bg-white' : 'bg-transparent'}`} />
                                            
                                            {/* Team Names Stacked */}
                                            <div className="flex flex-col justify-center min-w-0">
                                                <span className="text-sm font-bold text-white leading-tight truncate font-['Montserrat']">
                                                    {match.homeTeam.name}
                                                </span>
                                                <span className="text-sm font-bold text-white leading-tight truncate mt-1 font-['Montserrat']">
                                                    {match.awayTeam.name}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Center: Time */}
                                        <div className="px-4">
                                            <span className="text-sm text-gray-500 font-bold font-['Montserrat'] tracking-wide whitespace-nowrap">
                                                {match.time}
                                            </span>
                                        </div>

                                        {/* Right: Logos */}
                                        <div className="flex items-center gap-3 shrink-0 pl-2">
                                            <img src={match.homeTeam.logoUrl} alt={match.homeTeam.name} className="w-8 h-8 object-contain" />
                                            <img src={match.awayTeam.logoUrl} alt={match.awayTeam.name} className="w-8 h-8 object-contain" />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}
          </div>
      </div>

      {/* Floating Action Button - Fixed Width, Centered, Raised to avoid Nav Overlap */}
      {selectedMatches.size > 0 && (
            <div className="fixed bottom-32 left-0 w-full px-6 z-50 animate-in slide-in-from-bottom-4 flex justify-center">
                <div className="w-auto">
                     <Button 
                        onClick={handleGenerate} 
                        className="bg-white text-black font-bold shadow-xl py-2 px-6 rounded-full text-xs tracking-widest uppercase w-auto font-['Syne']"
                     >
                        {t('nav_create')} ({selectedMatches.size})
                    </Button>
                </div>
            </div>
        )}
    </div>
  );
};
