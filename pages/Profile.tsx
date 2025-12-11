
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StickyHeader } from '../components/StickyHeader';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Edit2, MapPin, Briefcase, Mail, Lock, Image as ImageIcon, Calendar, CreditCard, LogOut, ChevronRight, ArrowLeft, Zap } from 'lucide-react';
import { Button } from '../components/Button';

// Local storage key
const PROFILE_STORAGE_KEY = 'allsports_user_profile';

interface UserProfile {
  name: string;
  companyName: string;
  companyAddress: string;
  email: string;
  password: string; // Just for UI demo
  avatarUrl: string;
  subscription: 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM';
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Alex Smith",
  companyName: "AS Media",
  companyAddress: "123 Sport Ave, Paris",
  email: "alex.smith@example.com",
  password: "password123",
  avatarUrl: "https://all-sports.co/app/img/Allsports-logo.png",
  subscription: "PRO"
};

const getBadgeStyle = (sub: string) => {
  switch (sub) {
    case 'FREE': return { bg: '#B8B8B8', text: 'black', label: 'FREE' };
    case 'BASIC': return { bg: '#5C5C5C', text: 'white', label: 'BASIC' };
    case 'PRO': return { bg: '#BA784C', text: 'white', label: 'PRO' };
    case 'PREMIUM': return { bg: '#C59C33', text: 'white', label: 'PREMIUM' };
    default: return { bg: '#B8B8B8', text: 'black', label: 'FREE' };
  }
};

