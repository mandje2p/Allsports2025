
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StickyHeader } from '../components/StickyHeader';
import { Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserBackgrounds, UserBackground } from '../services/storageService';

const BACKGROUNDS = [
  "https://all-sports.co/app/img/bg/foot/standard/bg-standard-1.jpg",
  "https://all-sports.co/app/img/bg/foot/standard/bg-standard-2.jpg",
  "https://all-sports.co/app/img/bg/foot/standard/bg-standard-3.jpg",
  "https://all-sports.co/app/img/bg/foot/standard/bg-standard-4.jpg",
  "https://all-sports.co/app/img/bg/foot/standard/bg-standard-5.jpg"
];

export const BackgroundSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  
  // FIXED: Destructure targetIndex correctly
  const { matches, targetIndex, generatedBackgrounds, matchStyles, mode } = location.state || {};
  
  const [selectedCategory, setSelectedCategory] = useState<{ id: string, name: string } | null>(null);
  const [userBackgrounds, setUserBackgrounds] = useState<UserBackground[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [latestGalleryImage, setLatestGalleryImage] = useState<string | null>(null);

  // Categories list - My Gallery is dynamic based on translations
  const CATEGORIES = [
    { id: 'my_gallery', name: t('cat_my_gallery') },
    { id: 'stades', name: 'Stades' },
    { id: 'c1', name: 'Champions League' },
    { id: 'abstract', name: 'Abstract' },
    { id: 'euro', name: 'Euro' },
    { id: 'worldcup', name: 'Coupe du Monde' },
  ];

  const getRandomPreview = () => {
    return BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
  };

  const handleCategoryClick = (cat: typeof CATEGORIES[0]) => {
      setSelectedCategory(cat);
  };

  // Fetch gallery items for both thumbnail preview and full list
  useEffect(() => {
    // Logic to update thumbnail
    const loadPreview = async () => {
        try {
            const bgs = await getUserBackgrounds();
            if (bgs.length > 0) {
                setLatestGalleryImage(bgs[0].imageUrl);
            }
        } catch (e) { console.error(e); }
    };
    loadPreview();

    // Logic for loading full list if category selected
    if (selectedCategory?.id === 'my_gallery') {
        const loadGallery = async () => {
            setIsLoadingGallery(true);
            try {
                const bgs = await getUserBackgrounds();
                setUserBackgrounds(bgs);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoadingGallery(false);
            }
        };
        loadGallery();
    }
  }, [selectedCategory]);

  const handleBackgroundSelect = (url: string) => {
    // Navigate back to generator with the selected background info AND preserved state
    navigate('/generator', {
        state: {
            matches,
            targetIndex, 
            selectedBackground: url,
            generatedBackgrounds,
            matchStyles,
            mode
        }
    });
  };

  const renderBackgrounds = () => {
      // My Gallery Special Render
      if (selectedCategory?.id === 'my_gallery') {
          if (isLoadingGallery) {
              return (
                  <div className="flex justify-center mt-20">
                      <Loader2 className="animate-spin text-white" size={32} />
                  </div>
              );
          }
          if (userBackgrounds.length === 0) {
              return (
                  <div className="flex justify-center mt-20 text-gray-500">
                      <p>{t('gallery_bg_empty')}</p>
                  </div>
              );
          }
          return (
             <div className="grid grid-cols-2 gap-4">
                {userBackgrounds.map((bg) => (
                    <div 
                        key={bg.id} 
                        onClick={() => handleBackgroundSelect(bg.imageUrl)}
                        className="aspect-[9/16] bg-[#111] rounded-2xl overflow-hidden cursor-pointer relative group border border-white/10 hover:border-white transition-all"
                    >
                        <img 
                            src={bg.imageUrl} 
                            alt="User Background" 
                            className="w-full h-full object-cover opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="bg-white rounded-full p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                <Check size={20} className="text-black" strokeWidth={3} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          );
      }

      // Default Static Backgrounds for other categories
      return (
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
                        className="w-full h-full object-cover opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white rounded-full p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                            <Check size={20} className="text-black" strokeWidth={3} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
      );
  };

  return (
    <div className="min-h-screen bg-black text-white fade-in">
      <StickyHeader />

      {/* Increased padding top to 44 - Reduced for better spacing */}
      <div className="pt-[124px] px-6 pb-12 flex flex-col gap-6">
        
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
                            {/* Specific preview for My Gallery */}
                            {cat.id === 'my_gallery' ? (
                                latestGalleryImage ? (
                                    <img 
                                        src={latestGalleryImage} 
                                        alt={cat.name} 
                                        className="absolute inset-0 w-full h-full object-cover opacity-100 transition-opacity"
                                    />
                                ) : (
                                    <div className="absolute inset-0 w-full h-full bg-[#222] flex items-center justify-center opacity-100 transition-opacity">
                                        <ImageIcon className="text-white/20" size={48} />
                                    </div>
                                )
                            ) : (
                                <img 
                                    src={getRandomPreview()} 
                                    alt={cat.name} 
                                    className="absolute inset-0 w-full h-full object-cover opacity-100 transition-opacity"
                                />
                            )}
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                                <h3 className="font-bold text-sm font-['Syne'] uppercase text-white drop-shadow-md">{cat.name}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        ) : (
            // Specific Backgrounds View
            <>
                {renderBackgrounds()}
            </>
        )}
      </div>
    </div>
  );
};
