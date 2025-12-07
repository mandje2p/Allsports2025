
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StickyHeader } from '../components/StickyHeader';
import { useLanguage } from '../contexts/LanguageContext';
import { Camera, Edit2, Trophy, Star, Shield, ArrowLeft, Mail, MapPin, Briefcase, Lock, Image as ImageIcon, Calendar, CreditCard, ExternalLink, Zap, Target, Award, LogOut } from 'lucide-react';
import { Button } from '../components/Button';

// Simulated storage for profile
const PROFILE_STORAGE_KEY = 'allsports_user_profile';

interface UserProfile {
  name: string;
  companyName: string;
  companyAddress: string;
  email: string;
  password: string; // Just for UI demo
  avatarUrl: string;
  subscription: 'PRO' | 'FREE';
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Alex Smith",
  companyName: "AS Media",
  companyAddress: "123 Sport Ave, Paris",
  email: "alex.smith@example.com",
  password: "password123",
  avatarUrl: "https://all-sports.co/app/img/Allsports-logo.png", // Updated to All Sports Logo
  subscription: "PRO"
};

export const Profile: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // State for view vs edit mode
  const [viewMode, setViewMode] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  // Load profile on mount
  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (saved) {
      setProfile(JSON.parse(saved));
    } else {
      // Ensure default has the correct logo if nothing saved
      setProfile(DEFAULT_PROFILE);
    }
  }, []);

  const handleSave = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
    setViewMode('VIEW');
  };

  const handleLogout = () => {
      // Logic for logout (e.g., clear tokens if any)
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
  const badges = [
    { id: 1, icon: Trophy, label: "Creator", level: "LVL 1", active: true, color: "from-yellow-400 to-orange-600" },
    { id: 2, icon: Zap, label: "Fast", level: "LVL 5", active: true, color: "from-blue-400 to-cyan-400" },
    { id: 3, icon: Target, label: "Sniper", level: "LVL 2", active: true, color: "from-red-500 to-pink-600" },
    { id: 4, icon: Star, label: "Expert", level: "LOCKED", active: false, color: "from-purple-500 to-indigo-600" },
    { id: 5, icon: Shield, label: "Legend", level: "LOCKED", active: false, color: "from-emerald-400 to-teal-600" },
    { id: 6, icon: Award, label: "Elite", level: "LOCKED", active: false, color: "from-gray-200 to-white" },
  ];

  return (
    <div className="min-h-screen bg-black text-white fade-in">
       <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;700;900&display=swap');
      `}</style>
      
      {/* Removed Title */}
      <StickyHeader />

      {/* Increased top padding to 40 */}
      <div className="pt-40 px-6 pb-32 flex flex-col gap-8">
        
        {/* Top Section: Avatar & Info - Centered Layout */}
        <div className="flex flex-col items-center gap-5 mt-4">
            {/* Avatar - Updated to contain the logo properly */}
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl shrink-0 bg-black flex items-center justify-center p-2">
              <img src={profile.avatarUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>

            {/* Info Column - Centered */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              
              {/* Name & PRO Badge Row */}
              <div className="flex items-center gap-3 mb-2 relative">
                  {/* Name - Syne Font, Thinner (400) */}
                  <h2 
                    className="text-2xl text-white leading-tight truncate"
                    style={{ fontFamily: "'Syne', sans-serif", fontWeight: 400 }}
                  >
                    {profile.name}
                  </h2>
                  
                  {/* PRO Badge - Gold & Black, Top Right alignment */}
                  {profile.subscription === 'PRO' && (
                    <div className="bg-[#FFD700] text-black text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-lg transform -translate-y-2">
                        {t('profile_sub_pro')}
                    </div>
                  )}
              </div>

              {/* Company & Details - Centered List */}
              <div className="flex flex-col items-center gap-1.5 text-[10px] text-gray-400 font-['Montserrat'] mb-4">
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

        {/* Badges Section - Horizontal Scroll Vertical Pills */}
        <div className="w-full">
            <h3 
                className="text-lg font-bold text-white mb-4 pl-1"
                style={{ fontFamily: "'Syne', sans-serif" }}
            >
                {t('profile_badges_title')}
            </h3>
            
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6">
                {badges.map((badge) => (
                    <div 
                        key={badge.id}
                        className={`
                            relative w-24 h-36 rounded-[35px] shrink-0 border 
                            flex flex-col items-center justify-center gap-3 p-2
                            ${badge.active 
                                ? 'bg-[#111] border-white/10 shadow-lg' 
                                : 'bg-black border-white/5 opacity-50 grayscale'
                            }
                        `}
                    >
                        {/* Icon Circle */}
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center shadow-lg`}>
                            <badge.icon size={20} className="text-white drop-shadow-md" />
                        </div>
                        
                        {/* Text Info */}
                        <div className="text-center">
                            <span className={`block text-[10px] font-black uppercase tracking-wider ${badge.active ? 'text-white' : 'text-gray-500'}`}>
                                {badge.level}
                            </span>
                            <span className="block text-[9px] font-medium text-gray-400 mt-0.5 font-['Montserrat']">
                                {badge.label}
                            </span>
                        </div>

                        {/* Active Indicator Dot */}
                        {badge.active && (
                            <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                        )}
                    </div>
                ))}
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
                {/* Stat Card 1: Visuals */}
                <div className="bg-[#111] border border-white/5 rounded-3xl p-5 flex flex-col items-start gap-2 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ImageIcon size={48} />
                    </div>
                    <span className="text-4xl text-white font-normal" style={{ fontFamily: "'Syne', sans-serif" }}>142</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{t('stats_visuals')}</span>
                </div>

                {/* Stat Card 2: Fav League */}
                <div className="bg-[#111] border border-white/5 rounded-3xl p-5 flex flex-col items-start gap-3 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                     <img src="https://all-sports.co/app/img/leagues/Icons-Ligue1.png" className="w-10 h-10 object-contain" alt="Ligue 1" />
                     <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">{t('stats_fav_league')}</span>
                        <span className="text-sm font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>LIGUE 1</span>
                     </div>
                </div>

                {/* Stat Card 3: Fav Sport */}
                <div className="bg-[#111] border border-white/5 rounded-3xl p-5 flex flex-col items-start gap-3 relative overflow-hidden">
                     <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                        <Trophy size={20} className="text-white" />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">{t('stats_fav_sport')}</span>
                        <span className="text-sm font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>FOOTBALL</span>
                     </div>
                </div>

                 {/* Stat Card 4: Member Since */}
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

        {/* Logout Button */}
        <div className="w-full pt-4">
             <button 
                onClick={handleLogout}
                className="w-full bg-[#111] border border-red-900/30 text-red-500 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-red-950/20 transition-colors flex items-center justify-center gap-2"
             >
                <LogOut size={16} />
                {t('profile_logout')}
             </button>
        </div>

      </div>
    </div>
  );
};

