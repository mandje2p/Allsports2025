
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Camera, User, Briefcase, MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    companyAddress: '',
    avatarUrl: 'https://all-sports.co/app/img/Allsports-logo.png'
  });

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

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    // Save profile to local storage (mock backend)
    const newProfile = {
        ...formData,
        email: "user@example.com", // Placeholder
        password: "password",
        subscription: "FREE" // Start as free
    };
    localStorage.setItem('allsports_user_profile', JSON.stringify(newProfile));
    
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-black text-white fade-in flex flex-col px-6 pt-12 pb-12">
      
      <div className="flex-1 flex flex-col">
        <h1 className="text-3xl font-bold text-white mb-2 font-['Syne'] text-center mt-8">{t('onboarding_title')}</h1>
        <p className="text-gray-400 text-sm text-center mb-10 font-['Montserrat']">{t('onboarding_subtitle')}</p>

        <form onSubmit={handleFinish} className="flex flex-col gap-6">
            
            {/* Logo Upload */}
            <div className="flex justify-center mb-4">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-dashed border-white/30 hover:border-white transition-colors cursor-pointer group bg-white/5 flex items-center justify-center p-4"
                >
                    <img src={formData.avatarUrl} className="w-full h-full object-contain opacity-60 group-hover:opacity-40 transition-opacity" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Camera size={24} className="text-white drop-shadow-lg mb-1" />
                        <span className="text-[8px] font-bold uppercase tracking-widest drop-shadow-md text-center px-2">
                            {t('onboarding_upload_logo')}
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

            <InputField 
                label={t('profile_label_name')} 
                value={formData.name} 
                onChange={(v) => handleChange('name', v)} 
                icon={<User size={14} />}
                required
            />
            <InputField 
                label={t('profile_label_company')} 
                value={formData.companyName} 
                onChange={(v) => handleChange('companyName', v)} 
                icon={<Briefcase size={14} />}
                required
            />
            <InputField 
                label={t('profile_label_address')} 
                value={formData.companyAddress} 
                onChange={(v) => handleChange('companyAddress', v)} 
                icon={<MapPin size={14} />}
                required
            />

            <div className="mt-auto pt-8">
                <Button type="submit" fullWidth className="bg-white text-black font-bold">
                    {t('onboarding_btn_finish')}
                </Button>
            </div>
        </form>
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
  required?: boolean;
}> = ({ label, value, onChange, type = 'text', icon, required }) => (
  <div className="flex flex-col gap-2">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{label}</label>
      <div className="relative">
          <input 
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
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
