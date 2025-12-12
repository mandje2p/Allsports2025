
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Camera, User, Briefcase, MapPin, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { StickyHeader } from '../components/StickyHeader';
import { useAuth } from '../contexts/AuthContext';
import { saveUserProfile } from '../services/profileService';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    companyAddress: '',
    avatarUrl: 'https://all-sports.co/app/img/Allsports-logo.png'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
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

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Save profile to Firestore
      await saveUserProfile({
        name: formData.name,
        companyName: formData.companyName,
        companyAddress: formData.companyAddress,
        avatarUrl: formData.avatarUrl,
        subscription: 'FREE'
      });
      
      navigate('/subscription');
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-black text-white fade-in flex flex-col px-6 overflow-hidden">
      <StickyHeader showLogo={true} />

      {/* Increased top padding to 40 - Reduced for better spacing */}
      <div className="flex-1 flex flex-col pt-[120px] pb-8 h-full justify-between">
        <form onSubmit={handleNext} className="flex flex-col h-full w-full">
            
            <div className="flex-1 flex flex-col gap-6 justify-center w-full">
                <div className="flex justify-center">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-dashed border-white/30 hover:border-white transition-colors cursor-pointer group bg-white/5 flex items-center justify-center p-4"
                    >
                        <img src={formData.avatarUrl} className="w-full h-full object-contain opacity-60 group-hover:opacity-40 transition-opacity" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Camera size={20} className="text-white drop-shadow-lg mb-1" />
                            <span className="text-[8px] font-bold uppercase tracking-widest drop-shadow-md text-center px-2">
                                {t('onboarding_upload_logo')}
                            </span>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full">
                    <InputField 
                        placeholder={t('profile_label_name')} 
                        value={formData.name} 
                        onChange={(v) => handleChange('name', v)} 
                        icon={<User size={14} />}
                        required
                    />
                    <InputField 
                        placeholder={t('profile_label_company')} 
                        value={formData.companyName} 
                        onChange={(v) => handleChange('companyName', v)} 
                        icon={<Briefcase size={14} />}
                        required
                    />
                    <InputField 
                        placeholder={t('profile_label_address')} 
                        value={formData.companyAddress} 
                        onChange={(v) => handleChange('companyAddress', v)} 
                        icon={<MapPin size={14} />}
                        required
                    />
                </div>
            </div>

            <div className="mt-auto w-full flex flex-col gap-2">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-xs text-center">
                    {error}
                  </div>
                )}
                <Button 
                  type="submit" 
                  fullWidth 
                  disabled={loading}
                  className="bg-white text-black font-bold rounded-[30px] py-3 text-sm font-inherit normal-case flex items-center justify-center gap-2 disabled:opacity-50" 
                  style={{ fontFamily: 'inherit' }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      {t('processing')}
                    </>
                  ) : (
                    t('next')
                  )}
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
};

const InputField: React.FC<{
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  icon?: React.ReactNode;
  required?: boolean;
}> = ({ placeholder, value, onChange, type = 'text', icon, required }) => (
  <div className="relative">
      <input 
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-[#111] border border-white/10 rounded-[30px] pl-10 pr-4 py-2.5 text-[10px] text-white placeholder-gray-500 font-['Syne'] focus:outline-none focus:border-white/40 focus:bg-white/5 transition-all"
      />
      {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              {icon}
          </div>
      )}
  </div>
);
