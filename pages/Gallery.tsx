
import React, { useEffect, useState } from 'react';
import { getSavedPosters, deletePoster, SavedPoster } from '../services/storageService';
import { Trash2, Calendar, X, Share2 } from 'lucide-react';
import { StickyHeader } from '../components/StickyHeader';

export const Gallery: React.FC = () => {
  const [posters, setPosters] = useState<SavedPoster[]>([]);
  const [selectedImage, setSelectedImage] = useState<SavedPoster | null>(null);
  const [userProfile, setUserProfile] = useState<any>({});

  useEffect(() => {
    setPosters(getSavedPosters());
    
    // Load profile for preview rendering
    const savedProfile = localStorage.getItem('allsports_user_profile');
    if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
    } else {
        setUserProfile({
            avatarUrl: "https://all-sports.co/app/img/Allsports-logo.png",
            companyAddress: "123 Sport Ave, Paris"
        });
    }
  }, []);

  const handleDelete = (id: string) => {
    deletePoster(id);
    setPosters(getSavedPosters());
  };

  const handleShare = async (poster: SavedPoster) => {
     try {
         // Use finalPosterUrl (composite) if available, otherwise fall back to background
         const imageToShare = poster.finalPosterUrl || poster.backgroundImage;
         
         // STRICT FILENAME FORMAT: "All Sports - Team A vs Team B.jpg"
         const homeName = poster.match.homeTeam.name.trim();
         const awayName = poster.match.awayTeam.name.trim();
         const fileName = `All Sports - ${homeName} vs ${awayName}.jpg`;

         // Improved Base64 to Blob conversion
         const response = await fetch(imageToShare);
         const blob = await response.blob();
         
         // Create proper File object
         const file = new File([blob], fileName, { type: 'image/jpeg' });

         if (navigator.canShare && navigator.canShare({ files: [file] })) {
             await navigator.share({
                 files: [file],
                 // Passing title only can sometimes help toggle the image preview in share sheet
                 title: fileName, 
             }).catch((e) => {
                 if (e.name !== 'AbortError') console.error("Share failed:", e);
             });
         } else {
             // Fallback for desktop or unsupported browsers: download
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

  // Group posters by date
  const groupedPosters = posters.reduce((acc, poster) => {
    const date = poster.match.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(poster);
    return acc;
  }, {} as Record<string, SavedPoster[]>);

  const dates = Object.keys(groupedPosters).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const formattedDateHeader = (date: string) => 
    new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div className="min-h-screen bg-black fade-in text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;700;900&display=swap');
      `}</style>

      {/* Removed Title */}
      <StickyHeader />

      {/* Increased top padding to 44 */}
      <div className="pt-44 px-4 pb-32">
        {posters.length === 0 ? (
           <div className="flex flex-col items-center justify-center mt-20 text-gray-600">
                <p>No saved posters yet.</p>
           </div>
        ) : (
           <div className="flex flex-col gap-8">
             {dates.map(date => (
                <div key={date}>
                    {/* Date Header - Syne Font */}
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <Calendar size={14} className="text-gray-400" />
                        <h3 
                            className="text-xs font-bold text-gray-400 uppercase tracking-widest"
                            style={{ fontFamily: "'Syne', sans-serif" }}
                        >
                            {formattedDateHeader(date)}
                        </h3>
                    </div>

                    {/* List of Items for this Date */}
                    <div className="flex flex-col gap-3">
                        {groupedPosters[date].map(poster => (
                            <div key={poster.id} className="bg-[#111] rounded-2xl p-3 border border-white/5 flex items-center gap-4 h-24">
                                {/* Miniature - Shows Final Composite if available - CLICKABLE */}
                                <div 
                                    onClick={() => setSelectedImage(poster)}
                                    className="relative h-full aspect-[9/16] rounded-lg overflow-hidden bg-gray-800 shrink-0 border border-white/10 cursor-pointer active:scale-95 transition-transform"
                                >
                                    <img src={poster.finalPosterUrl || poster.backgroundImage} className="w-full h-full object-cover" />
                                </div>

                                {/* Content: Horizontal Teams Layout */}
                                <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
                                    
                                    {/* Home Team */}
                                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                                        <span className="text-[10px] font-bold text-white text-right leading-tight truncate font-['Montserrat'] uppercase">
                                             {poster.match.homeTeam.name}
                                        </span>
                                        <img src={poster.match.homeTeam.logoUrl} className="w-12 h-12 object-contain shrink-0" />
                                    </div>

                                    {/* VS */}
                                    <span className="text-[12px] font-normal text-gray-500 font-['Montserrat'] shrink-0">VS</span>

                                    {/* Away Team */}
                                    <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                                         <img src={poster.match.awayTeam.logoUrl} className="w-12 h-12 object-contain shrink-0" />
                                         <span className="text-[10px] font-bold text-white text-left leading-tight truncate font-['Montserrat'] uppercase">
                                             {poster.match.awayTeam.name}
                                         </span>
                                    </div>

                                </div>

                                {/* Actions - Vertical Layout, Centered, No Backgrounds */}
                                <div className="flex flex-col items-center justify-center gap-0 border-l border-white/10 pl-3 h-full">
                                    {/* Eye Icon Removed */}
                                    <button 
                                        onClick={() => handleShare(poster)}
                                        className="text-white hover:text-gray-300 transition-colors p-2"
                                    >
                                        <Share2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(poster.id)}
                                        className="text-red-500 hover:text-red-400 transition-colors p-2"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             ))}
           </div>
        )}
      </div>

      {/* Full Screen Modal with Visual Overlay */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
            
            <div className="relative w-full max-w-sm aspect-[9/16] rounded-[30px] overflow-hidden shadow-2xl border border-white/10 bg-black">
                {/* Background - Use Final Poster for fidelity if available */}
                <img src={selectedImage.finalPosterUrl || selectedImage.backgroundImage} className="w-full h-full object-cover" />
                
                {/* Close Button Inside Image - Top Right */}
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-6 right-6 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors z-50"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
