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
  const [error, setError] = useState<string | null>(null);

  // Check if current route is allowed without subscription
  const isAllowedRoute = allowedWithoutSubscription.some(route => 
    location.pathname === route || location.pathname.startsWith(route)
  );

  useEffect(() => {
    const checkSubscription = async () => {
      // If route is allowed without subscription, skip check
      if (isAllowedRoute) {
        setHasSelectedPlan(true);
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
        
        // Check if user has selected a plan by checking their profile
        // New users won't have a subscription field in their profile
        // Users who have selected a plan (including FREE) will have it set
        const idToken = await getIdToken();
        if (!idToken) {
          throw new Error('Unable to get authentication token');
        }

        const profile = await profileService.getProfile(currentUser.uid, idToken);
        
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
        // On error, assume no plan selected to redirect to subscription page
        setHasSelectedPlan(false);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    checkSubscription();
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

  // If user hasn't selected a plan yet, redirect to subscription page (required onboarding)
  if (!hasSelectedPlan) {
    return <Navigate to="/subscription" replace />;
  }

  // User has selected a plan (FREE, BASIC, PRO, or PREMIUM), allow access
  return <>{children}</>;
};

