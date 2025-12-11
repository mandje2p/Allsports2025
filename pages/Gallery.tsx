
import React, { useEffect, useState } from 'react';
import { getSavedPosters, deletePoster, SavedPoster } from '../services/storageService';
import { Trash2, Calendar, X, Share2, Loader2, AlertTriangle } from 'lucide-react';
import { StickyHeader } from '../components/StickyHeader';
import { useLanguage } from '../contexts/LanguageContext';

export const Gallery: React.FC = () => {
  const [posters, setPosters] = useState<SavedPoster[]>([]);
  const [selectedImage, setSelectedImage] = useState<SavedPoster | null>(null);
  const [posterToDelete, setPosterToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t, locale } = useLanguage();

  useEffect(() => {
    loadPosters();
  }, []);

  const loadPosters = async () => {
    setIsLoading(true);
    try {
      const data = await getSavedPosters();
      setPosters(data);
    } catch (e) {
      console.error("Failed to load posters", e);
    } finally {
      setIsLoading(false);
    }
  };

  const requestDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPosterToDelete(id);
  };

  const performDelete = async () => {
    if (!posterToDelete) return;
    const id = posterToDelete;
    setPosters(prev => prev.filter(p => p.id !== id));
    setPosterToDelete(null);
    try {
        await deletePoster(id);
    } catch (error) {
        console.error("Failed to delete", error);
        loadPosters();
    }
  };

  const handleShare = async (e: React.MouseEvent, poster: SavedPoster) => {
     e.stopPropagation();
     try {
         const imageToShare = poster.finalPosterUrl || poster.backgroundImage;
         const homeName = poster.match.homeTeam.name.trim();
         const awayName = poster.match.awayTeam.name.trim();
         const fileName = `All Sports - ${homeName} vs ${awayName}.jpg`;
         const response = await fetch(imageToShare);
         const blob = await response.blob();
         const file = new File([blob], fileName, { type: 'image/jpeg' });

         if (navigator.canShare && navigator.canShare({ files: [file] })) {
             await navigator.share({ files: [file], title: fileName }).catch((e) => {
                 if (e.name !== 'AbortError') console.error("Share failed:", e);
             });
         } else {
             const link = document.createElement('a');
             link.href = imageToShare;
             link.download = fileName;
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
         }
     } catch (err) {
         console.error("Error sharing:", err);
     }
  };

  const groupedPosters = posters.reduce((acc, poster) => {
    const date = poster.match.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(poster);
    return acc;
  }, {} as Record<string, SavedPoster[]>);

  const dates = Object.keys(groupedPosters).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const formattedDateHeader = (date: string) => 
    new Date(date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div className="bg-black fade-in text-white min-h-full">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;700;900&display=swap');
      `}</style>

      <StickyHeader />

      {/* Increased top padding to 48 - Reduced spacing */}
      <div className="pt-[145px] px-4 pb-4">
        {isLoading ? (
            <div className="flex justify-center mt-20">
                <Loader2 className="animate-spin text-white" size={32} />
            </div>
        ) : posters.length === 0 ? (
           <div className="flex flex-col items-center justify-center mt-20 text-gray-600">
                <p>{t('gallery_empty')}</p>
           </div>
        ) : (
           <div className="flex flex-col gap-8">
             {dates.map(date => (
                <div key={date}>
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <Calendar size={14} className="text-gray-400" />
                        <h3 
                            className="text-xs font-bold text-gray-400 uppercase tracking-widest"
                            style={{ fontFamily: "'Syne', sans-serif" }}
                        >
                            {formattedDateHeader(date)}
                        </h3>
                    </div>
                    <div className="flex flex-col gap-3">
                        {groupedPosters[date].map(poster => (
                            <div key={poster.id} className="bg-[#111] rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center gap-1 h-32 relative">
                                <div className="flex items-center w-full gap-4 h-full">
                                    <div 
                                        onClick={() => setSelectedImage(poster)}
                                        className="relative h-20 w-[45px] rounded-lg overflow-hidden bg-gray-800 shrink-0 border border-white/10 cursor-pointer active:scale-95 transition-transform"
                                    >
                                        <img src={poster.finalPosterUrl || poster.backgroundImage} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                                        <div className="flex items-center justify-center gap-2 w-full">
                                            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                                                <span className="text-[10px] font-bold text-white text-right leading-tight truncate uppercase font-['Syne']">
                                                    {poster.match.homeTeam.name}
                                                </span>
                                                <img src={poster.match.homeTeam.logoUrl} className="w-10 h-10 object-contain shrink-0" />
                                            </div>
                                            <span className="text-[12px] font-normal text-gray-500 font-['Montserrat'] shrink-0">VS</span>
                                            <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                                                <img src={poster.match.awayTeam.logoUrl} className="w-10 h-10 object-contain shrink-0" />
                                                <span className="text-[10px] font-bold text-white text-left leading-tight truncate uppercase font-['Syne']">
                                                    {poster.match.awayTeam.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center gap-0 border-l border-white/10 pl-3 h-full">
                                        <button 
                                            onClick={(e) => handleShare(e, poster)}
                                            className="text-white hover:text-gray-300 transition-colors p-2"
                                        >
                                            <Share2 size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => requestDelete(e, poster.id)}
                                            className="text-red-500 hover:text-red-400 transition-colors p-2"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                {poster.type === 'program' && (
                                    <div className="mt-[-15px] bg-white text-black text-[7px] font-bold px-2 py-0.5 rounded-[30px] uppercase tracking-wider shadow-sm font-['Syne']">
                                        PROGRAMME
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
             ))}
           </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm aspect-[9/16] rounded-[30px] overflow-hidden shadow-2xl border border-white/10 bg-black">
                <img src={selectedImage.finalPosterUrl || selectedImage.backgroundImage} className="w-full h-full object-cover" />
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-6 right-6 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors z-50"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
      )}

      {posterToDelete && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-[#111] border border-white/10 rounded-[30px] p-6 w-full max-w-xs flex flex-col items-center gap-4 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                    <AlertTriangle size={24} />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-white font-['Syne'] uppercase mb-1">{t('modal_delete_title')}</h3>
                    <p className="text-xs text-gray-400 font-['Montserrat']">{t('modal_delete_subtitle')}</p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                    <button 
                        onClick={() => setPosterToDelete(null)}
                        className="flex-1 py-3 rounded-full bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-colors uppercase tracking-wider"
                    >
                        {t('cancel')}
                    </button>
                    <button 
                        onClick={performDelete}
                        className="flex-1 py-3 rounded-full bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors uppercase tracking-wider shadow-lg shadow-red-900/20"
                    >
                        {t('delete')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
