import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';

interface SubscriptionRequiredRouteProps {
  children: React.ReactNode;
  /**
   * Routes that don't require a subscription
   * Users can access these even without a subscription
   */
  allowedWithoutSubscription?: string[];
}

export const SubscriptionRequiredRoute: React.FC<SubscriptionRequiredRouteProps> = ({ 
  children,
  allowedWithoutSubscription = ['/subscription', '/welcome', '/onboarding', '/profile']
}) => {
  const { currentUser, loading: authLoading, getIdToken } = useAuth();
  const location = useLocation();
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [hasSelectedPlan, setHasSelectedPlan] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if current route is allowed without subscription
  const isAllowedRoute = allowedWithoutSubscription.some(route => 
    location.pathname === route || location.pathname.startsWith(route)
  );

  useEffect(() => {
    const checkOnboardingAndSubscription = async () => {
      // If route is allowed without subscription, skip check
      if (isAllowedRoute) {
        setHasSelectedPlan(true);
        setOnboardingComplete(true);
        setSubscriptionLoading(false);
        return;
      }

      // If not authenticated, wait for auth
      if (authLoading || !currentUser) {
        return;
      }

      try {
        setSubscriptionLoading(true);
        setError(null);
        
        const idToken = await getIdToken();
        if (!idToken) {
          throw new Error('Unable to get authentication token');
        }

        const profile = await profileService.getProfile(currentUser.uid, idToken);
        
        // Check if onboarding is complete
        // Onboarding is complete when profile exists AND has onboardingCompleted flag set to true
        // This ensures users actually filled out the onboarding form, not just auto-created data
        const isOnboardingDone = profile && 
          (profile as any).onboardingCompleted === true &&
          profile.name && 
          profile.companyName && 
          profile.companyAddress;
        
        setOnboardingComplete(!!isOnboardingDone);
        
        if (!isOnboardingDone) {
          console.log('[SUBSCRIPTION_ROUTE] Onboarding not complete - user must complete onboarding form first');
          setHasSelectedPlan(false);
          setSubscriptionLoading(false);
          return;
        }
        
        // If profile exists and has a subscription field set, user has selected a plan
        // This includes FREE, BASIC, PRO, and PREMIUM plans
        if (profile && profile.subscription) {
          console.log('[SUBSCRIPTION_ROUTE] User has selected plan:', profile.subscription);
          setHasSelectedPlan(true);
        } else {
          // No subscription field means user hasn't selected a plan yet
          console.log('[SUBSCRIPTION_ROUTE] User has not selected a plan yet');
          setHasSelectedPlan(false);
        }
      } catch (err: any) {
        console.error('[SUBSCRIPTION_ROUTE] Error checking subscription:', err);
        setError(err.message);
        // On error, assume onboarding not complete and no plan selected
        setOnboardingComplete(false);
        setHasSelectedPlan(false);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    checkOnboardingAndSubscription();
  }, [currentUser, authLoading, getIdToken, isAllowedRoute, location.pathname]);

  // Wait for auth to load
  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-white" />
        </div>
      </div>
    );
  }

  // If not authenticated, ProtectedRoute will handle redirect
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Wait for subscription check
  if (subscriptionLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-white" />
        </div>
      </div>
    );
  }

  // If route is allowed without subscription, allow access
  if (isAllowedRoute) {
    return <>{children}</>;
  }

  // If onboarding is not complete, redirect to onboarding page first
  if (!onboardingComplete) {
    console.log('[SUBSCRIPTION_ROUTE] Redirecting to onboarding - profile incomplete');
    return <Navigate to="/onboarding" replace />;
  }

  // If user hasn't selected a plan yet, redirect to subscription page
  if (!hasSelectedPlan) {
    console.log('[SUBSCRIPTION_ROUTE] Redirecting to subscription - no plan selected');
    return <Navigate to="/subscription" replace />;
  }

  // User has completed onboarding and selected a plan (FREE, BASIC, PRO, or PREMIUM), allow access
  return <>{children}</>;
};