export const Profile: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  // State for view vs edit mode
  const [viewMode, setViewMode] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [credits, setCredits] = useState(0);

  // Load profile on mount from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (saved) {
      setProfile(JSON.parse(saved));
    } else {
      setProfile(DEFAULT_PROFILE);
    }
    // Random credits for demo
    setCredits(Math.floor(Math.random() * 101));
  }, []);

  const handleSave = async (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
    setViewMode('VIEW');
  };

  const handleLogout = async () => {
      await logout();
      navigate('/login');
  };

  if (viewMode === 'EDIT') {
    return (
      <EditProfilePage 
        currentProfile={profile} 
        onSave={handleSave} 
        onCancel={() => setViewMode('VIEW')} 
        t={t}
      />
    );
  }

  // Badges Data Mock
  const BADGE_IMAGE = "https://all-sports.co/app/img/badges/badge-C1.png";
  const badges = [
    { id: 1, imageUrl: BADGE_IMAGE, topText: "ROI EUROPÉEN", bottomText: "LVL 3", active: true },
    { id: 2, imageUrl: BADGE_IMAGE, topText: "BLOQUÉ", bottomText: "", active: false },
    { id: 3, imageUrl: BADGE_IMAGE, topText: "BLOQUÉ", bottomText: "", active: false },
  ];

  const badgeStyle = getBadgeStyle(profile.subscription);

  return (
    <div className="min-h-screen bg-black text-white fade-in">
       <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;700;900&display=swap');
      `}</style>
      
      <StickyHeader />

      {/* Reduced bottom padding to prevent scroll, increased top padding to 44 - Reduced for better spacing */}
      <div className="pt-[129px] px-6 pb-0 flex flex-col gap-6">
        
        {/* Top Section: Avatar & Info - Centered Layout */}
        <div className="flex flex-col items-center gap-5 mt-4">
            {/* Avatar */}
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl shrink-0 bg-black flex items-center justify-center p-2">
              <img src={profile.avatarUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>

            {/* Info Column - Centered */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              
              {/* Badge & Name Column - Badge Above Name */}
              <div className="flex flex-col items-center gap-2 mb-1 relative w-full">
                  <div 
                    className="text-[9px] font-black px-3 py-1 rounded-md uppercase tracking-wider shadow-lg"
                    style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text }}
                  >
                      {badgeStyle.label}
                  </div>
                  <h2 
                    className="text-2xl text-white leading-tight truncate"
                    style={{ fontFamily: "'Syne', sans-serif", fontWeight: 400 }}
                  >
                    {profile.name}
                  </h2>
                  
                  {/* Credits Indicator */}
                  <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                      <Zap size={10} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-[10px] font-bold text-gray-300 font-['Syne'] uppercase">
                          {credits}/100 CREDITS RESTANTS
                      </span>
                  </div>
              </div>

              {/* Company & Details - Centered List */}
              <div className="flex flex-col items-center gap-1.5 text-[10px] text-gray-400 font-['Montserrat'] mb-4 mt-3">
                <div className="flex items-center gap-1.5">
                    <Briefcase size={10} className="shrink-0" />
                    <span>{profile.companyName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <MapPin size={10} className="shrink-0" />
                    <span>{profile.companyAddress}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Mail size={10} className="shrink-0" />
                    <span>{profile.email}</span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <button 
                onClick={() => setViewMode('EDIT')}
                className="flex items-center gap-1.5 bg-white text-black px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all shadow-lg hover:bg-gray-200"
                >
                <Edit2 size={12} />
                {t('profile_btn_edit')}
              </button>
            </div>
        </div>

        {/* Badges Section */}
        <div className="w-full">
            <h3 
                className="text-lg font-bold text-white mb-4 pl-1"
                style={{ fontFamily: "'Syne', sans-serif" }}
            >
                {t('profile_badges_title')}
            </h3>
            
            <div className="flex gap-0 items-center -ml-4 overflow-visible">
                {badges.map((badge) => (
                    <div 
                        key={badge.id}
                        className="relative w-[90px] h-[140px] shrink-0 flex items-center justify-center transition-transform hover:z-20 hover:scale-105"
                    >
                        <img 
                            src={badge.imageUrl} 
                            alt="Badge"
                            className={`absolute inset-0 w-full h-full object-contain drop-shadow-xl ${!badge.active ? 'grayscale opacity-30' : ''}`}
                        />
                        <div className="relative z-10 flex flex-col items-center justify-center mt-6 w-full px-1">
                            <span 
                                className="text-[9px] font-bold uppercase text-center leading-tight text-white drop-shadow-md font-['Syne'] break-words w-full"
                            >
                                {badge.topText.split(' ').map((word, i) => (
                                    <React.Fragment key={i}>
                                        {word}
                                        {i < badge.topText.split(' ').length - 1 && <br />}
                                    </React.Fragment>
                                ))}
                            </span>
                            {badge.bottomText && (
                                <span className="text-[8px] font-bold text-gray-200 mt-1 font-['Syne'] drop-shadow-sm">
                                    {badge.bottomText}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                
                <button 
                    onClick={() => navigate('/badges')}
                    className="relative w-[90px] h-[140px] shrink-0 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform"
                >
                     <ChevronRight size={24} className="text-white mb-1" />
                     <span className="text-[9px] font-bold text-gray-400 uppercase text-center font-['Syne'] leading-tight">
                         VOIR TOUS<br />LES BADGES
                     </span>
                </button>
            </div>
        </div>


        {/* Statistics Section */}
        <div className="w-full">
            <h3 
                className="text-lg font-bold text-white mb-4 pl-1"
                style={{ fontFamily: "'Syne', sans-serif" }}
            >
                {t('profile_stats_title')}
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#111] border border-white/5 rounded-3xl p-5 flex flex-col items-start gap-2 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ImageIcon size={48} />
                    </div>
                    <span className="text-4xl text-white font-normal" style={{ fontFamily: "'Syne', sans-serif" }}>142</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{t('stats_visuals')}</span>
                </div>

                <div className="bg-[#111] border border-white/5 rounded-3xl p-5 flex flex-col items-start gap-3 relative overflow-hidden group">
                     {/* Fav League - Full fill, no padding, no background ring */}
                     <div className="w-10 h-10 rounded-full overflow-hidden">
                         <img src="https://all-sports.co/app/img/leagues/Icons-Ligue1.png" className="w-full h-full object-cover" alt="Ligue 1" />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">{t('stats_fav_league')}</span>
                        <span className="text-sm font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>LIGUE 1</span>
                     </div>
                </div>

                {/* Stat Card 3: Fav Club - Full fill, no padding, no background ring */}
                <div className="bg-[#111] border border-white/5 rounded-3xl p-5 flex flex-col items-start gap-3 relative overflow-hidden">
                     <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img src="https://media.api-sports.io/football/teams/85.png" alt="PSG" className="w-full h-full object-cover" />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">{t('stats_fav_club')}</span>
                        <span className="text-sm font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>PSG</span>
                     </div>
                </div>

                <div className="bg-[#111] border border-white/5 rounded-3xl p-5 flex flex-col items-start gap-3 relative overflow-hidden">
                     <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                        <Calendar size={20} className="text-white" />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">{t('stats_member_since')}</span>
                        <span className="text-sm font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>DEC 2024</span>
                     </div>
                </div>
            </div>
        </div>

        {/* Logout Button - Red Border, Black BG, Red Text, Small, No Bottom Padding in container, increased padding bottom to 10px */}
        <div className="w-full flex justify-center pt-2 pb-[10px]">
             <button 
                onClick={handleLogout}
                className="w-auto px-5 py-2 bg-black border border-red-600 text-red-600 rounded-full text-[9px] font-bold uppercase tracking-wider hover:bg-red-900/10 transition-colors flex items-center justify-center gap-2"
                style={{ fontFamily: "'Syne', sans-serif" }}
             >
                <LogOut size={12} />
                {t('profile_logout')}
             </button>
        </div>

      </div>
    </div>
  );
};

// ... EditProfilePage (remains same)
const EditProfilePage: React.FC<{
  currentProfile: UserProfile;
  onSave: (p: UserProfile) => void;
  onCancel: () => void;
  t: (k: string) => string;
}> = ({ currentProfile, onSave, onCancel, t }) => {
  const [formData, setFormData] = useState<UserProfile>(currentProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          handleChange('avatarUrl', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const openStripe = () => {
      window.open('https://stripe.com', '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-white fade-in flex flex-col relative z-[200]">
       <div className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl pt-[calc(max(3rem,env(safe-area-inset-top)+1rem))] pb-4 px-6 max-w-md mx-auto flex items-center justify-between">
          <button onClick={onCancel} className="p-2 -ml-2 text-white/70 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1"></div>
          <img src="https://all-sports.co/app/img/Allsports-logo.png" alt="All Sports" className="h-6 object-contain" />
       </div>

       {/* Increased padding top to 40 - Reduced spacing */}
       <div className="pt-[135px] px-6 pb-12 flex-1 overflow-y-auto">
          <div className="flex justify-center mb-8">
             <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/20 bg-black p-2">
                   <img src={formData.avatarUrl} className="w-full h-full object-contain" />
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-white rounded-full text-black shadow-lg hover:bg-gray-200 transition-colors"
                >
                    <Camera size={16} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
             </div>
          </div>

          <div className="flex flex-col gap-6">
             {/* Edit Fields */}
             <div className="space-y-4">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">{t('profile_title')}</h3>
                 
                 <div className="flex flex-col gap-1">
                    <input 
                      type="text" 
                      placeholder={t('profile_label_name').toUpperCase()}
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-['Montserrat'] focus:border-white/40 outline-none"
                    />
                 </div>
                 <div className="flex flex-col gap-1">
                    <input 
                      type="text" 
                      placeholder={t('profile_label_company').toUpperCase()}
                      value={formData.companyName}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-['Montserrat'] focus:border-white/40 outline-none"
                    />
                 </div>
                 <div className="flex flex-col gap-1">
                    <input 
                      type="text" 
                      placeholder={t('profile_label_address').toUpperCase()}
                      value={formData.companyAddress}
                      onChange={(e) => handleChange('companyAddress', e.target.value)}
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-['Montserrat'] focus:border-white/40 outline-none"
                    />
                 </div>
             </div>

             <div className="space-y-4">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mt-4">Compte</h3>
                 
                 <div className="flex flex-col gap-1">
                    <input 
                      type="email" 
                      placeholder={t('profile_label_email').toUpperCase()}
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-['Montserrat'] focus:border-white/40 outline-none"
                    />
                 </div>
                 <div className="flex flex-col gap-1">
                    <div className="relative">
                        <input 
                          type="password" 
                          placeholder={t('profile_label_password').toUpperCase()}
                          value={formData.password}
                          onChange={(e) => handleChange('password', e.target.value)}
                          className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-['Montserrat'] focus:border-white/40 outline-none pr-10"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                            <Lock size={14} />
                        </div>
                    </div>
                 </div>
             </div>
             
             {/* Sub Info */}
             <div className="space-y-4">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mt-4">{t('profile_label_sub')}</h3>
                 <div className="bg-gradient-to-r from-gray-900 to-black border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700]">
                             <CreditCard size={20} />
                         </div>
                         <div>
                             <span className="block text-sm font-bold text-white">PLAN PRO</span>
                             <span className="block text-[10px] text-gray-400">Actif jusqu'au 12/12/2025</span>
                         </div>
                     </div>
                     <button onClick={openStripe} className="text-[10px] font-bold text-white underline decoration-white/30 underline-offset-4 hover:text-gray-300">
                         {t('profile_manage_sub')}
                     </button>
                 </div>
             </div>
          </div>

          <div className="mt-12 mb-8">
              <Button onClick={() => onSave(formData)} fullWidth className="bg-white text-black font-bold">
                  {t('profile_btn_save')}
              </Button>
          </div>
       </div>
    </div>
  );
};
