
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generatePosterImage } from '../services/geminiService';
import { savePoster } from '../services/storageService';
import { Loader2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Match } from '../types';
import { StickyHeader } from '../components/StickyHeader';
import { useLanguage } from '../contexts/LanguageContext';

export const Generator: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // Memoize matches to prevent infinite loops
  const matches = useMemo(() => {
    return (location.state?.matches || []) as Match[];
  }, [location.state?.matches]);

  const [matchStyles, setMatchStyles] = useState<Record<number, 'stadium' | 'players'>>({});
  const [matchBackgrounds, setMatchBackgrounds] = useState<Record<number, string>>(() => {
     return location.state?.generatedBackgrounds || {};
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>({});
  const [userProfile, setUserProfile] = useState<{avatarUrl: string, companyAddress: string} | null>(null);

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

      if (Object.keys(matchStyles).length === 0) {
          const initialStyles: Record<number, 'stadium' | 'players'> = {};
          matches.forEach((_, index) => {
              initialStyles[index] = 'stadium';
          });
          setMatchStyles(initialStyles);
      }

      for (let i = 0; i < matches.length; i++) {
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
  }, [matches]);

  const handleStyleToggle = (index: number, style: 'stadium' | 'players') => {
      setMatchStyles(prev => ({ ...prev, [index]: style }));
      if (style === 'players') {
          handleRegenerate(index, 'players');
      } else {
          if (!matchBackgrounds[index]) {
             setMatchBackgrounds(prev => ({ ...prev, [index]: DEFAULT_BACKGROUND }));
          }
      }
  };

  const handleRegenerate = async (index: number, styleOverride?: 'stadium' | 'players') => {
    const match = matches[index];
    if (!match || isGenerating) return;

    const styleToUse = styleOverride || matchStyles[index] || 'stadium';
    setLoadingImages(prev => ({ ...prev, [index]: true }));
    setIsGenerating(true);

    try {
      const posterConfig = {
        teamA: match.homeTeam.name,
        teamB: match.awayTeam.name,
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
                  matchStyles 
              } 
          });
      } else {
          handleRegenerate(index);
      }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        const timeout = setTimeout(() => {
            img.src = ""; // Stop loading
            reject(new Error("Timeout loading image: " + src));
        }, 10000);

        // Success handler
        img.onload = () => {
            clearTimeout(timeout);
            resolve(img);
        };

        // Error handler with proxy fallback
        img.onerror = () => {
            clearTimeout(timeout);
            if (src.includes('wsrv.nl') || src.startsWith('data:')) {
                reject(new Error("Failed to load image: " + src));
                return;
            }
            const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(src)}`;
            console.log("Retrying with proxy:", proxyUrl);
            const proxyImg = new Image();
            proxyImg.crossOrigin = "Anonymous";
            proxyImg.onload = () => resolve(proxyImg);
            proxyImg.onerror = (err) => reject(err);
            proxyImg.src = proxyUrl;
        };

        img.src = src;
    });
  };

  // LAYOUT CONFIGURATION (Percentages for 9:16 aspect ratio)
  // This ensures CSS and Canvas use the exact same logic
  const LAYOUT = {
      dateTop: 0.08,    // 8% from top
      timeTop: 0.12,    // Moved up from 0.14 to 0.12
      logosTop: 0.35,   // 35% from top
      logosHeight: 0.20, // 20% height
      vsTop: 0.45,      // 45% from top
      namesTop: 0.58,   // 58% from top
      footerLogoBottom: 0.05, // 5% from bottom
      addressBottom: 0.025,   // 2.5% from bottom
  };

  const createCompositeImage = async (match: Match, bgUrl: string, index: number): Promise<string> => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("No canvas context");

      // Set High Res Dimensions
      canvas.width = 1080;
      canvas.height = 1920;

      const W = canvas.width;
      const H = canvas.height;

      // 1. Draw Background
      try {
          const bgImg = await loadImage(bgUrl);
          const hRatio = W / bgImg.width;
          const vRatio = H / bgImg.height;
          const ratio = Math.max(hRatio, vRatio);
          const centerShift_x = (W - bgImg.width * ratio) / 2;
          const centerShift_y = (H - bgImg.height * ratio) / 2;
          ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, centerShift_x, centerShift_y, bgImg.width * ratio, bgImg.height * ratio);
      } catch (e) {
          console.error("BG Load Error", e);
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, W, H);
      }

      // Overlay Dimmer
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, W, H);

      // --- TEXT & ELEMENTS ---
      ctx.textAlign = "center";
      ctx.fillStyle = "white";

      // 2. Draw Date (Montserrat Normal) 
      // Reduced by 30%: 70px -> 49px
      const dateStr = new Date(match.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
      ctx.font = "400 49px Montserrat"; 
      ctx.fillText(dateStr, W / 2, H * LAYOUT.dateTop + 60); // ascent adjustment

      // 3. Draw Time (Montserrat Normal)
      ctx.font = "400 42px Montserrat";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(match.time, W / 2, H * LAYOUT.timeTop + 42);

      // 4. Draw Logos
      const logoY = H * LAYOUT.logosTop; 
      const logoH = H * LAYOUT.logosHeight; // approx 384px
      const logoMaxW = 400;

      // VS - Normal Weight
      ctx.font = "400 36px Montserrat";
      ctx.fillStyle = "white";
      ctx.fillText("VS", W / 2, H * LAYOUT.vsTop + 10);

      // Home Logo
      try {
          const homeImg = await loadImage(match.homeTeam.logoUrl || '');
          const ratio = Math.min(logoMaxW / homeImg.width, logoH / homeImg.height);
          const w = homeImg.width * ratio;
          const h = homeImg.height * ratio;
          // Center in Left Quadrant (25% Width)
          ctx.drawImage(homeImg, (W * 0.25) - (w / 2), logoY + (logoH - h) / 2, w, h);
      } catch (e) {
          ctx.beginPath(); ctx.arc(W * 0.25, logoY + logoH/2, 80, 0, 2 * Math.PI); ctx.fill();
      }

      // Away Logo
      try {
          const awayImg = await loadImage(match.awayTeam.logoUrl || '');
          const ratio = Math.min(logoMaxW / awayImg.width, logoH / awayImg.height);
          const w = awayImg.width * ratio;
          const h = awayImg.height * ratio;
          // Center in Right Quadrant (75% Width)
          ctx.drawImage(awayImg, (W * 0.75) - (w / 2), logoY + (logoH - h) / 2, w, h);
      } catch (e) {
          ctx.beginPath(); ctx.arc(W * 0.75, logoY + logoH/2, 80, 0, 2 * Math.PI); ctx.fill();
      }

      // 5. Draw Team Names - Normal Weight
      // INCREASED: 32px -> 42px
      const nameY = H * LAYOUT.namesTop;
      ctx.font = "400 42px Montserrat"; 
      
      // Home Name
      ctx.fillText(match.homeTeam.name.toUpperCase(), W * 0.25, nameY);
      // Away Name
      ctx.fillText(match.awayTeam.name.toUpperCase(), W * 0.75, nameY);

      // 6. Draw Footer (User Info)
      const savedProfile = localStorage.getItem('allsports_user_profile');
      let userLogoUrl = "https://all-sports.co/app/img/Allsports-logo.png";
      let userAddress = "123 Sport Ave, Paris";
      
      if (savedProfile) {
          const p = JSON.parse(savedProfile);
          if (p.avatarUrl) userLogoUrl = p.avatarUrl;
          if (p.companyAddress) userAddress = p.companyAddress;
      }

      // Address - Forced Uppercase
      ctx.font = "400 26px Montserrat";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(userAddress.toUpperCase(), W / 2, H * (1 - LAYOUT.addressBottom));

      // User Logo - SMALLER
      try {
          const footerLogo = await loadImage(userLogoUrl);
          const fMaxW = 140; // Reduced from 200
          const fMaxH = 100; // Reduced from 150
          const fRatio = Math.min(fMaxW / footerLogo.width, fMaxH / footerLogo.height);
          const fw = footerLogo.width * fRatio;
          const fh = footerLogo.height * fRatio;
          
          const logoBottomY = H * (1 - LAYOUT.footerLogoBottom);
          ctx.drawImage(footerLogo, (W - fw) / 2, logoBottomY - fh, fw, fh);
      } catch (e) {
          // Ignore
      }

      return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleSaveAll = async () => {
      setIsSaving(true);
      try {
          for (let i = 0; i < matches.length; i++) {
              const match = matches[i];
              const bgUrl = matchBackgrounds[i] || DEFAULT_BACKGROUND;
              
              const finalPosterUrl = await createCompositeImage(match, bgUrl, i);

              savePoster({
                  match,
                  backgroundImage: bgUrl,
                  finalPosterUrl,
                  style: matchStyles[i] || 'stadium'
              });
          }
          navigate('/gallery');
      } catch (e) {
          console.error("Error saving posters", e);
          alert("Error saving posters. Please try again.");
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="min-h-screen bg-black text-white fade-in">
       <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;700;900&display=swap');
      `}</style>

      <StickyHeader />

      <div className="pt-28 pb-24 flex flex-col gap-12">
        {matches.map((match, index) => {
            const currentStyle = matchStyles[index] || 'stadium';
            const bgImage = matchBackgrounds[index] || DEFAULT_BACKGROUND;
            const isLoading = loadingImages[index];

            return (
                <div key={match.id} className="flex flex-col gap-0 w-full max-w-md mx-auto">
                    
                    {/* Controls Bar - Further Reduced Size (h-9 approx 36px) */}
                    {/* Increased top margin from mt-[30px] to mt-[40px] */}
                    <div className="flex items-center justify-between px-4 mt-[40px] mb-4 w-full">
                         {/* Left Group: Tabs + Action Button */}
                         <div className="flex items-center gap-2">
                             {/* Tabs - Reduced height and width */}
                             <div className="flex bg-[#111] border border-white/10 rounded-full p-1 h-[34px] items-center w-[200px]">
                                    <button 
                                        onClick={() => handleStyleToggle(index, 'stadium')}
                                        className={`flex-1 h-full rounded-full text-[8px] font-bold transition-all font-['Syne'] flex items-center justify-center uppercase tracking-wide ${currentStyle === 'stadium' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        BACKGROUND
                                    </button>
                                    <button 
                                        onClick={() => handleStyleToggle(index, 'players')}
                                        className={`flex-1 h-full rounded-full text-[8px] font-bold transition-all font-['Syne'] flex items-center justify-center uppercase tracking-wide ${currentStyle === 'players' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        AI VERSION
                                    </button>
                             </div>

                             {/* Action Button (Change BG / Regenerate) - Moved here to be next to tabs */}
                             <button 
                                onClick={() => handleRightAction(index)}
                                className="w-[34px] h-[34px] rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors active:scale-95 shrink-0"
                            >
                                {currentStyle === 'stadium' ? <ImageIcon size={15} /> : <RefreshCw size={15} />}
                            </button>
                         </div>

                         {/* Right Group: Save Button */}
                         {index === 0 && (
                             <button 
                                onClick={handleSaveAll}
                                disabled={isSaving}
                                className="h-[34px] px-4 rounded-full bg-white text-black font-bold text-[8px] font-['Syne'] flex items-center justify-center uppercase tracking-widest hover:bg-gray-200 transition-all shadow-lg active:scale-95 shrink-0"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={14} /> : "SAVE"}
                            </button>
                         )}
                    </div>

                    {/* PREVIEW AREA */}
                    {/* This strictly mirrors LAYOUT config using Percentages */}
                    <div className="relative w-full px-4">
                        <div className="relative w-full aspect-[9/16] overflow-hidden rounded-[30px] shadow-2xl bg-black border border-white/10 text-white font-['Montserrat']">
                            
                            {/* Background */}
                            <div className="absolute inset-0">
                                {isLoading ? (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                        <Loader2 className="animate-spin text-white" size={48} />
                                    </div>
                                ) : (
                                    <img src={bgImage} className="w-full h-full object-cover" alt="Background" />
                                )}
                            </div>
                            
                            {/* Overlay Content */}
                            <div className="absolute inset-0 bg-black/40">
                                
                                {/* Date (Top: 8%) - REDUCED SIZE (5.25cqw from 7.5cqw) */}
                                <div 
                                    className="absolute left-1/2 -translate-x-1/2 text-center font-normal uppercase tracking-widest whitespace-nowrap"
                                    style={{ top: `${LAYOUT.dateTop * 100}%`, fontSize: '5.25cqw' }}
                                >
                                    {new Date(match.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </div>

                                {/* Time (Top: 12% - Was 14%) */}
                                <div 
                                    className="absolute left-1/2 -translate-x-1/2 text-center text-gray-100 font-normal"
                                    style={{ top: `${LAYOUT.timeTop * 100}%`, fontSize: '4.5cqw' }}
                                >
                                    {match.time}
                                </div>

                                {/* Logos (Top: 35%, Height: 20%) */}
                                <div 
                                    className="absolute flex items-center justify-center"
                                    style={{ top: `${LAYOUT.logosTop * 100}%`, height: `${LAYOUT.logosHeight * 100}%`, width: '42%', left: '4%' }}
                                >
                                    <img src={match.homeTeam.logoUrl} className="max-w-full max-h-full object-contain drop-shadow-xl" />
                                </div>

                                <div 
                                    className="absolute flex items-center justify-center"
                                    style={{ top: `${LAYOUT.logosTop * 100}%`, height: `${LAYOUT.logosHeight * 100}%`, width: '42%', left: '54%' }}
                                >
                                    <img src={match.awayTeam.logoUrl} className="max-w-full max-h-full object-contain drop-shadow-xl" />
                                </div>

                                {/* VS (Top: 45%) - Normal Weight */}
                                <div 
                                    className="absolute left-1/2 -translate-x-1/2 text-center font-normal"
                                    style={{ top: `${LAYOUT.vsTop * 100}%`, fontSize: '3.5cqw' }}
                                >
                                    VS
                                </div>

                                {/* Names (Top: 58%) - INCREASED SIZE (4.2cqw from 3.2cqw) */}
                                <div 
                                    className="absolute left-[25%] -translate-x-1/2 text-center font-normal uppercase leading-tight w-[45%]"
                                    style={{ top: `${LAYOUT.namesTop * 100}%`, fontSize: '4.2cqw' }}
                                >
                                    {match.homeTeam.name}
                                </div>

                                <div 
                                    className="absolute left-[75%] -translate-x-1/2 text-center font-normal uppercase leading-tight w-[45%]"
                                    style={{ top: `${LAYOUT.namesTop * 100}%`, fontSize: '4.2cqw' }}
                                >
                                    {match.awayTeam.name}
                                </div>

                                {/* Footer User Info */}
                                {userProfile && (
                                    <>
                                        {/* Logo (Bottom: 5%) - SMALLER */}
                                        <div 
                                            className="absolute left-1/2 -translate-x-1/2 flex items-end justify-center"
                                            style={{ bottom: `${LAYOUT.footerLogoBottom * 100}%`, height: '5%', width: '40%' }}
                                        >
                                            <img 
                                                src={userProfile.avatarUrl} 
                                                className="max-h-full w-auto object-contain drop-shadow-md" 
                                            />
                                        </div>

                                        {/* Address (Bottom: 2.5%) - Forced Uppercase */}
                                        <div 
                                            className="absolute left-1/2 -translate-x-1/2 text-center text-gray-100 font-normal uppercase tracking-wider whitespace-nowrap"
                                            style={{ bottom: `${LAYOUT.addressBottom * 100}%`, fontSize: '2.5cqw' }}
                                        >
                                            {userProfile.companyAddress.toUpperCase()}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};
