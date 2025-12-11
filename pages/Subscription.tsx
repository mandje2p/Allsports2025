
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ShieldCheck, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { StickyHeader } from '../components/StickyHeader';

export const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<string>('basic');

  const PLANS = [
    {
        id: 'free',
        nameKey: 'plan_free_name',
        price: '0€',
        periodKey: 'plan_free_period',
        features: [
            'feat_3_visuals',
            'feat_25_bg',
            'feat_early_access',
            'feat_support_std'
        ]
    },
    {
        id: 'basic',
        nameKey: 'plan_basic_name',
        price: '70€',
        periodKey: 'plan_basic_period',
        subKey: 'plan_basic_sub',
        features: [
            'feat_unlimited_visuals',
            'feat_100_bg',
            'feat_early_access',
            'feat_support'
        ]
    },
    {
        id: 'pro',
        nameKey: 'plan_pro_name',
        price: '60€',
        periodKey: 'plan_pro_period',
        subKey: 'plan_pro_sub',
        features: [
            'feat_unlimited_visuals',
            'feat_100_bg',
            'feat_early_access',
            'feat_support'
        ]
    },
    {
        id: 'premium',
        nameKey: 'plan_premium_name',
        price: '598€',
        periodKey: 'plan_premium_period',
        subKey: 'plan_premium_sub',
        features: [
            'feat_unlimited_visuals',
            'feat_100_bg',
            'feat_early_access',
            'feat_support'
        ]
    }
  ];

  const handleSubscribe = () => {
    if (selectedPlan !== 'free') {
        window.open('https://stripe.com', '_blank');
    }
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-black text-white fade-in flex flex-col">
      <StickyHeader showLogo={true} />
      
      {/* Increased padding top to 52 - Reduced spacing */}
      <div className="flex-1 flex flex-col px-6 pt-[155px] pb-12">
        <h1 className="text-xl font-bold font-['Syne'] text-left mb-6">{t('sub_title')}</h1>

        <div className="w-full flex flex-col gap-4 mb-8">
            {PLANS.map((plan) => (
                <div 
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative w-full p-6 rounded-[30px] border transition-all cursor-pointer flex flex-col gap-4 ${
                        selectedPlan === plan.id 
                        ? 'bg-white text-black border-white shadow-lg scale-[1.02]' 
                        : 'bg-[#111] text-white border-white/10 hover:border-white/30'
                    }`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <span className={`text-sm font-bold font-['Syne'] uppercase ${selectedPlan === plan.id ? 'text-black' : 'text-gray-300'}`}>
                                {t(plan.nameKey)}
                            </span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-4xl font-black font-['Syne']" style={{ fontFamily: "'Syne', sans-serif" }}>{plan.price}</span>
                                <span className={`text-[10px] font-medium ${selectedPlan === plan.id ? 'text-gray-600' : 'text-gray-500'}`}>
                                    {t(plan.periodKey)}
                                </span>
                            </div>
                            {plan.subKey && (
                                <span className={`text-[10px] block mt-1 ${selectedPlan === plan.id ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {t(plan.subKey)}
                                </span>
                            )}
                        </div>
                        
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selectedPlan === plan.id ? 'border-black' : 'border-gray-600'
                        }`}>
                            {selectedPlan === plan.id && <div className="w-3 h-3 rounded-full bg-black" />}
                        </div>
                    </div>

                    <div className={`flex flex-col gap-1.5 pt-2 border-t ${selectedPlan === plan.id ? 'border-gray-200' : 'border-white/10'}`}>
                        {plan.features.map((feat, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                                <Check size={12} className={`mt-0.5 shrink-0 ${selectedPlan === plan.id ? 'text-black' : 'text-white'}`} />
                                <span className={`text-[10px] leading-tight ${selectedPlan === plan.id ? 'text-gray-700' : 'text-gray-400'}`}>
                                    {t(feat)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        <div className="mt-auto w-full space-y-4">
            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
                <ShieldCheck size={12} />
                <span>Paiement sécurisé via Stripe</span>
            </div>
            
            <Button onClick={handleSubscribe} fullWidth className="bg-white text-black font-bold rounded-[30px] py-4 text-sm font-['Syne'] normal-case tracking-wider font-inherit" style={{ fontFamily: 'inherit' }}>
                Souscrire (Testez 14 Jours)
            </Button>
        </div>
      </div>
    </div>
  );
};
