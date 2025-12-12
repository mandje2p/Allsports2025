
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { StickyHeader } from '../components/StickyHeader';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { signup, loginWithGoogle, loginWithApple, currentUser, redirectLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to onboarding if user is authenticated
  useEffect(() => {
    if (!redirectLoading && currentUser) {
      navigate('/onboarding', { replace: true });
    }
  }, [currentUser, redirectLoading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
        await signup(email, password);
        navigate('/onboarding');
    } catch (err: any) {
        console.error('Signup error:', err);
        setError(err.message || 'Failed to create account. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);
    try {
        await loginWithGoogle();
        // Redirect flow will navigate away - navigation happens via useEffect after redirect
    } catch (err: any) {
        console.error('Google signup error:', err);
        if (err.code !== 'auth/redirect-cancelled-by-user') {
          setError(err.message || 'Failed to sign up with Google.');
        }
        setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    setError('');
    setLoading(true);
    try {
        await loginWithApple();
        // Redirect flow will navigate away - navigation happens via useEffect after redirect
    } catch (err: any) {
        console.error('Apple signup error:', err);
        if (err.code !== 'auth/redirect-cancelled-by-user') {
          setError(err.message || 'Failed to sign up with Apple.');
        }
        setLoading(false);
    }
  };

  // Show loading state while checking redirect result
  if (redirectLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-sm">{t('loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative flex flex-col overflow-hidden">
       {/* Fixed Header */}
       <StickyHeader showLogo={true} />

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

      <div className="relative z-20 flex-1 flex flex-col px-6 pt-0 pb-12">
        
        <div className="mt-auto w-full flex flex-col gap-3">
            
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

           <form onSubmit={handleSignUp} className="flex flex-col gap-2">
            <div>
              <input 
                type="email" 
                placeholder={t('profile_label_email')}
                className="w-full bg-white/10 border border-white/20 rounded-[30px] px-4 py-2.5 text-[10px] text-white placeholder-gray-400 backdrop-blur-xl focus:outline-none focus:border-white transition-all font-['Syne']"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <input 
                type="password" 
                placeholder={t('profile_label_password')}
                className="w-full bg-white/10 border border-white/20 rounded-[30px] px-4 py-2.5 text-[10px] text-white placeholder-gray-400 backdrop-blur-xl focus:outline-none focus:border-white transition-all font-['Syne']"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <Button type="submit" fullWidth disabled={loading} className="mt-1 py-2.5 text-xs bg-white text-black hover:bg-gray-200 rounded-[30px] font-inherit normal-case" style={{ fontFamily: 'inherit' }}>
              {loading ? t('loading') : t('auth_btn_signup')}
            </Button>
          </form>

           {/* Social Sign Up - Stacked Full Width */}
           <div className="flex flex-col gap-2 mt-0">
             {/* Apple Button */}
             <button 
                onClick={handleAppleSignUp}
                disabled={loading}
                className="w-full bg-black border border-white/20 rounded-[30px] py-2.5 flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
             >
                <img src="https://all-sports.co/app/img/login/apple.png" alt="Apple" className="w-4 h-4 object-contain" />
                <span className="font-bold text-[10px] text-white font-inherit" style={{ fontFamily: 'inherit' }}>{t('auth_apple_signup')}</span>
             </button>

             {/* Google Button */}
             <button 
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="w-full bg-white rounded-[30px] py-2.5 flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
             >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="G" className="w-3 h-3" />
                <span className="font-bold text-[10px] text-black font-inherit" style={{ fontFamily: 'inherit' }}>{t('auth_google_signup')}</span>
             </button>
          </div>

          <p className="text-center text-[10px] text-gray-400 mt-2 font-medium font-['Montserrat']">
            {t('auth_has_account')} <span onClick={() => navigate('/login')} className="text-white underline decoration-white/50 underline-offset-4 cursor-pointer font-bold">{t('auth_link_login')}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
