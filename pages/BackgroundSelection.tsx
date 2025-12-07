
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StickyHeader } from '../components/StickyHeader';
import { Check } from 'lucide-react';

const BACKGROUNDS = [
  "https://all-sports.co/app/img/bg/foot/standard/bg-standard-1.jpg",
  "https://all-sports.co/app/img/bg/foot/standard/bg-standard-2.jpg",
  "https://all-sports.co/app/img/bg/foot/standard/bg-standard-3.jpg",
  "https://all-sports.co/app/img/bg/foot/standard/bg-standard-4.jpg",
  "https://all-sports.co/app/img/bg/foot/standard/bg-standard-5.jpg"
];

const CATEGORIES = [
  { id: 'stades', name: 'Stades' },
  { id: 'c1', name: 'Champions League' },
  { id: 'abstract', name: 'Abstract' },
  { id: 'euro', name: 'Euro' },
  { id: 'worldcup', name: 'Coupe du Monde' },
];

export const BackgroundSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // FIXED: Destructure targetIndex correctly (was mismatched as currentIndex before)
  const { matches, targetIndex, generatedBackgrounds, matchStyles } = location.state || {};
  
  const [selectedCategory, setSelectedCategory] = useState<{ id: string, name: string } | null>(null);

  const getRandomPreview = () => {
    return BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
  };

  const handleCategoryClick = (cat: typeof CATEGORIES[0]) => {
      setSelectedCategory(cat);
  };

  const handleBackgroundSelect = (url: string) => {
    // Navigate back to generator with the selected background info AND preserved state
    navigate('/generator', {
        state: {
            matches,
            targetIndex, // Pass back the specific index so Generator knows which match to update
            selectedBackground: url,
            generatedBackgrounds,
            matchStyles
        }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white fade-in">
      <StickyHeader />

      <div className="pt-40 px-6 pb-12 flex flex-col gap-6">
        
        {!selectedCategory ? (
            // Categories View
            <>
                <div className="grid grid-cols-2 gap-4">
                    {CATEGORIES.map(cat => (
                        <div 
                            key={cat.id} 
                            onClick={() => handleCategoryClick(cat)}
                            className="aspect-square bg-[#111] border border-white/10 rounded-3xl overflow-hidden cursor-pointer relative group"
                        >
                            {/* Random preview image */}
                            <img 
                                src={getRandomPreview()} 
                                alt={cat.name} 
                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                                <h3 className="font-bold text-sm font-['Syne'] uppercase text-white drop-shadow-md">{cat.name}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        ) : (
            // Specific Backgrounds View (Mocked with the 5 standard images for all categories as requested)
            <>
                <div className="grid grid-cols-2 gap-4">
                    {BACKGROUNDS.map((url, index) => (
                        <div 
                            key={index} 
                            onClick={() => handleBackgroundSelect(url)}
                            className="aspect-[9/16] bg-[#111] rounded-2xl overflow-hidden cursor-pointer relative group border border-white/10 hover:border-white transition-all"
                        >
                            <img 
                                src={url} 
                                alt={`Background ${index + 1}`} 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="bg-white rounded-full p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                    <Check size={20} className="text-black" strokeWidth={3} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )}
      </div>
    </div>
  );
};
