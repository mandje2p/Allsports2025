
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StickyHeader } from '../components/StickyHeader';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Edit2, MapPin, Briefcase, Mail, Lock, Image as ImageIcon, Calendar, CreditCard, LogOut, ChevronRight, ArrowLeft, X, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import { getUserProfile, saveUserProfile, changeUserPassword, UserProfile as FirestoreProfile } from '../services/profileService';
import { auth } from '../config/firebase';

interface UserProfile extends FirestoreProfile {
  password?: string; // Not stored, just for UI
}

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  companyName: "",
  companyAddress: "",
  email: "",
  avatarUrl: "https://all-sports.co/app/img/Allsports-logo.png",
  subscription: "FREE"
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
  const { logout, currentUser } = useAuth();
  
  // State for view vs edit mode
  const [viewMode, setViewMode] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Check if user has email/password provider
  const hasEmailPassword = currentUser?.email && 
    auth.currentUser?.providerData.some(provider => provider.providerId === 'password');

  // Load profile from Firestore
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const firestoreProfile = await getUserProfile();
        if (firestoreProfile) {
          setProfile(firestoreProfile);
        } else {
          // If no profile exists, use current user email
          setProfile({
            ...DEFAULT_PROFILE,
            email: currentUser?.email || '',
            name: currentUser?.email?.split('@')[0] || ''
          });
        }
      } catch (err: any) {
        console.error('Error loading profile:', err);
        setError(err.message || 'Failed to load profile');
        // Fallback to default with email
        setProfile({
          ...DEFAULT_PROFILE,
          email: currentUser?.email || ''
        });
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadProfile();
    }
  }, [currentUser]);

  const handleSave = async (updatedProfile: UserProfile) => {
    setError('');
    try {
      // Don't save email or password to Firestore (email comes from auth, password is handled separately)
      const { email, password, ...profileToSave } = updatedProfile;
      await saveUserProfile(profileToSave);
      setProfile(updatedProfile);
      setViewMode('VIEW');
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile');
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    
    // Validation
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Veuillez remplir tous les champs.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setChangingPassword(true);
    try {
      await changeUserPassword(passwordData.oldPassword, passwordData.newPassword);
      // Success - close modal and reset form
      setShowPasswordModal(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordError('');
    } catch (err: any) {
      setPasswordError(err.message || 'Échec du changement de mot de passe.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
      await logout();
      navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (viewMode === 'EDIT') {
    return (
      <EditProfilePage 
        currentProfile={profile}
        currentUserEmail={currentUser?.email || ''}
        hasEmailPassword={hasEmailPassword || false}
        onSave={handleSave} 
        onCancel={() => setViewMode('VIEW')}
        onPasswordChangeClick={() => setShowPasswordModal(true)}
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

      {error && (
        <div className="pt-[129px] px-6 pb-4">
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-xs">
            {error}
          </div>
        </div>
      )}

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
                    {profile.name || 'Utilisateur'}
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
              <div className="flex flex-col items-center gap-1.5 text-[10px] text-gray-400 font-['Montserrat'] mb-4">
                {profile.companyName && (
                  <div className="flex items-center gap-1.5">
                      <Briefcase size={10} className="shrink-0" />
                      <span>{profile.companyName}</span>
                  </div>
                )}
                {profile.companyAddress && (
                  <div className="flex items-center gap-1.5">
                      <MapPin size={10} className="shrink-0" />
                      <span>{profile.companyAddress}</span>
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-center gap-1.5">
                      <Mail size={10} className="shrink-0" />
                      <span>{profile.email}</span>
                  </div>
                )}
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

        {/* Logout Button */}
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

      {/* Password Change Modal */}
      {showPasswordModal && (
        <PasswordChangeModal
          passwordData={passwordData}
          setPasswordData={setPasswordData}
          passwordError={passwordError}
          changingPassword={changingPassword}
          onClose={() => {
            setShowPasswordModal(false);
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordError('');
          }}
          onSubmit={handlePasswordChange}
        />
      )}
    </div>
  );
};

// Edit Profile Page Component
const EditProfilePage: React.FC<{
  currentProfile: UserProfile;
  currentUserEmail: string;
  hasEmailPassword: boolean;
  onSave: (p: UserProfile) => void;
  onCancel: () => void;
  onPasswordChangeClick: () => void;
  t: (k: string) => string;
}> = ({ currentProfile, currentUserEmail, hasEmailPassword, onSave, onCancel, onPasswordChangeClick, t }) => {
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
                 
                 {/* Email - Read Only */}
                 <div className="flex flex-col gap-1">
                    <input 
                      type="email" 
                      placeholder={t('profile_label_email').toUpperCase()}
                      value={currentUserEmail}
                      disabled
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-500 font-['Montserrat'] cursor-not-allowed opacity-60"
                    />
                 </div>
                 
                 {/* Password - Read Only with Change Link */}
                 {hasEmailPassword && (
                   <div className="flex flex-col gap-1">
                      <div className="relative">
                          <input 
                            type="password" 
                            placeholder={t('profile_label_password').toUpperCase()}
                            value="••••••••"
                            disabled
                            className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-500 font-['Montserrat'] cursor-not-allowed opacity-60 pr-10"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                              <Lock size={14} />
                          </div>
                      </div>
                      <button
                        onClick={onPasswordChangeClick}
                        className="text-[10px] text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 underline-offset-4 text-left mt-1"
                      >
                        Changer le mot de passe
                      </button>
                   </div>
                 )}
                 
                 {!hasEmailPassword && (
                   <div className="text-[10px] text-gray-500 italic">
                     Connexion via {auth.currentUser?.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Apple'}. Le changement de mot de passe n'est pas disponible.
                   </div>
                 )}
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
                             <span className="block text-sm font-bold text-white">PLAN {formData.subscription}</span>
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

// Password Change Modal Component
const PasswordChangeModal: React.FC<{
  passwordData: { oldPassword: string; newPassword: string; confirmPassword: string };
  setPasswordData: (data: { oldPassword: string; newPassword: string; confirmPassword: string }) => void;
  passwordError: string;
  changingPassword: boolean;
  onClose: () => void;
  onSubmit: () => void;
}> = ({ passwordData, setPasswordData, passwordError, changingPassword, onClose, onSubmit }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
      <div className="bg-[#111] border border-white/10 rounded-[30px] p-6 w-full max-w-sm flex flex-col gap-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold font-['Syne'] text-white">Changer le mot de passe</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>

        {passwordError && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-xs">
            {passwordError}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-widest">Ancien mot de passe</label>
            <input
              type="password"
              value={passwordData.oldPassword}
              onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-['Montserrat'] focus:border-white/40 outline-none"
              placeholder="Entrez votre ancien mot de passe"
              disabled={changingPassword}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-widest">Nouveau mot de passe</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-['Montserrat'] focus:border-white/40 outline-none"
              placeholder="Entrez votre nouveau mot de passe"
              disabled={changingPassword}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-widest">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-['Montserrat'] focus:border-white/40 outline-none"
              placeholder="Confirmez votre nouveau mot de passe"
              disabled={changingPassword}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={onClose}
            disabled={changingPassword}
            className="flex-1 py-3 rounded-full bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-colors uppercase tracking-wider disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onSubmit}
            disabled={changingPassword}
            className="flex-1 py-3 rounded-full bg-white text-black font-bold text-xs hover:bg-gray-200 transition-colors uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {changingPassword ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Changement...
              </>
            ) : (
              'Changer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
