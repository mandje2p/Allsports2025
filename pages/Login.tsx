
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ArrowLeft, Apple } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login
    navigate('/home');
  };

  const handleGoogleLogin = () => {
    // Simulate Google Login
    navigate('/home');
  };

  return (
    <div className="h-full w-full relative flex flex-col">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 bg-gray-900">
        <img 
          src="https://2points.fr/wp-content/uploads/2025/12/Login.png" 
          alt="Login Background" 
          className="w-full h-full object-cover brightness-[0.6]"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.backgroundColor = '#1a1a1a'; // Fallback color
          }}
        />
         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
      </div>

      <div className="relative z-20 flex-1 flex flex-col px-6 pt-12">
        <button onClick={() => navigate('/')} className="text-white mb-8 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
          <ArrowLeft size={20} />
        </button>

        <div className="mt-auto mb-8 w-full">
            <h1 className="text-3xl font-bold text-white mb-6 font-['Syne']">{t('auth_login_title')}</h1>

           <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold ml-4 mb-2 block text-gray-300">{t('profile_label_email')}</label>
              <input 
                type="email" 
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-gray-500 backdrop-blur-xl focus:outline-none focus:border-white transition-all font-['Montserrat']"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-xs font-bold ml-4 mb-2 block text-gray-300">{t('profile_label_password')}</label>
              <input 
                type="password" 
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-gray-500 backdrop-blur-xl focus:outline-none focus:border-white transition-all font-['Montserrat']"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <Button type="submit" fullWidth className="mt-4 py-4 text-base bg-white text-black hover:bg-gray-200">
              {t('auth_btn_login')}
            </Button>
          </form>

          {/* Social Logins */}
          <div className="flex gap-4 mt-4">
             <Button onClick={handleGoogleLogin} variant="outline" className="flex-1 justify-center border-white/40 hover:bg-white/10 py-4">
               <span className="font-bold text-xl">G</span>
             </Button>
             <Button variant="outline" className="flex-1 justify-center border-white/40 hover:bg-white/10 py-4">
               <Apple size={24} fill="white" />
             </Button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6 font-medium font-['Montserrat']">
            {t('auth_no_account')} <span onClick={() => navigate('/signup')} className="text-white underline decoration-white/50 underline-offset-4 cursor-pointer font-bold">{t('auth_link_signup')}</span>
          </p>
        </div>
        
        {/* Keyboard spacer simulation */}
        <div className="h-8"></div>
      </div>
    </div>
  );
};