// Separate Edit Page Component
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
       {/* Custom Header for Edit Page - Updated PWA Padding */}
       <div className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5 pt-[calc(max(3rem,env(safe-area-inset-top)+1rem))] pb-4 px-6 max-w-md mx-auto flex items-center justify-between">
          {/* Left: Back Arrow */}
          <button onClick={onCancel} className="p-2 -ml-2 text-white/70 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          
          {/* Center: Empty (Title removed) */}
          <div className="flex-1"></div>

          {/* Right: Logo */}
          <img 
            src="https://all-sports.co/app/img/Allsports-logo.png" 
            alt="All Sports" 
            className="h-6 object-contain" 
          />
       </div>

       <div className="pt-36 px-6 pb-12 flex-1 overflow-y-auto">
          
          {/* Avatar Upload */}
          <div className="flex justify-center mb-8">
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-white/20 hover:border-white transition-colors cursor-pointer group bg-black flex items-center justify-center p-4"
            >
                <img src={formData.avatarUrl} className="w-full h-full object-contain opacity-80 group-hover:opacity-50 transition-opacity" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Camera size={32} className="text-white drop-shadow-lg mb-1" />
                    <span className="text-[9px] font-bold uppercase tracking-widest drop-shadow-md text-center px-2">
                        {t('profile_change_photo')}
                    </span>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-5">
             <InputField 
                label={t('profile_label_name')} 
                value={formData.name} 
                onChange={(v) => handleChange('name', v)} 
                icon={<UserIcon />}
             />
             <InputField 
                label={t('profile_label_company')} 
                value={formData.companyName} 
                onChange={(v) => handleChange('companyName', v)} 
                icon={<Briefcase size={14} />}
             />
             <InputField 
                label={t('profile_label_address')} 
                value={formData.companyAddress} 
                onChange={(v) => handleChange('companyAddress', v)} 
                icon={<MapPin size={14} />}
             />
             <InputField 
                label={t('profile_label_email')} 
                value={formData.email} 
                onChange={(v) => handleChange('email', v)} 
                type="email"
                icon={<Mail size={14} />}
             />
             <InputField 
                label={t('profile_label_password')} 
                value={formData.password} 
                onChange={(v) => handleChange('password', v)} 
                type="password"
                icon={<Lock size={14} />}
             />

             {/* Subscription Field - External Link */}
             <div className="flex flex-col gap-2 cursor-pointer" onClick={openStripe}>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('profile_label_sub')}</label>
                <div className="relative group">
                    <div className="w-full bg-[#111] border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm text-white font-['Montserrat'] flex items-center justify-between group-hover:bg-white/5 transition-all">
                        <span>{formData.subscription} - <span className="text-gray-400 font-normal">{t('profile_manage_sub')}</span></span>
                        <ExternalLink size={14} className="text-gray-500 group-hover:text-white" />
                    </div>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <CreditCard size={14} />
                    </div>
                </div>
            </div>

          </div>

          <div className="mt-10">
              <Button onClick={() => onSave(formData)} fullWidth className="bg-white text-black font-bold">
                 {t('profile_btn_save')}
              </Button>
          </div>
       </div>
    </div>
  );
};

const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  icon?: React.ReactNode;
}> = ({ label, value, onChange, type = 'text', icon }) => (
  <div className="flex flex-col gap-2">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{label}</label>
      <div className="relative">
          <input 
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm text-white font-['Montserrat'] focus:outline-none focus:border-white/40 focus:bg-white/5 transition-all"
          />
          {icon && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  {icon}
              </div>
          )}
      </div>
  </div>
);

const UserIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);
