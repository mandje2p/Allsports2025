
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generatePosterImage } from '../services/geminiService';
import { savePoster } from '../services/storageService';
import { Loader2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Match } from '../types';
import { StickyHeader } from '../components/StickyHeader';
import { useLanguage } from '../contexts/LanguageContext';

type AiStyle = 'players' | 'abstract' | 'prestige';
type MatchStyle = 'stadium' | AiStyle;

export const Generator: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const matches = useMemo(() => {
    return (location.state?.matches || []) as Match[];
  }, [location.state?.matches]);

  const mode = (location.state?.mode as 'program' | 'classic') || 'classic';
  const isProgramMode = mode === 'program';

  const [matchStyles, setMatchStyles] = useState<Record<number, MatchStyle>>({});
  const [matchBackgrounds, setMatchBackgrounds] = useState<Record<number, string>>(() => {
     return location.state?.generatedBackgrounds || {};
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>({});
  const [userProfile, setUserProfile] = useState<{avatarUrl: string, companyAddress: string} | null>(null);
  
  // State to track which dropdown is open
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);

  const DEFAULT_BACKGROUND = "https://all-sports.co/app/img/bg/foot/standard/bg-standard-1.jpg";

  useEffect(() => {
     const saved = localStorage.getItem('allsports_user_profile');
     if (saved) {
         setUserProfile(JSON.parse(saved));
     } else {
         setUserProfile({
             avatarUrl: "https://all-sports.co/app/img/Allsports-logo.png",
             companyAddress: "123 Sport Ave, Paris"
         });
     }
  }, []);

  useEffect(() => {
      if (location.state?.selectedBackground && location.state?.targetIndex !== undefined) {
          const { targetIndex, selectedBackground } = location.state;
          setMatchBackgrounds(prev => {
              if (prev[targetIndex] === selectedBackground) return prev;
              return { ...prev, [targetIndex]: selectedBackground };
          });
      }
      if (location.state?.matchStyles) {
           setMatchStyles(prev => location.state.matchStyles);
      }
  }, [location.state]);

  useEffect(() => {
    const generateInitial = async () => {
      if (!matches || matches.length === 0) return;
      const newBackgrounds = { ...matchBackgrounds };
      let hasChanges = false;
      const loopCount = isProgramMode ? 1 : matches.length;
      if (Object.keys(matchStyles).length === 0) {
          const initialStyles: Record<number, MatchStyle> = {};
          for (let i = 0; i < loopCount; i++) {
              initialStyles[i] = 'stadium';
          }
          setMatchStyles(initialStyles);
      }
      for (let i = 0; i < loopCount; i++) {
        if (!newBackgrounds[i]) {
            newBackgrounds[i] = DEFAULT_BACKGROUND;
            hasChanges = true;
        }
      }
      if (hasChanges) {
        setMatchBackgrounds(newBackgrounds);
      }
    };
    generateInitial();
  }, [matches, isProgramMode]);

  const handleStyleToggle = (index: number, type: 'stadium' | 'ai') => {
      // If switching to stadium
      if (type === 'stadium') {
          setMatchStyles(prev => ({ ...prev, [index]: 'stadium' }));
          if (!matchBackgrounds[index]) {
             setMatchBackgrounds(prev => ({ ...prev, [index]: DEFAULT_BACKGROUND }));
          }
          setOpenMenuIndex(null); // Close menu
      } 
      // If switching to AI
      else {
          const current = matchStyles[index];
          if (current === 'stadium' || !current) {
             setMatchStyles(prev => ({ ...prev, [index]: 'players' }));
             // Do NOT trigger generation here, wait for user to select sub-style
             setOpenMenuIndex(index); // Open menu on first switch
          } else {
             // Already in AI mode, toggle menu visibility
             setOpenMenuIndex(prev => (prev === index ? null : index));
          }
      }
  };

  const handleAiSubStyleSelect = (index: number, style: AiStyle) => {
      setMatchStyles(prev => ({ ...prev, [index]: style }));
      handleRegenerate(index, style);
      setOpenMenuIndex(null); // Close menu after selection
  };

  const handleRegenerate = async (index: number, styleOverride?: MatchStyle) => {
    const match = matches[index]; 
    if (!match || isGenerating) return;

    const styleToUse = styleOverride || matchStyles[index] || 'stadium';
    setLoadingImages(prev => ({ ...prev, [index]: true }));
    setIsGenerating(true);

    try {
      const posterConfig = {
        teamA: isProgramMode ? 'Football' : match.homeTeam.name,
        teamB: isProgramMode ? 'Club' : match.awayTeam.name,
        date: match.date,
        time: match.time,
        venue: match.venue || 'Stadium',
        competition: match.competition
      };
      const imageUrl = await generatePosterImage(posterConfig, styleToUse);
      setMatchBackgrounds(prev => ({ ...prev, [index]: imageUrl }));
    } catch (error) {
      console.error("Generation failed", error);
      alert(t('error_generation_failed') || "Generation failed.");
    } finally {
      setIsGenerating(false);
      setLoadingImages(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleRightAction = (index: number) => {
      const currentStyle = matchStyles[index] || 'stadium';
      if (currentStyle === 'stadium') {
          navigate('/backgrounds', { 
              state: { 
                  matches, 
                  targetIndex: index,
                  generatedBackgrounds: matchBackgrounds,
                  matchStyles,
                  mode
              } 
          });
      } 
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        const timeout = setTimeout(() => { img.src = ""; reject(new Error("Timeout " + src)); }, 10000);
        img.onload = () => { clearTimeout(timeout); resolve(img); };
        img.onerror = () => {
            clearTimeout(timeout);
            if (src.includes('wsrv.nl') || src.startsWith('data:')) { reject(new Error("Failed " + src)); return; }
            img.src = `https://wsrv.nl/?url=${encodeURIComponent(src)}`;
        };
        img.src = src;
    });
  };

  const LAYOUT = {
      dateTop: 0.08,    
      timeTop: 0.12,    
      logosTop: 0.35,   
      logosHeight: 0.20,
      vsTop: 0.45,      
      namesTop: 0.58,   
  };

  const createCompositeImage = async (match: Match, bgUrl: string, index: number): Promise<string> => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("No canvas context");

      canvas.width = 1080;
      canvas.height = 1920;
      const W = canvas.width;
      const H = canvas.height;

      try {
          const bgImg = await loadImage(bgUrl);
          const hRatio = W / bgImg.width;
          const vRatio = H / bgImg.height;
          const ratio = Math.max(hRatio, vRatio);
          const centerShift_x = (W - bgImg.width * ratio) / 2;
          const centerShift_y = (H - bgImg.height * ratio) / 2;
          ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, centerShift_x, centerShift_y, bgImg.width * ratio, bgImg.height * ratio);
      } catch (e) {
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, W, H);

      if (isProgramMode) {
          const dateStr = new Date(match.date).toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long'
          }).toUpperCase();
          
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          
          ctx.font = "400 64px 'Montserrat'";
          ctx.fillText(dateStr, W / 2, (H * 0.10) - 25); 

          // Logic for resizing based on number of matches
          const count = matches.length;
          let itemHeight = 220;
          let logoSize = 100;
          let timeFontSize = 36;
          let teamFontSize = 32;
          let nameOffset = 70;
          let logoOffset = 20;

          if (count <= 2) {
             itemHeight = 450;
             logoSize = 220; 
             timeFontSize = 56;
             teamFontSize = 48;
             nameOffset = 110; 
             logoOffset = 40;
          } else if (count === 3) {
             itemHeight = 340;
             logoSize = 170;
             timeFontSize = 48;
             teamFontSize = 40;
             nameOffset = 90;
             logoOffset = 30;
          } else if (count === 4) {
             itemHeight = 270;
             logoSize = 130;
             timeFontSize = 42;
             teamFontSize = 36;
             nameOffset = 80;
             logoOffset = 25;
          }

          const totalContentHeight = matches.length * itemHeight;
          const startY = ((H * 0.5) - (totalContentHeight / 2)) + 70;

          // Align texts same way as logos
          // Logos are centered at W/2 +/- (logoSize/2) (conceptually, though code uses colLeftX)
          // Actually logos in program mode use colLeftX/colRightX
          
          for (let i = 0; i < matches.length; i++) {
              const m = matches[i];
              const centerY = startY + (i * itemHeight) + (itemHeight / 2);
              
              const colLeftX = W * 0.25;
              const colRightX = W * 0.75;

              let homeLogo, awayLogo;
              try {
                  if (m.homeTeam.logoUrl) homeLogo = await loadImage(m.homeTeam.logoUrl);
                  if (m.awayTeam.logoUrl) awayLogo = await loadImage(m.awayTeam.logoUrl);
              } catch(e) {}

              ctx.font = `700 ${timeFontSize}px 'Montserrat'`;
              ctx.fillStyle = "#ccc";
              ctx.textAlign = "center";
              ctx.fillText(m.time, W / 2, centerY + 10); 

              if (homeLogo) {
                  const lx = colLeftX - (logoSize/2);
                  const ly = centerY - logoOffset - logoSize;
                  ctx.drawImage(homeLogo, lx, ly, logoSize, logoSize);
              }
              ctx.font = `700 ${teamFontSize}px 'Montserrat'`;
              ctx.fillStyle = "white";
              ctx.textAlign = "center";
              ctx.fillText(m.homeTeam.name.toUpperCase(), colLeftX, centerY + nameOffset);

              if (awayLogo) {
                  const lx = colRightX - (logoSize/2);
                  const ly = centerY - logoOffset - logoSize;
                  ctx.drawImage(awayLogo, lx, ly, logoSize, logoSize);
              }
              ctx.fillText(m.awayTeam.name.toUpperCase(), colRightX, centerY + nameOffset);

              if (i < matches.length - 1) {
                  ctx.beginPath();
                  ctx.strokeStyle = "rgba(255,255,255,0.2)";
                  ctx.lineWidth = 1;
                  ctx.moveTo(100, startY + ((i+1) * itemHeight)); 
                  ctx.lineTo(W - 100, startY + ((i+1) * itemHeight));
                  ctx.stroke();
              }
          }

      } else {
          // Classic Mode
          const dateStr = new Date(match.date).toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long'
          }).toUpperCase();
          const timeStr = match.time;
          const homeName = match.homeTeam.name.toUpperCase();
          const awayName = match.awayTeam.name.toUpperCase();
          
          ctx.font = "400 49px 'Montserrat'";
          ctx.textAlign = "center";
          ctx.fillStyle = "white";
          ctx.fillText(dateStr, W / 2, H * LAYOUT.dateTop);

          ctx.font = "400 42px 'Montserrat'";
          ctx.fillText(timeStr, W / 2, H * LAYOUT.timeTop);

          const logoSize = H * LAYOUT.logosHeight; // 384px
          const logoY = H * LAYOUT.logosTop;
          const gap = 150;
          
          // Calculate Center X for each logo
          const homeLogoCenterX = (W / 2) - (gap / 2) - (logoSize / 2);
          const awayLogoCenterX = (W / 2) + (gap / 2) + (logoSize / 2);
          const homeLogoX = homeLogoCenterX - (logoSize / 2);
          const awayLogoX = awayLogoCenterX - (logoSize / 2);

          try {
              const homeLogo = await loadImage(match.homeTeam.logoUrl || "");
              const awayLogo = await loadImage(match.awayTeam.logoUrl || "");
              
              ctx.drawImage(homeLogo, homeLogoX, logoY, logoSize, logoSize);
              ctx.drawImage(awayLogo, awayLogoX, logoY, logoSize, logoSize);
          } catch (e) {}

          ctx.font = "400 30px 'Montserrat'";
          ctx.fillText("VS", W / 2, H * LAYOUT.vsTop);

          // Use Font Bold 700
          ctx.font = "700 42px 'Montserrat'";
          // Use calculated center X for text alignment
          ctx.fillText(homeName, homeLogoCenterX, H * LAYOUT.namesTop);
          ctx.fillText(awayName, awayLogoCenterX, H * LAYOUT.namesTop);
      }

      const addressText = (userProfile?.companyAddress || "").toUpperCase();
      const footerBaseY = H * 0.95;
      
      if (addressText) {
        ctx.font = "400 28px 'Montserrat'";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(addressText, W / 2, footerBaseY);
      }

      if (userProfile?.avatarUrl) {
          try {
              const footerLogo = await loadImage(userProfile.avatarUrl);
              const maxDim = 130;
              const gap = 20;
              const ratio = Math.min(maxDim / footerLogo.width, maxDim / footerLogo.height);
              const lw = footerLogo.width * ratio;
              const lh = footerLogo.height * ratio;
              const logoY = footerBaseY - 30 - gap - lh; 
              ctx.drawImage(footerLogo, (W - lw) / 2, logoY, lw, lh);
          } catch (e) {
              console.warn("Footer logo failed");
          }
      }
      return canvas.toDataURL("image/jpeg", 0.6);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
        const loopCount = isProgramMode ? 1 : matches.length;
        for (let i = 0; i < loopCount; i++) {
             const bg = matchBackgrounds[i] || DEFAULT_BACKGROUND;
             const finalDataUrl = await createCompositeImage(matches[i], bg, i);
             await savePoster({
                 match: matches[i],
                 backgroundImage: bg,
                 finalPosterUrl: finalDataUrl,
                 style: matchStyles[i] || 'stadium',
                 type: isProgramMode ? 'program' : 'classic'
             });
        }
        navigate('/gallery');
    } catch (e) {
        console.error(e);
        alert(t('error_save_failed') || "Storage full! Please delete some old posters.");
    } finally {
        setIsSaving(false);
    }
  };

  if (!matches || matches.length === 0) return <div>No matches loaded</div>;
  const renderItems = isProgramMode ? [matches[0]] : matches;

  return (
    <div className="min-h-screen bg-black text-white fade-in">
      <StickyHeader />
      {/* Increased top padding from 32 to 44 to clear header */}
      <div className="pt-44 pb-24 px-4 flex flex-col gap-8 items-center">
        
        {renderItems.map((match, index) => {
            const currentStyle = matchStyles[index] || 'stadium';
            const isAiActive = currentStyle !== 'stadium';
            const bgUrl = matchBackgrounds[index] || DEFAULT_BACKGROUND;
            const isLoading = loadingImages[index];
            const isMenuOpen = openMenuIndex === index;

            return (
                <div key={match.id} className="w-full max-w-sm flex flex-col gap-4 items-center">
                     {/* Control Bar - Width fixed to full to align with image */}
                     <div className="w-full flex flex-col gap-2 mt-[40px] mb-2 px-0 z-20">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 relative">
                                <div className="flex bg-[#111] border border-white/10 rounded-full p-1 h-[40px] items-center flex-1 relative">
                                    <button 
                                        onClick={() => handleStyleToggle(index, 'stadium')}
                                        className={`flex-1 h-full rounded-full text-[9px] font-bold transition-all font-['Syne'] flex items-center justify-center uppercase tracking-wide ${currentStyle === 'stadium' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        BACKGROUND
                                    </button>
                                    <button 
                                        onClick={() => handleStyleToggle(index, 'ai')}
                                        className={`flex-1 h-full rounded-full text-[9px] font-bold transition-all font-['Syne'] flex items-center justify-center uppercase tracking-wide ${isAiActive ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        AI VERSION
                                    </button>
                                </div>

                                {/* Floating Dropdown Menu for AI Styles */}
                                {isAiActive && isMenuOpen && (
                                  <>
                                      {/* Invisible backdrop to handle click outside */}
                                      <div className="fixed inset-0 z-40" onClick={() => setOpenMenuIndex(null)}></div>
                                      
                                      <div className="absolute top-[calc(100%+8px)] left-0 w-[calc(100%-48px)] bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl p-1 z-50 shadow-2xl animate-in fade-in slide-in-from-top-2">
                                          <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto hide-scrollbar">
                                            <button 
                                                onClick={() => handleAiSubStyleSelect(index, 'players')}
                                                className={`w-full py-2.5 px-4 rounded-lg text-[9px] font-bold uppercase transition-all text-right font-['Syne'] border ${currentStyle === 'players' ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                JOUEURS
                                            </button>
                                            <button 
                                                onClick={() => handleAiSubStyleSelect(index, 'abstract')}
                                                className={`w-full py-2.5 px-4 rounded-lg text-[9px] font-bold uppercase transition-all text-right font-['Syne'] border ${currentStyle === 'abstract' ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                ABSTRAIT
                                            </button>
                                            <button 
                                                onClick={() => handleAiSubStyleSelect(index, 'prestige')}
                                                className={`w-full py-2.5 px-4 rounded-lg text-[9px] font-bold uppercase transition-all text-right font-['Syne'] border ${currentStyle === 'prestige' ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                PRESTIGE
                                            </button>
                                          </div>
                                      </div>
                                  </>
                                )}
                                
                                {/* Right Action Button - Only show for Stadium mode */}
                                {currentStyle === 'stadium' && (
                                    <button 
                                        onClick={() => handleRightAction(index)}
                                        className="w-[40px] h-[40px] rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors active:scale-95 shrink-0"
                                    >
                                        <ImageIcon size={20} />
                                    </button>
                                )}
                            </div>
                            {index === 0 && (
                                <button 
                                    onClick={handleSaveAll}
                                    disabled={isSaving}
                                    className="h-[40px] px-6 ml-2 rounded-full bg-white text-black font-bold text-[9px] font-['Syne'] flex items-center justify-center uppercase tracking-widest hover:bg-gray-200 transition-all shadow-lg active:scale-95 shrink-0"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : "SAVE"}
                                </button>
                            )}
                        </div>
                     </div>

                    <div className="relative w-full aspect-[9/16] bg-gray-900 rounded-[30px] overflow-hidden shadow-2xl border border-white/10 mx-auto z-0">
                         <div className="absolute inset-0 z-0">
                            {isLoading ? (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                    <Loader2 className="animate-spin text-white opacity-50" size={48} />
                                </div>
                            ) : (
                                <>
                                    <img src={bgUrl} className="w-full h-full object-cover transition-opacity duration-500" />
                                    <div className="absolute inset-0 bg-black/40"></div>
                                </>
                            )}
                         </div>

                         {!isLoading && (
                            <div className="absolute inset-0 z-10 p-6 flex flex-col items-center">
                                {isProgramMode ? (
                                    <div className="w-full h-full flex flex-col justify-center">
                                         <div className="text-center absolute w-full top-0 mt-[10%]">
                                            <h2 className="text-white text-[5cqw] font-normal font-['Montserrat'] uppercase leading-tight">
                                                {new Date(match.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </h2>
                                         </div>
                                         <div className="w-full flex flex-col justify-center gap-1 px-2 pt-[14%]">
                                             {matches.map((m, idx) => {
                                                 const count = matches.length;
                                                 let logoClass = "w-[8cqw] h-[8cqw]";
                                                 let nameClass = "text-[2.5cqw]";
                                                 let timeClass = "text-[3cqw]";
                                                 let rowPadding = "py-2";
                                                 
                                                 if (count <= 2) {
                                                     logoClass = "w-[15cqw] h-[15cqw]";
                                                     nameClass = "text-[4.5cqw]";
                                                     timeClass = "text-[5cqw]";
                                                     rowPadding = "py-8";
                                                 } else if (count === 3) {
                                                     logoClass = "w-[12cqw] h-[12cqw]";
                                                     nameClass = "text-[3.5cqw]";
                                                     timeClass = "text-[4cqw]";
                                                     rowPadding = "py-5";
                                                 } else if (count === 4) {
                                                     logoClass = "w-[10cqw] h-[10cqw]";
                                                     nameClass = "text-[3cqw]";
                                                     timeClass = "text-[3.5cqw]";
                                                     rowPadding = "py-3";
                                                 }

                                                 return (
                                                 <div key={idx} className={`grid grid-cols-[1fr_auto_1fr] items-center ${rowPadding} border-b border-white/20 last:border-0`}>
                                                     <div className="flex flex-col items-center gap-1">
                                                         <img src={m.homeTeam.logoUrl} className={`${logoClass} object-contain`} />
                                                         <span className={`text-white ${nameClass} font-bold font-['Montserrat'] text-center leading-tight uppercase`}>{m.homeTeam.name}</span>
                                                     </div>
                                                     <span className={`text-gray-300 ${timeClass} font-bold font-['Montserrat'] px-2`}>{m.time}</span>
                                                     <div className="flex flex-col items-center gap-1">
                                                         <img src={m.awayTeam.logoUrl} className={`${logoClass} object-contain`} />
                                                         <span className={`text-white ${nameClass} font-bold font-['Montserrat'] text-center leading-tight uppercase`}>{m.awayTeam.name}</span>
                                                     </div>
                                                 </div>
                                                 );
                                             })}
                                         </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full relative container-type-size" style={{ containerType: 'size' }}>
                                        <div className="absolute w-full text-center" style={{ top: '8%' }}>
                                            <h2 className="text-white text-[4.5cqw] font-normal font-['Montserrat'] uppercase">
                                                {new Date(match.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </h2>
                                        </div>
                                        <div className="absolute w-full text-center" style={{ top: '12%' }}>
                                            <p className="text-white text-[3.9cqw] font-normal font-['Montserrat']">
                                                {match.time}
                                            </p>
                                        </div>
                                        
                                        {/* Logos */}
                                        <div className="absolute w-full flex justify-center items-center gap-[14cqw]" style={{ top: '35%', height: '20%' }}>
                                            <img src={match.homeTeam.logoUrl} className="h-full object-contain drop-shadow-2xl" />
                                            <img src={match.awayTeam.logoUrl} className="h-full object-contain drop-shadow-2xl" />
                                        </div>

                                        <div className="absolute w-full text-center" style={{ top: '45%' }}>
                                             <span className="text-white text-[2.8cqw] font-normal font-['Montserrat']">VS</span>
                                        </div>

                                        {/* Team Names - Aligned with logos via same structure/gap */}
                                        <div className="absolute w-full flex justify-center items-start gap-[14cqw]" style={{ top: '58%' }}>
                                            <div className="flex flex-col items-center justify-start w-[20cqh]">
                                                <h3 className="text-white text-[3.9cqw] font-bold font-['Montserrat'] uppercase text-center leading-tight break-words w-[30cqw]">
                                                    {match.homeTeam.name}
                                                </h3>
                                            </div>
                                            <div className="flex flex-col items-center justify-start w-[20cqh]">
                                                <h3 className="text-white text-[3.9cqw] font-bold font-['Montserrat'] uppercase text-center leading-tight break-words w-[30cqw]">
                                                    {match.awayTeam.name}
                                                </h3>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute bottom-6 w-full flex flex-col items-center gap-2">
                                     <img src={userProfile?.avatarUrl} className="w-[12cqw] h-[12cqw] object-contain drop-shadow-lg" />
                                     <p className="text-white text-[2.5cqw] font-normal font-['Montserrat'] uppercase tracking-widest text-center drop-shadow-md">
                                        {userProfile?.companyAddress}
                                     </p>
                                </div>
                            </div>
                         )}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};
