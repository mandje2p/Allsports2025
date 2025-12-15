
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { ShieldCheck, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { StickyHeader } from '../components/StickyHeader';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession, syncSubscription } from '../services/subscriptionService';

export const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { getIdToken, currentUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for success/cancel from Stripe redirect
  React.useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success) {
      console.log('[FRONTEND] [SUBSCRIPTION] ✅ Checkout successful! Starting sync process...');
      // Subscription successful - sync subscription immediately to ensure plan and credits are updated
      const syncAndRedirect = async () => {
        try {
          setLoading(true);
          console.log('[FRONTEND] [SUBSCRIPTION] 🔄 Calling syncSubscription...');
          await syncSubscription(getIdToken);
          console.log('[FRONTEND] [SUBSCRIPTION] ✅ Subscription synced successfully after checkout');
          // Redirect to home after sync
          console.log('[FRONTEND] [SUBSCRIPTION] 🏠 Redirecting to home in 1 second...');
          setTimeout(() => {
            navigate('/home');
          }, 1000);
        } catch (err: any) {
          console.error('[FRONTEND] [SUBSCRIPTION] ❌ Error syncing subscription:', err);
          // Still redirect even if sync fails (webhook will handle it)
          console.log('[FRONTEND] [SUBSCRIPTION] ⚠️ Sync failed, but redirecting anyway (webhook will handle update)');
          setTimeout(() => {
            navigate('/home');
          }, 2000);
        } finally {
          setLoading(false);
        }
      };
      
      syncAndRedirect();
    } else if (canceled) {
      console.log('[FRONTEND] [SUBSCRIPTION] ❌ Checkout was canceled');
      setError('Subscription canceled');
    }
  }, [searchParams, navigate, getIdToken]);

  // Stripe Price IDs - These should match your Stripe Dashboard
  // Get from environment variables (required!)
  const STRIPE_PRICE_IDS = {
    basic: import.meta.env.VITE_STRIPE_PRICE_BASIC,
    pro: import.meta.env.VITE_STRIPE_PRICE_PRO,
    premium: import.meta.env.VITE_STRIPE_PRICE_PREMIUM,
  };

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
        creditsKey: 'plan_basic_credits',
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
        creditsKey: 'plan_pro_credits',
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
        creditsKey: 'plan_premium_credits',
        features: [
            'feat_unlimited_visuals',
            'feat_100_bg',
            'feat_early_access',
            'feat_support'
        ]
    }
  ];

  const handleSubscribe = async () => {
    if (selectedPlan === 'free') {
      // Set user subscription to FREE in database
      if (!currentUser) {
        setError('Please sign in to continue');
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const idToken = await getIdToken();
        if (!idToken) {
          throw new Error('Unable to get authentication token');
        }

        // Update user profile to FREE plan
        const { profileService } = await import('../services/profileService');
        const currentProfile = await profileService.getProfile(currentUser.uid, idToken);
        
        await profileService.saveProfile(currentUser.uid, idToken, {
          ...(currentProfile || {
            name: currentUser.displayName || 'User',
            email: currentUser.email || '',
            companyName: '',
            companyAddress: '',
            avatarUrl: currentUser.photoURL || '',
          }),
          subscription: 'FREE'
        });

        // Also update subscription collection via backend endpoint
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        const response = await fetch(`${API_BASE_URL}/api/subscriptions/set-free`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.message || errorData.error || 'Failed to set FREE plan');
        }

        // Navigate to home
        navigate('/home');
      } catch (err: any) {
        console.error('[SUBSCRIPTION] Error setting FREE plan:', err);
        setError(err.message || 'Failed to set free plan. Please try again.');
        setLoading(false);
      }
      return;
    }

    if (!currentUser) {
      setError('Please sign in to subscribe');
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Map plan ID to Stripe plan name and price ID
      const planMap: Record<string, { plan: 'BASIC' | 'PRO' | 'PREMIUM', priceId: string }> = {
        basic: { plan: 'BASIC', priceId: STRIPE_PRICE_IDS.basic },
        pro: { plan: 'PRO', priceId: STRIPE_PRICE_IDS.pro },
        premium: { plan: 'PREMIUM', priceId: STRIPE_PRICE_IDS.premium },
      };

      const { plan, priceId } = planMap[selectedPlan];
      
      console.log('[FRONTEND] [SUBSCRIPTION] 🎯 User selected plan:', { selectedPlan, plan, priceId });
      
      if (!priceId || !priceId.startsWith('price_')) {
        throw new Error('Stripe Price ID not configured. Please:\n1. Create products in Stripe Dashboard\n2. Copy the Price IDs (starts with price_)\n3. Add them to your .env file:\n   VITE_STRIPE_PRICE_BASIC=price_...\n   VITE_STRIPE_PRICE_PRO=price_...\n   VITE_STRIPE_PRICE_PREMIUM=price_...\n4. Restart your frontend server');
      }

      // Create checkout session
      console.log('[FRONTEND] [SUBSCRIPTION] 🚀 Initiating checkout for plan:', plan);
      const { url } = await createCheckoutSession(plan, priceId, getIdToken);
      
      // Redirect to Stripe Checkout
      if (url) {
        console.log('[FRONTEND] [SUBSCRIPTION] 🔀 Redirecting to Stripe Checkout...');
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('[SUBSCRIPTION] Error creating checkout:', err);
      setError(err.message || 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
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
                            {plan.creditsKey && (
                                <span className={`text-sm font-bold block mt-2 ${selectedPlan === plan.id ? 'text-black' : 'text-white'}`}>
                                    {t(plan.creditsKey)}
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
            {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-sm text-red-300">
                    {error}
                </div>
            )}
            
            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
                <ShieldCheck size={12} />
                <span>Paiement sécurisé via Stripe</span>
            </div>
            
            <Button 
                onClick={handleSubscribe} 
                disabled={loading}
                fullWidth 
                className="bg-white text-black font-bold rounded-[30px] py-4 text-sm font-['Syne'] normal-case tracking-wider font-inherit disabled:opacity-50 disabled:cursor-not-allowed" 
                style={{ fontFamily: 'inherit' }}
            >
                {loading ? 'Chargement...' : selectedPlan === 'free' ? 'Continuer avec le plan gratuit' : 'Souscrire'}
            </Button>
        </div>
      </div>
    </div>
  );
};
