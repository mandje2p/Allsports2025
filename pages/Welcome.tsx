
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Apple, Mail } from 'lucide-react';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://2points.fr/wp-content/uploads/2025/12/Login.png"
          alt="Welcome Background"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.backgroundColor = '#1a1a1a'; // Fallback color
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col px-6 pb-12">
        
        {/* Logo Section - Centered in the available space */}
        <div className="flex-1 flex items-center justify-center pt-20">
          {!logoError ? (
            <img 
              src="https://all-sports.co/app/img/Allsports-logo.png" 
              alt="All Sports" 
              className="w-48 object-contain drop-shadow-2xl"
              onError={() => setLogoError(true)}
            />
          ) : (
             <h1 className="text-5xl font-black italic tracking-tighter drop-shadow-lg">
              ALL <span className="font-light">SPORTS</span>
            </h1>
          )}
        </div>

        {/* Action Buttons Section - Pinned to bottom */}
        <div className="w-full flex flex-col gap-4">
          <Button fullWidth onClick={() => navigate('/login')} className="bg-white text-black hover:bg-gray-200 border-none font-bold py-4">
            S'inscrire avec son e-mail
          </Button>

          <div className="grid grid-cols-2 gap-4 w-full">
            <Button variant="outline" className="justify-center border-white/40 hover:bg-white/10 py-4">
               <span className="font-bold text-xl">G</span>
            </Button>
            <Button variant="outline" className="justify-center border-white/40 hover:bg-white/10 py-4">
               <Apple size={24} fill="white" />
            </Button>
          </div>

          <p className="text-[10px] text-gray-400 text-center mt-4 mx-auto max-w-xs leading-relaxed">
            By clicking continue, you agree to our <span className="text-white font-semibold">Terms of Service</span> and <span className="text-white font-semibold">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};
