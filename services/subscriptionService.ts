const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface SubscriptionStatus {
  subscription: {
    plan: 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM';
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
  };
  credits: {
    monthlyCredits: number;
    usedCredits: number;
    remainingCredits: number;
    periodStart: string | null;
    periodEnd: string | null;
  };
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

/**
 * Get subscription status and credits
 */
export const getSubscriptionStatus = async (
  getIdToken: () => Promise<string | null>
): Promise<SubscriptionStatus> => {
  try {
    console.log('[FRONTEND] [SUBSCRIPTION] 📊 Getting subscription status...');
    const idToken = await getIdToken();
    if (!idToken) {
      throw new Error('Authentication required. Please sign in again.');
    }

    console.log('[FRONTEND] [SUBSCRIPTION] 📡 Calling GET /api/subscriptions/status');
    const response = await fetch(`${API_BASE_URL}/api/subscriptions/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[FRONTEND] [SUBSCRIPTION] ❌ Failed to get subscription status:', errorData);
      throw new Error(errorData.message || errorData.error || `Failed to get subscription status: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[FRONTEND] [SUBSCRIPTION] ✅ Subscription status received:', {
      plan: data.subscription?.plan,
      status: data.subscription?.status,
      monthlyCredits: data.credits?.monthlyCredits,
      remainingCredits: data.credits?.remainingCredits,
      usedCredits: data.credits?.usedCredits
    });
    return data;
  } catch (error: any) {
    console.error('[FRONTEND] [SUBSCRIPTION] ❌ Error getting subscription status:', error);
    throw new Error(error.message || 'Failed to get subscription status');
  }
};

/**
 * Create Stripe Checkout Session
 */
export const createCheckoutSession = async (
  plan: 'BASIC' | 'PRO' | 'PREMIUM',
  priceId: string,
  getIdToken: () => Promise<string | null>
): Promise<CheckoutSession> => {
  try {
    console.log('[FRONTEND] [CHECKOUT] 🛒 Creating checkout session...', { plan, priceId });
    const idToken = await getIdToken();
    if (!idToken) {
      throw new Error('Authentication required. Please sign in again.');
    }

    console.log('[FRONTEND] [CHECKOUT] 📡 Calling POST /api/subscriptions/create-checkout');
    const response = await fetch(`${API_BASE_URL}/api/subscriptions/create-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan, priceId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[FRONTEND] [CHECKOUT] ❌ Failed to create checkout session:', errorData);
      throw new Error(errorData.message || errorData.error || `Failed to create checkout session: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[FRONTEND] [CHECKOUT] ✅ Checkout session created:', { sessionId: data.sessionId, hasUrl: !!data.url });
    return data;
  } catch (error: any) {
    console.error('[FRONTEND] [CHECKOUT] ❌ Error creating checkout session:', error);
    throw new Error(error.message || 'Failed to create checkout session');
  }
};

/**
 * Create Customer Portal Session
 */
export const createPortalSession = async (
  getIdToken: () => Promise<string | null>
): Promise<{ url: string }> => {
  try {
    const idToken = await getIdToken();
    if (!idToken) {
      throw new Error('Authentication required. Please sign in again.');
    }

    const response = await fetch(`${API_BASE_URL}/api/subscriptions/create-portal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.message || errorData.error || `Failed to create portal session: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('[SUBSCRIPTION] Error creating portal session:', error);
    throw new Error(error.message || 'Failed to create portal session');
  }
};

/**
 * Sync subscription from Stripe (call after checkout to ensure immediate update)
 */
export const syncSubscription = async (
  getIdToken: () => Promise<string | null>
): Promise<{ success: boolean; plan: string; message: string }> => {
  try {
    console.log('[FRONTEND] [SYNC] 🔄 Syncing subscription from Stripe...');
    const idToken = await getIdToken();
    if (!idToken) {
      throw new Error('Authentication required. Please sign in again.');
    }

    console.log('[FRONTEND] [SYNC] 📡 Calling POST /api/subscriptions/sync');
    const response = await fetch(`${API_BASE_URL}/api/subscriptions/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[FRONTEND] [SYNC] ❌ Failed to sync subscription:', errorData);
      throw new Error(errorData.message || errorData.error || `Failed to sync subscription: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[FRONTEND] [SYNC] ✅ Subscription synced successfully:', data);
    return data;
  } catch (error: any) {
    console.error('[FRONTEND] [SYNC] ❌ Error syncing subscription:', error);
    throw new Error(error.message || 'Failed to sync subscription');
  }
};


