const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { GoogleGenAI } = require('@google/genai');
const cron = require('node-cron');
const stripe = require('stripe');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Firebase Admin
const serviceAccount = require('./private-key.json');

// Get storage bucket from env or construct from project ID
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 
                      process.env.VITE_FIREBASE_STORAGE_BUCKET || 
                      `${serviceAccount.project_id}.appspot.com`;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: storageBucket
});

console.log(`[FIREBASE] Initialized with storage bucket: ${storageBucket}`);

const db = admin.firestore();
const storage = admin.storage();

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('[STRIPE] ⚠️ STRIPE_SECRET_KEY not found in environment variables');
}
const stripeClient = stripeSecretKey ? stripe(stripeSecretKey) : null;

// Plan configuration - Credits per plan
const PLAN_CREDITS = {
  FREE: 3,      // FREE users get 3 visuals per month
  BASIC: 50,    // BASIC users get 50 visuals per month
  PRO: 100,
  PREMIUM: 200
};

// Plan status mapping
const SUBSCRIPTION_STATUS = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'unpaid',
  incomplete: 'incomplete',
  incomplete_expired: 'incomplete_expired'
};

// Initialize Google GenAI client
let aiInstance = null;
const getAIClient = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip || req.connection.remoteAddress}`);
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
};

// Middleware
app.use(requestLogger);
app.use(cors());

// IMPORTANT: Webhook route needs raw body for Stripe signature verification
// Apply raw body parser ONLY for webhook route BEFORE JSON parser
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));

// Apply JSON parser to all routes EXCEPT webhook (webhook already has raw parser)
app.use((req, res, next) => {
  // Skip JSON parsing for webhook - it already has raw body parser
  if (req.path === '/api/subscriptions/webhook') {
    return next();
  }
  return express.json({ limit: '10mb' })(req, res, next);
});

app.use((req, res, next) => {
  // Skip URL encoding for webhook
  if (req.path === '/api/subscriptions/webhook') {
    return next();
  }
  return express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

// Authentication middleware to validate Firebase ID token
const authMiddleware = async (req, res, next) => {
  try {
    // Skip authentication for health check endpoint and image proxy
    if (req.path === '/health' || req.path === '/' || req.path === '/api/proxy-image') {
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.warn(`[AUTH] No authorization header for ${req.method} ${req.path}`);
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No authorization token provided. Please include a valid Firebase ID token in the Authorization header.'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.warn(`[AUTH] Invalid authorization header format for ${req.method} ${req.path}`);
      return res.status(401).json({ 
        error: 'Invalid authorization format',
        message: 'Authorization header must be in the format: Bearer <token>'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      console.warn(`[AUTH] Empty token for ${req.method} ${req.path}`);
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token is missing'
      });
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Attach user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      ...decodedToken
    };
    
    console.log(`[AUTH] ✓ Authenticated user: ${req.user.uid} for ${req.method} ${req.path}`);
    next();
  } catch (error) {
    console.error(`[AUTH] ✗ Authentication failed for ${req.method} ${req.path}:`, error.message);
    
    // Provide more specific error messages
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your authentication token has expired. Please sign in again.'
      });
    } else if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ 
        error: 'Token revoked',
        message: 'Your authentication token has been revoked. Please sign in again.'
      });
    } else if (error.code === 'auth/argument-error') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid or malformed.'
      });
    }
    
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: error.message || 'Invalid or expired token'
    });
  }
};

// Image proxy endpoint (public, no auth required) - for CORS issues
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log(`[PROXY] Proxying image: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('[PROXY] Error proxying image:', error);
    return res.status(500).json({ error: 'Failed to proxy image' });
  }
});

// ============================================================================
// STRIPE SUBSCRIPTION HELPERS
// ============================================================================

/**
 * Get or create Stripe customer for a user
 */
const getOrCreateStripeCustomer = async (userId, email) => {
  if (!stripeClient) {
    throw new Error('Stripe is not configured');
  }

  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  const userData = userDoc.exists ? userDoc.data() : {};

  // Check if user already has a Stripe customer ID
  if (userData.stripeCustomerId) {
    try {
      const customer = await stripeClient.customers.retrieve(userData.stripeCustomerId);
      return customer;
    } catch (error) {
      console.warn(`[STRIPE] Customer ${userData.stripeCustomerId} not found, creating new one`);
    }
  }

  // Create new Stripe customer
  const customer = await stripeClient.customers.create({
    email: email,
    metadata: {
      userId: userId
    }
  });

  // Save customer ID to user document
  await userRef.set({
    stripeCustomerId: customer.id
  }, { merge: true });

  console.log(`[STRIPE] Created new customer ${customer.id} for user ${userId}`);
  return customer;
};

/**
 * Check and reset FREE user credits if a new month has started
 * FREE users don't have Stripe invoices, so we reset based on time
 */
const checkAndResetFreeUserCredits = async (userId, subscription, creditBalance) => {
  // Only check for FREE plan users
  if (subscription.plan !== 'FREE') {
    return false; // No reset needed
  }

  // If no credit balance exists, initialize it
  if (!creditBalance.periodStart) {
    const now = Date.now() / 1000;
    const nextMonth = now + (30 * 24 * 60 * 60); // 30 days from now
    await resetCreditsForUser(userId, 'FREE', now, nextMonth);
    console.log(`[CREDITS] Initialized FREE user credits for ${userId}`);
    return true; // Credits were initialized
  }

  // Check if a month has passed since last reset
  const lastReset = creditBalance.periodStart?.toDate ? creditBalance.periodStart.toDate() : null;
  if (!lastReset) {
    // Initialize if periodStart is missing
    const now = Date.now() / 1000;
    const nextMonth = now + (30 * 24 * 60 * 60);
    await resetCreditsForUser(userId, 'FREE', now, nextMonth);
    return true;
  }

  const now = new Date();
  const daysSinceReset = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));

  // Reset if 30 days have passed (new month)
  if (daysSinceReset >= 30) {
    const nowTimestamp = Math.floor(now.getTime() / 1000);
    const nextMonth = nowTimestamp + (30 * 24 * 60 * 60);
    await resetCreditsForUser(userId, 'FREE', nowTimestamp, nextMonth);
    console.log(`[CREDITS] Monthly reset for FREE user ${userId} (${daysSinceReset} days since last reset)`);
    return true; // Credits were reset
  }

  return false; // No reset needed
};

/**
 * Get subscription and credit balance for a user
 * Also checks user profile as fallback and syncs if needed
 */
const getUserSubscriptionData = async (userId) => {
  console.log(`[BACKEND] [SUBSCRIPTION_DATA] 📊 Getting subscription data for user: ${userId}`);
  const subscriptionRef = db.collection('subscriptions').doc(userId);
  const creditRef = db.collection('credit_balance').doc(userId);
  const userRef = db.collection('users').doc(userId);

  const [subscriptionDoc, creditDoc, userDoc] = await Promise.all([
    subscriptionRef.get(),
    creditRef.get(),
    userRef.get()
  ]);

  let subscription = subscriptionDoc.exists ? subscriptionDoc.data() : {
    plan: 'FREE',
    status: 'active',
    stripeSubscriptionId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    lastInvoiceId: null
  };

  console.log(`[BACKEND] [SUBSCRIPTION_DATA] 📋 Subscription from collection:`, {
    plan: subscription.plan,
    status: subscription.status,
    exists: subscriptionDoc.exists,
    stripeSubscriptionId: subscription.stripeSubscriptionId
  });

  // AUTO-SYNC: If user has stripeCustomerId but plan is FREE and no stripeSubscriptionId,
  // check Stripe for active subscriptions (handles case where sync wasn't called after checkout)
  const userData = userDoc.exists ? userDoc.data() : {};
  let autoSyncOccurred = false;
  if (subscription.plan === 'FREE' && !subscription.stripeSubscriptionId && userData.stripeCustomerId && stripeClient) {
    console.log(`[BACKEND] [SUBSCRIPTION_DATA] 🔍 User has stripeCustomerId but FREE plan, checking Stripe for active subscriptions...`);
    try {
      const [activeSubscriptions, trialingSubscriptions] = await Promise.all([
        stripeClient.subscriptions.list({
          customer: userData.stripeCustomerId,
          status: 'active',
          limit: 1
        }),
        stripeClient.subscriptions.list({
          customer: userData.stripeCustomerId,
          status: 'trialing',
          limit: 1
        })
      ]);

      const allSubscriptions = [...activeSubscriptions.data, ...trialingSubscriptions.data];

      if (allSubscriptions.length > 0) {
        const subFromList = allSubscriptions.sort((a, b) => b.created - a.created)[0];

        // Retrieve full subscription object (list doesn't always include all fields)
        const stripeSub = await stripeClient.subscriptions.retrieve(subFromList.id);

        const priceId = stripeSub.items.data[0]?.price?.id;
        const planFromPrice = getPlanFromPriceId(priceId);
        const planFromMetadata = stripeSub.metadata?.plan;
        const detectedPlan = planFromPrice !== 'FREE' ? planFromPrice : (planFromMetadata || 'FREE');

        console.log(`[BACKEND] [SUBSCRIPTION_DATA] ✅ AUTO-SYNC: Found active Stripe subscription!`, {
          subscriptionId: stripeSub.id,
          priceId,
          planFromPrice,
          planFromMetadata,
          detectedPlan,
          status: stripeSub.status,
          current_period_start: stripeSub.current_period_start,
          current_period_end: stripeSub.current_period_end
        });

        if (detectedPlan !== 'FREE') {
          // Convert timestamps to integers (Firestore Timestamp requires integer seconds)
          // Fallback to current time + 30 days if timestamps are missing
          const now = Math.floor(Date.now() / 1000);
          const thirtyDaysLater = now + (30 * 24 * 60 * 60);

          const periodStart = typeof stripeSub.current_period_start === 'number'
            ? Math.floor(stripeSub.current_period_start)
            : now;
          const periodEnd = typeof stripeSub.current_period_end === 'number'
            ? Math.floor(stripeSub.current_period_end)
            : thirtyDaysLater;

          if (typeof stripeSub.current_period_start !== 'number') {
            console.warn(`[BACKEND] [SUBSCRIPTION_DATA] ⚠️ Missing current_period_start, using fallback: ${periodStart}`);
          }
          if (typeof stripeSub.current_period_end !== 'number') {
            console.warn(`[BACKEND] [SUBSCRIPTION_DATA] ⚠️ Missing current_period_end, using fallback: ${periodEnd}`);
          }

          // Update subscription in Firestore
          subscription = {
            userId: userId,
            plan: detectedPlan,
            status: stripeSub.status,
            stripeSubscriptionId: stripeSub.id,
            currentPeriodStart: admin.firestore.Timestamp.fromDate(new Date(periodStart * 1000)),
            currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(periodEnd * 1000)),
            lastInvoiceId: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          await subscriptionRef.set(subscription, { merge: true });

          // Update user profile
          await userRef.update({
            subscription: detectedPlan,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Reset credits for the new plan
          await resetCreditsForUser(
            userId,
            detectedPlan,
            periodStart,
            periodEnd
          );

          autoSyncOccurred = true;
          console.log(`[BACKEND] [SUBSCRIPTION_DATA] ✅ AUTO-SYNC complete! User ${userId} upgraded to ${detectedPlan}`);
        }
      } else {
        console.log(`[BACKEND] [SUBSCRIPTION_DATA] ℹ️ No active Stripe subscriptions found for customer ${userData.stripeCustomerId}`);
      }
    } catch (err) {
      console.error(`[BACKEND] [SUBSCRIPTION_DATA] ❌ Error during auto-sync:`, err.message);
    }
  }

  // If we have a Stripe subscription ID but plan is still FREE, try to sync from Stripe
  if (subscription.stripeSubscriptionId && subscription.plan === 'FREE' && stripeClient) {
    console.log(`[BACKEND] [SUBSCRIPTION_DATA] 🔄 Found Stripe subscription ID but plan is FREE, syncing from Stripe...`);
    try {
      const stripeSub = await stripeClient.subscriptions.retrieve(subscription.stripeSubscriptionId);
      const priceId = stripeSub.items.data[0]?.price?.id;
      const planFromStripe = getPlanFromPriceId(priceId);
      
      if (planFromStripe !== 'FREE') {
        console.log(`[BACKEND] [SUBSCRIPTION_DATA] ✅ Found plan ${planFromStripe} from Stripe, updating...`);

        // Convert timestamps to integers (Firestore Timestamp requires integer seconds)
        // Fallback to current time + 30 days if timestamps are missing
        const nowSync = Math.floor(Date.now() / 1000);
        const thirtyDaysSync = nowSync + (30 * 24 * 60 * 60);

        const periodStart = typeof stripeSub.current_period_start === 'number'
          ? Math.floor(stripeSub.current_period_start)
          : nowSync;
        const periodEnd = typeof stripeSub.current_period_end === 'number'
          ? Math.floor(stripeSub.current_period_end)
          : thirtyDaysSync;

        subscription.plan = planFromStripe;
        subscription.status = stripeSub.status;
        subscription.currentPeriodStart = admin.firestore.Timestamp.fromDate(new Date(periodStart * 1000));
        subscription.currentPeriodEnd = admin.firestore.Timestamp.fromDate(new Date(periodEnd * 1000));

        // Update Firestore
        await subscriptionRef.set({
          userId: userId,
          plan: planFromStripe,
          status: stripeSub.status,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Update user profile
        if (userDoc.exists) {
          await userRef.update({
            subscription: planFromStripe,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        console.log(`[BACKEND] [SUBSCRIPTION_DATA] ✅ Updated to plan: ${planFromStripe}`);
      }
    } catch (err) {
      console.error(`[BACKEND] [SUBSCRIPTION_DATA] ❌ Error syncing from Stripe:`, err.message);
    }
  }

  // Fallback: If subscription collection doesn't have the plan, check user profile
  // This handles race conditions where webhook hasn't processed yet
  if (subscription.plan === 'FREE' && userDoc.exists) {
    const userProfile = userDoc.data();
    console.log(`[BACKEND] [SUBSCRIPTION_DATA] 🔍 Checking user profile for plan:`, userProfile.subscription);
    if (userProfile.subscription && userProfile.subscription !== 'FREE') {
      console.log(`[BACKEND] [SUBSCRIPTION_DATA] 🔄 Syncing plan from user profile: ${userProfile.subscription} for user ${userId}`);
      // Update subscription collection with plan from user profile
      subscription.plan = userProfile.subscription;
      // Also update the subscription doc in Firestore
      await subscriptionRef.set({
        userId: userId,
        plan: userProfile.subscription,
        status: subscription.status || 'active',
        stripeSubscriptionId: subscription.stripeSubscriptionId || null,
        currentPeriodStart: subscription.currentPeriodStart || admin.firestore.Timestamp.fromDate(new Date()),
        currentPeriodEnd: subscription.currentPeriodEnd || admin.firestore.Timestamp.fromDate(new Date()),
        lastInvoiceId: subscription.lastInvoiceId || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      // Re-fetch subscription after update
      const updatedSubscriptionDoc = await subscriptionRef.get();
      if (updatedSubscriptionDoc.exists) {
        subscription = updatedSubscriptionDoc.data();
        console.log(`[BACKEND] [SUBSCRIPTION_DATA] ✅ Updated subscription plan to: ${subscription.plan}`);
      }
    }
  }

  // Re-fetch credit doc if auto-sync occurred (since credits were reset)
  let latestCreditDoc = creditDoc;
  if (autoSyncOccurred) {
    latestCreditDoc = await creditRef.get();
    console.log(`[BACKEND] [SUBSCRIPTION_DATA] 🔄 Re-fetched credit doc after auto-sync`);
  }

  const defaultCredits = PLAN_CREDITS[subscription.plan] || 0;
  let creditBalance = latestCreditDoc.exists ? latestCreditDoc.data() : {
    monthlyCredits: defaultCredits,
    usedCredits: 0,
    remainingCredits: defaultCredits === -1 ? -1 : defaultCredits, // -1 for unlimited
    periodStart: null,
    periodEnd: null
  };

  // If plan changed and credits don't match, reset credits
  // Also check if BASIC plan should have unlimited credits (-1)
  const expectedCredits = subscription.plan === 'BASIC' ? -1 : defaultCredits;
  const currentCredits = creditBalance.monthlyCredits;
  const currentRemaining = creditBalance.remainingCredits;

  // Determine if credits need to be reset:
  // 1. Monthly credits don't match expected for the plan
  // 2. BASIC plan should have unlimited (-1) but doesn't
  const creditsMismatch = currentCredits !== expectedCredits;
  const basicNeedsUnlimited = subscription.plan === 'BASIC' && currentRemaining !== -1;
  const needsReset = creditsMismatch || basicNeedsUnlimited;

  console.log(`[BACKEND] [SUBSCRIPTION_DATA] 💰 Credit check:`, {
    plan: subscription.plan,
    expectedCredits,
    currentCredits,
    currentRemaining,
    creditsMismatch,
    basicNeedsUnlimited,
    needsReset
  });

  // Reset credits only if there's a mismatch (plan changed or credits incorrect)
  if (needsReset) {
    console.log(`[BACKEND] [SUBSCRIPTION_DATA] 🔄 Plan is ${subscription.plan} (expected credits: ${expectedCredits}, current: ${currentCredits}), resetting credits for user ${userId}`);
    const now = subscription.currentPeriodStart?.toDate ? 
      Math.floor(subscription.currentPeriodStart.toDate().getTime() / 1000) : 
      Date.now() / 1000;
    const nextMonth = subscription.currentPeriodEnd?.toDate ? 
      Math.floor(subscription.currentPeriodEnd.toDate().getTime() / 1000) : 
      now + (30 * 24 * 60 * 60);
    
    console.log(`[BACKEND] [SUBSCRIPTION_DATA] 💰 Calling resetCreditsForUser with plan: ${subscription.plan}`);
    await resetCreditsForUser(userId, subscription.plan, now, nextMonth);
    
    // Re-fetch credit balance
    const updatedCreditDoc = await creditRef.get();
    if (updatedCreditDoc.exists) {
      creditBalance = updatedCreditDoc.data();
      console.log(`[BACKEND] [SUBSCRIPTION_DATA] ✅ Credits reset:`, {
        monthlyCredits: creditBalance.monthlyCredits,
        remainingCredits: creditBalance.remainingCredits,
        usedCredits: creditBalance.usedCredits
      });
    } else {
      console.error(`[BACKEND] [SUBSCRIPTION_DATA] ❌ Credit document not found after reset!`);
    }
  }

  // Check and reset FREE user credits if new month
  const wasReset = await checkAndResetFreeUserCredits(userId, subscription, creditBalance);
  
  // If credits were reset, fetch the updated balance
  if (wasReset) {
    const updatedCreditDoc = await creditRef.get();
    if (updatedCreditDoc.exists) {
      creditBalance = updatedCreditDoc.data();
    }
  }

  return { subscription, creditBalance };
};

/**
 * Check if user can generate (has credits and active subscription)
 */
const canUserGenerate = (subscription, creditBalance) => {
  // Only active subscriptions can generate
  if (subscription.status !== 'active') {
    return { canGenerate: false, reason: `Subscription status is ${subscription.status}` };
  }

  // BASIC plan has unlimited credits - always allow generation
  if (subscription.plan === 'BASIC') {
    return { canGenerate: true };
  }

  // Check if user has remaining credits (for FREE, PRO, PREMIUM)
  if (creditBalance.remainingCredits <= 0) {
    return { canGenerate: false, reason: 'No credits remaining' };
  }

  return { canGenerate: true };
};

/**
 * Deduct credit from user's balance (atomic operation)
 * Note: BASIC plan users have unlimited credits, so we track usage but don't actually deduct
 */
const deductCredit = async (userId, plan) => {
  const creditRef = db.collection('credit_balance').doc(userId);

  return await db.runTransaction(async (transaction) => {
    const creditDoc = await transaction.get(creditRef);

    if (!creditDoc.exists) {
      throw new Error('Credit balance not found');
    }

    const creditData = creditDoc.data();
    
    // BASIC plan has unlimited credits - track usage but don't deduct
    if (plan === 'BASIC') {
      const newUsed = (creditData.usedCredits || 0) + 1;
      transaction.update(creditRef, {
        usedCredits: newUsed,
        remainingCredits: -1, // -1 represents unlimited
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        remainingCredits: -1, // Unlimited
        usedCredits: newUsed
      };
    }

    // For other plans, deduct normally
    const newRemaining = creditData.remainingCredits - 1;
    const newUsed = creditData.usedCredits + 1;

    if (newRemaining < 0) {
      throw new Error('Insufficient credits');
    }

    transaction.update(creditRef, {
      remainingCredits: newRemaining,
      usedCredits: newUsed,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      remainingCredits: newRemaining,
      usedCredits: newUsed
    };
  });
};

/**
 * Reset credits for a user based on plan
 */
const resetCreditsForUser = async (userId, plan, periodStart, periodEnd) => {
  const credits = PLAN_CREDITS[plan] || 0;
  
  // For BASIC plan (unlimited), set remainingCredits to -1
  const remainingCredits = credits === -1 ? -1 : credits;

  // Validate and convert timestamps
  // periodStart and periodEnd should be Unix timestamps in seconds
  if (typeof periodStart !== 'number' || typeof periodEnd !== 'number' || 
      isNaN(periodStart) || isNaN(periodEnd) || 
      periodStart <= 0 || periodEnd <= 0) {
    console.error(`[CREDITS] Invalid timestamps for resetCreditsForUser:`, {
      userId,
      plan,
      periodStart,
      periodEnd,
      periodStartType: typeof periodStart,
      periodEndType: typeof periodEnd
    });
    throw new Error(`Invalid timestamps: periodStart=${periodStart}, periodEnd=${periodEnd}`);
  }

  // Convert Unix timestamp (seconds) to Date, then to Firestore Timestamp
  const periodStartDate = new Date(periodStart * 1000);
  const periodEndDate = new Date(periodEnd * 1000);

  // Validate dates are valid
  if (isNaN(periodStartDate.getTime()) || isNaN(periodEndDate.getTime())) {
    console.error(`[CREDITS] Invalid date conversion:`, {
      periodStart,
      periodEnd,
      periodStartDate,
      periodEndDate
    });
    throw new Error(`Invalid date conversion for timestamps`);
  }

  await db.collection('credit_balance').doc(userId).set({
    monthlyCredits: credits === -1 ? -1 : credits, // Store -1 for unlimited
    usedCredits: 0,
    remainingCredits: remainingCredits,
    periodStart: admin.firestore.Timestamp.fromDate(periodStartDate),
    periodEnd: admin.firestore.Timestamp.fromDate(periodEndDate),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  if (credits === -1) {
    console.log(`[CREDITS] Reset credits for user ${userId}: UNLIMITED (plan: ${plan})`);
  } else {
    console.log(`[CREDITS] Reset credits for user ${userId}: ${credits} credits (plan: ${plan})`);
  }
};

/**
 * Map Stripe price ID to plan name
 * You'll need to set this up with your actual Stripe price IDs
 */
const getPlanFromPriceId = (priceId) => {
  // Map Stripe Price IDs to internal plan names
  // Check both frontend (VITE_) and backend environment variables
  const priceToPlan = {
    [process.env.VITE_STRIPE_PRICE_BASIC]: 'BASIC',
    [process.env.VITE_STRIPE_PRICE_PRO]: 'PRO',
    [process.env.VITE_STRIPE_PRICE_PREMIUM]: 'PREMIUM',
    [process.env.STRIPE_PRICE_BASIC]: 'BASIC',
    [process.env.STRIPE_PRICE_PRO]: 'PRO',
    [process.env.STRIPE_PRICE_PREMIUM]: 'PREMIUM'
  };

  const plan = priceToPlan[priceId];
  if (plan) {
    console.log(`[STRIPE] Mapped price ID ${priceId} to plan: ${plan}`);
    return plan;
  }
  
  console.warn(`[STRIPE] Unknown price ID: ${priceId}, defaulting to FREE`);
  return 'FREE';
};

// ============================================================================
// END STRIPE HELPERS
// ============================================================================

// Apply authentication middleware to all routes except health check, proxy, and webhook
// IMPORTANT: Webhook must be before auth middleware since it uses raw body
app.use((req, res, next) => {
  // Skip auth for health check, image proxy, and webhook
  if (req.path === '/health' || req.path === '/' || req.path === '/api/proxy-image' || req.path === '/api/subscriptions/webhook') {
    return next();
  }
  return authMiddleware(req, res, next);
});

// Get user profile (auto-creates with demo data if doesn't exist)
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify the user is accessing their own profile
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const profileRef = db.collection('users').doc(userId);
    const profileDoc = await profileRef.get();

    // If profile doesn't exist, create it with demo data
    if (!profileDoc.exists) {
      const userEmail = req.user.email || 'user@example.com';
      const displayName = req.user.displayName || userEmail.split('@')[0] || 'User';
      
      // Generate demo data based on user info
      // Use user's email prefix for company name if available
      const emailPrefix = userEmail.split('@')[0];
      const companyName = displayName !== emailPrefix 
        ? `${displayName} Media` 
        : `${emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)} Media`;
      
      const demoProfile = {
        name: displayName,
        email: userEmail,
        companyName: companyName,
        companyAddress: '123 Sport Ave, Paris',
        avatarUrl: req.user.photoURL || 'https://all-sports.co/app/img/Allsports-logo.png',
        // Don't set subscription field - user must select a plan on /subscription page first
        // subscription will be set when user explicitly selects a plan (including FREE)
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await profileRef.set(demoProfile);
      console.log(`[PROFILE] ✓ Auto-created profile with demo data for user: ${userId}`, {
        name: demoProfile.name,
        email: demoProfile.email,
        companyName: demoProfile.companyName
      });

      // Also initialize subscription and credits for new user with proper period dates
      const now = new Date();
      const nextMonth = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now
      await db.collection('subscriptions').doc(userId).set({
        userId: userId,
        plan: 'FREE',
        status: 'active',
        stripeSubscriptionId: null,
        currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(nextMonth),
        lastInvoiceId: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Initialize FREE user with 3 credits and 30-day period
      const nowTimestamp = Date.now() / 1000;
      const nextMonthTimestamp = nowTimestamp + (30 * 24 * 60 * 60); // 30 days from now
      await resetCreditsForUser(userId, 'FREE', nowTimestamp, nextMonthTimestamp);
      console.log(`[PROFILE] ✓ Initialized subscription and credits for user: ${userId} (3 credits for FREE plan)`);

      // Return the newly created profile
      const newProfileDoc = await profileRef.get();
      return res.json(newProfileDoc.data());
    }

    // Profile exists, return it
    res.json(profileDoc.data());
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Generate AI poster image
app.post('/api/generate-image', async (req, res) => {
  try {
    const { config, style } = req.body;
    const userId = req.user.uid;

    // Validate required fields
    if (!config || !style) {
      return res.status(400).json({ error: 'Config and style are required' });
    }

    const validStyles = ['stadium', 'players', 'abstract', 'prestige'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({ error: 'Invalid style. Must be one of: stadium, players, abstract, prestige' });
    }

    // Check subscription and credits BEFORE generation
    const { subscription, creditBalance } = await getUserSubscriptionData(userId);
    const { canGenerate, reason } = canUserGenerate(subscription, creditBalance);

    if (!canGenerate) {
      console.log(`[IMAGE] Generation blocked for user ${userId}: ${reason}`);
      
      // Special handling for FREE users who exceeded limit - redirect to subscription
      const shouldRedirectToSubscription = subscription.plan === 'FREE' && creditBalance.remainingCredits <= 0;
      
      return res.status(403).json({ 
        error: 'Generation not allowed',
        reason: reason,
        subscription: subscription.plan,
        status: subscription.status,
        remainingCredits: creditBalance.remainingCredits,
        monthlyCredits: creditBalance.monthlyCredits,
        usedCredits: creditBalance.usedCredits,
        redirectToSubscription: shouldRedirectToSubscription // Flag for frontend to redirect
      });
    }

    console.log(`[IMAGE] Generating image for user ${userId} with style: ${style} (Credits: ${creditBalance.remainingCredits})`);

    // Deduct credit BEFORE generation (atomic operation)
    // Note: For BASIC plan, this tracks usage but doesn't actually deduct (unlimited)
    let newCreditBalance;
    try {
      newCreditBalance = await deductCredit(userId, subscription.plan);
      if (subscription.plan === 'BASIC') {
        console.log(`[IMAGE] Usage tracked for BASIC user. Used: ${newCreditBalance.usedCredits} (Unlimited credits)`);
      } else {
        console.log(`[IMAGE] Credit deducted. Remaining: ${newCreditBalance.remainingCredits}`);
      }
    } catch (creditError) {
      console.error(`[IMAGE] Failed to deduct credit: ${creditError.message}`);
      return res.status(403).json({ 
        error: 'Failed to deduct credit',
        reason: creditError.message
      });
    }

    const ai = getAIClient();
    let prompt = "";

    if (style === 'stadium') {
      prompt = `
        Generate a vertical (9:16) photorealistic image of a majestic soccer stadium at night.
        CRITICAL: The pitch must be COMPLETELY EMPTY. NO PLAYERS, NO REFEREES, NO PEOPLE on the green grass.
        Visuals:
        - Wide angle shot from pitch level looking up at the stands.
        - Pristine green grass illuminated by bright, dramatic stadium floodlights.
        - The stands are dark but filled with the atmosphere of a crowd (blurred background).
        - Cinematic lighting, lens flare, high contrast, professional sports photography.
        - The image must purely focus on the architecture and the empty field.
        Negative prompt: players, people on field, athletes, american football, text, watermark, day, match in progress.
      `;
    } else if (style === 'players') {
      prompt = `
        Génère un fond ultra-réaliste pour une affiche de football, avec les deux top players RECONNAISSABLES de l'équipe ${config.teamA} et de l'équipe ${config.teamB} pour la saison 2025/2026.
        Composition obligatoire :
        – Les joueurs doivent être cadrés très haut dans l'image : leurs têtes, épaules et torses doivent se trouver dans le tiers supérieur de l'image.
        – Leurs corps ne doivent JAMAIS descendre dans la zone inférieure où les logos seront ajoutés.
        – L'action doit être dynamique : course, duel, dribble, tir, pression défensive.
        – Les joueurs doivent être imposants, très visibles, style cinématographique AAA.
        Positionnement :
        – Joueur star de l'équipe ${config.teamA} à gauche.
        – Joueur star de l'équipe ${config.teamB} à droite.
        – Les deux joueurs sont suffisamment hauts et centrés pour qu'aucun logo ne puisse les couvrir.
        Contrainte stricte :
        – EXACTEMENT un seul ballon visible, au sol ou légèrement devant eux, jamais plus d'un.
        Arrière-plan :
        – Stade moderne légèrement flou, lumières fortes, ambiance match-night premium.
        – Effets lumineux discrets pour renforcer l'intensité.
        Style :
        – Ultra réaliste, détaillé, proche d'une affiche FIFA 25 ou EA Sports FC.
        – Aucun texte, aucun logo.
        – Format vertical haute résolution.
        Negative prompt: text, typography, letters, words, watermark, american football, rugby, helmet, shoulder pads, distorted faces, bad anatomy, cartoon, illustration, drawing, painting, grid, multiple balls, two balls, many balls, extra balls, duplicate balls, flying balls array, full body shot, distant figures, wide shot, small figures, generic players, players in lower half.
      `;
    } else if (style === 'abstract') {
      prompt = `
        Crée un fond abstrait pour une affiche de football, inspiré des visuels sportifs modernes.
        Utilise uniquement un mélange artistique des deux couleurs principales des équipes du match (${config.teamA} vs ${config.teamB}).
        Style dynamique, énergique, avec des formes abstraites, des textures fluides, des dégradés vifs et des effets lumineux modernes.
        Le fond doit évoquer l'intensité d'un match sans montrer de joueurs ni d'éléments figuratifs.
        Aspect premium, propre, sans texte ni logos, compatible avec des overlays typographiques.
        Format vertical (9:16) pour une affiche.
        Negative prompt: players, people, ball, stadium, grass, text, typography, letters, words, watermark, realistic figures.
      `;
    } else if (style === 'prestige') {
      prompt = `
        Génère un fond extrêmement élégant et premium pour une affiche de football prestige.
        Palette uniquement noire et or, avec un rendu luxueux, sobre, moderne et haut de gamme.
        Inclure des reflets dorés subtils, des lignes minimalistes, des textures métalliques fines ou des effets de lumière sophistiqués.
        Le fond doit évoquer l'élégance, l'importance d'un match VIP ou d'une finale, sans montrer de joueurs.
        Style minimaliste, puissant, idéal pour un événement premium.
        Format vertical (9:16) haute résolution.
        Negative prompt: players, people, ball, stadium, grass, green, colors, text, typography, letters, words, watermark.
      `;
    }

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        console.log(`[IMAGE] Attempt ${retryCount + 1} for style: ${style}`);
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { text: prompt }
            ]
          },
          config: {
            imageConfig: {
              aspectRatio: "9:16"
            }
          }
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              const imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              const creditsDisplay = newCreditBalance.remainingCredits === -1 ? 'Unlimited' : newCreditBalance.remainingCredits;
              console.log(`[IMAGE] ✓ Successfully generated image for user ${userId} (Remaining credits: ${creditsDisplay})`);
              return res.json({ 
                imageUrl: imageData,
                creditsRemaining: newCreditBalance.remainingCredits === -1 ? 'unlimited' : newCreditBalance.remainingCredits
              });
            }
          }
        }

        const textPart = parts?.find(p => p.text);
        if (textPart) {
          console.warn("[IMAGE] Gemini Refusal/Text:", textPart.text);
          throw new Error(`Gemini refused to generate image: ${textPart.text.substring(0, 50)}...`);
        }

        throw new Error("Gemini returned no image data.");

      } catch (error) {
        console.error("[IMAGE] Generation Error:", error.message);

        if (error.message?.includes('429') || error.status === 429 || error.code === 429 || error.status === 'RESOURCE_EXHAUSTED') {
          if (retryCount < maxRetries) {
            const delay = (retryCount + 1) * 5000;
            console.warn(`[IMAGE] Rate limit hit. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            continue;
          } else {
            return res.status(429).json({ error: "Quota exceeded. Please try fewer matches or wait a minute." });
          }
        }
        throw error;
      }
    }

    return res.status(500).json({ error: "Failed to generate image after retries." });
  } catch (error) {
    console.error('[IMAGE] Error generating image:', error);
    return res.status(500).json({ 
      error: 'Failed to generate image',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Save poster with image upload to Firebase Storage
app.post('/api/posters', async (req, res) => {
  try {
    const { match, backgroundImage, finalPosterUrl, style, type } = req.body;

    // Validate required fields
    if (!match || !finalPosterUrl) {
      return res.status(400).json({ error: 'Match and finalPosterUrl are required' });
    }

    const userId = req.user.uid;
    console.log(`[POSTER] Saving poster for user: ${userId}`);

    // Convert base64 data URL to buffer
    let imageBuffer;
    let contentType = 'image/png';
    
    if (finalPosterUrl.startsWith('data:')) {
      const matches = finalPosterUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: 'Invalid image data format' });
      }
      contentType = matches[1] || 'image/png';
      const base64Data = matches[2];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      return res.status(400).json({ error: 'Image must be in base64 data URL format' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const fileExtension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
    const fileName = `posters/${userId}/${timestamp}-${randomId}.${fileExtension}`;

    // Upload to Firebase Storage
    const bucket = storage.bucket();
    const file = bucket.file(fileName);

    console.log(`[POSTER] Uploading image to Storage: ${fileName}`);

    await file.save(imageBuffer, {
      metadata: {
        contentType: contentType,
        metadata: {
          userId: userId,
          uploadedAt: new Date().toISOString()
        }
      },
      public: false // Private files, access via signed URLs
    });

    // Make file publicly readable (or use signed URLs for private access)
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    console.log(`[POSTER] Image uploaded successfully: ${publicUrl}`);

    // Handle backgroundImage - if it's a base64 data URL, upload it to Storage
    // Otherwise, just store the URL
    let backgroundImageUrl = '';
    if (backgroundImage) {
      if (backgroundImage.startsWith('data:')) {
        // It's a base64 data URL - upload to Storage
        try {
          const bgMatches = backgroundImage.match(/^data:([^;]+);base64,(.+)$/);
          if (bgMatches) {
            const bgContentType = bgMatches[1] || 'image/png';
            const bgBase64Data = bgMatches[2];
            const bgImageBuffer = Buffer.from(bgBase64Data, 'base64');
            const bgFileExtension = bgContentType.includes('jpeg') || bgContentType.includes('jpg') ? 'jpg' : 'png';
            const bgFileName = `backgrounds/${userId}/${timestamp}-${randomId}-bg.${bgFileExtension}`;
            const bgFile = bucket.file(bgFileName);
            
            await bgFile.save(bgImageBuffer, {
              metadata: {
                contentType: bgContentType,
                metadata: {
                  userId: userId,
                  uploadedAt: new Date().toISOString()
                }
              },
              public: false
            });
            
            await bgFile.makePublic();
            backgroundImageUrl = `https://storage.googleapis.com/${bucket.name}/${bgFileName}`;
            console.log(`[POSTER] Background image uploaded to Storage: ${backgroundImageUrl}`);
          } else {
            backgroundImageUrl = 'generated'; // Fallback if parsing fails
          }
        } catch (bgError) {
          console.warn('[POSTER] Failed to upload background image, using reference:', bgError.message);
          backgroundImageUrl = 'generated'; // Fallback reference
        }
      } else {
        // It's already a URL - safe to store directly
        backgroundImageUrl = backgroundImage;
      }
    }

    // Save poster metadata to Firestore
    const posterData = {
      userId: userId,
      match: {
        id: match.id,
        competition: match.competition,
        date: match.date,
        time: match.time,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        venue: match.venue || 'Stadium'
      },
      backgroundImage: backgroundImageUrl, // Store URL or reference, not base64
      finalPosterUrl: publicUrl, // Store the Storage URL
      style: style || 'stadium',
      type: type || 'classic',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const posterRef = db.collection('posters').doc();
    await posterRef.set(posterData);

    console.log(`[POSTER] Poster saved to Firestore with ID: ${posterRef.id}`);

    res.json({
      success: true,
      posterId: posterRef.id,
      poster: {
        id: posterRef.id,
        ...posterData,
        finalPosterUrl: publicUrl
      }
    });
  } catch (error) {
    console.error('[POSTER] Error saving poster:', error);
    return res.status(500).json({ 
      error: 'Failed to save poster',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Get user's saved posters
app.get('/api/posters', async (req, res) => {
  try {
    const userId = req.user.uid;
    
    console.log(`[POSTER] Fetching posters for user: ${userId}`);

    const postersRef = db.collection('posters')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');

    const snapshot = await postersRef.get();

    if (snapshot.empty) {
      return res.json({ posters: [] });
    }

    const posters = snapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore timestamps to ISO strings for frontend
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
      };
    });

    console.log(`[POSTER] Found ${posters.length} posters for user ${userId}`);

    res.json({ posters });
  } catch (error) {
    console.error('[POSTER] Error fetching posters:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch posters',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Helper function to extract file path from Storage URL
const extractFilePath = (url) => {
  if (!url) return null;
  try {
    // Handle different Storage URL formats:
    // https://storage.googleapis.com/bucket-name/path/to/file
    // https://firebasestorage.googleapis.com/v0/b/bucket-name/o/path%2Fto%2Ffile
    if (url.includes('storage.googleapis.com')) {
      const urlObj = new URL(url);
      // Remove leading slash and bucket name from pathname
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      // Skip the bucket name (first part) and join the rest
      if (pathParts.length > 1) {
        return pathParts.slice(1).join('/');
      }
    } else if (url.includes('firebasestorage.googleapis.com')) {
      // Handle Firebase Storage API format
      const match = url.match(/\/o\/([^?]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    // If it's already a path (not a full URL), return as is
    if (!url.startsWith('http')) {
      return url;
    }
    return null;
  } catch (e) {
    console.warn('[POSTER] Failed to parse URL:', url, e);
    return null;
  }
};

// Helper function to delete poster files from Storage and Firestore
const deletePosterFiles = async (posterData, posterId, bucket) => {
  const filesToDelete = [];

  // Delete final poster image from Storage
  if (posterData.finalPosterUrl) {
    const posterFilePath = extractFilePath(posterData.finalPosterUrl);
    if (posterFilePath) {
      filesToDelete.push(posterFilePath);
      console.log(`[CLEANUP] Will delete poster image: ${posterFilePath}`);
    }
  }

  // Delete background image from Storage if it was uploaded
  if (posterData.backgroundImage && 
      posterData.backgroundImage.startsWith('http') && 
      !posterData.backgroundImage.includes('all-sports.co') &&
      !posterData.backgroundImage.includes('wsrv.nl')) {
    const bgFilePath = extractFilePath(posterData.backgroundImage);
    if (bgFilePath) {
      filesToDelete.push(bgFilePath);
      console.log(`[CLEANUP] Will delete background image: ${bgFilePath}`);
    }
  }

  // Delete all files from Storage
  for (const filePath of filesToDelete) {
    try {
      const file = bucket.file(filePath);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        console.log(`[CLEANUP] ✓ Deleted file from Storage: ${filePath}`);
      } else {
        console.log(`[CLEANUP] File not found in Storage (may already be deleted): ${filePath}`);
      }
    } catch (storageError) {
      console.warn(`[CLEANUP] Failed to delete file ${filePath} from Storage:`, storageError.message);
      // Continue with other deletions even if one fails
    }
  }

  // Delete from Firestore
  const posterRef = db.collection('posters').doc(posterId);
  await posterRef.delete();
  console.log(`[CLEANUP] ✓ Deleted document from Firestore: ${posterId}`);
};

// Delete a poster
app.delete('/api/posters/:posterId', async (req, res) => {
  try {
    const { posterId } = req.params;
    const userId = req.user.uid;

    console.log(`[POSTER] Deleting poster ${posterId} for user ${userId}`);

    const posterRef = db.collection('posters').doc(posterId);
    const posterDoc = await posterRef.get();

    if (!posterDoc.exists) {
      return res.status(404).json({ error: 'Poster not found' });
    }

    const posterData = posterDoc.data();
    
    // Verify ownership
    if (posterData.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const bucket = storage.bucket();
    await deletePosterFiles(posterData, posterId, bucket);

    console.log(`[POSTER] Poster ${posterId} deleted successfully`);

    res.json({ success: true, message: 'Poster deleted successfully' });
  } catch (error) {
    console.error('[POSTER] Error deleting poster:', error);
    return res.status(500).json({ 
      error: 'Failed to delete poster',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Save/Update user profile
app.post('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify the user is updating their own profile
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const {
      name,
      companyName,
      companyAddress,
      email,
      avatarUrl,
      subscription
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const profileData = {
      name,
      companyName: companyName || '',
      companyAddress: companyAddress || '',
      email,
      avatarUrl: avatarUrl || '',
      subscription: subscription || 'FREE',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const profileRef = db.collection('users').doc(userId);
    const profileDoc = await profileRef.get();

    if (profileDoc.exists) {
      // Update existing profile
      delete profileData.createdAt; // Don't update createdAt on updates
      await profileRef.update(profileData);
      console.log(`Profile updated for user: ${userId}`);
    } else {
      // Create new profile
      await profileRef.set(profileData);
      console.log(`Profile created for user: ${userId}`);
    }

    // Return the updated profile
    const updatedDoc = await profileRef.get();
    res.json({
      success: true,
      profile: updatedDoc.data()
    });
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// ============================================================================
// STRIPE SUBSCRIPTION ENDPOINTS
// ============================================================================

/**
 * Create Stripe Checkout Session
 * POST /api/subscriptions/create-checkout
 */
app.post('/api/subscriptions/create-checkout', async (req, res) => {
  try {
    console.log('[BACKEND] [CHECKOUT] 🛒 Creating checkout session...');
    if (!stripeClient) {
      console.error('[BACKEND] [CHECKOUT] ❌ Stripe is not configured');
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    const { plan, priceId } = req.body;
    const userId = req.user.uid;
    const userEmail = req.user.email;

    console.log('[BACKEND] [CHECKOUT] 📋 Request details:', { userId, userEmail, plan, priceId });

    if (!plan || !priceId) {
      console.error('[BACKEND] [CHECKOUT] ❌ Missing plan or priceId');
      return res.status(400).json({ error: 'Plan and priceId are required' });
    }

    const validPlans = ['BASIC', 'PRO', 'PREMIUM'];
    if (!validPlans.includes(plan)) {
      console.error('[BACKEND] [CHECKOUT] ❌ Invalid plan:', plan);
      return res.status(400).json({ error: 'Invalid plan. Must be one of: BASIC, PRO, PREMIUM' });
    }

    // Get or create Stripe customer
    console.log('[BACKEND] [CHECKOUT] 👤 Getting or creating Stripe customer...');
    const customer = await getOrCreateStripeCustomer(userId, userEmail);
    console.log('[BACKEND] [CHECKOUT] ✅ Stripe customer:', { customerId: customer.id });

    // Get the base URL for redirects
    const baseUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';

    // Create checkout session
    const session = await stripeClient.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: plan === 'PREMIUM' ? 'subscription' : 'subscription', // Both are subscriptions
      success_url: `${baseUrl}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscription?canceled=true`,
      metadata: {
        userId: userId,
        plan: plan
      },
      subscription_data: {
        metadata: {
          userId: userId,
          plan: plan
        }
      }
    });

    console.log(`[STRIPE] Checkout session created for user ${userId}, plan ${plan}: ${session.id}`);

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('[STRIPE] Error creating checkout session:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    });
  }
});

/**
 * Create Customer Portal Session
 * POST /api/subscriptions/create-portal
 */
app.post('/api/subscriptions/create-portal', async (req, res) => {
  try {
    if (!stripeClient) {
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    const userId = req.user.uid;
    const baseUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';

    // Get user's Stripe customer ID
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || !userDoc.data().stripeCustomerId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const customerId = userDoc.data().stripeCustomerId;

    // Get subscription to check if Pro plan is in commitment period
    const subscriptionRef = db.collection('subscriptions').doc(userId);
    const subscriptionDoc = await subscriptionRef.get();
    const subscription = subscriptionDoc.exists ? subscriptionDoc.data() : null;

    // Create portal session
    const session = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/profile`,
    });

    console.log(`[STRIPE] Portal session created for user ${userId}: ${session.id}`);

    res.json({
      url: session.url
    });
  } catch (error) {
    console.error('[STRIPE] Error creating portal session:', error);
    return res.status(500).json({ 
      error: 'Failed to create portal session',
      message: error.message 
    });
  }
});

/**
 * Set user subscription to FREE (for free plan selection)
 * POST /api/subscriptions/set-free
 */
/**
 * Set user subscription to FREE (for free plan selection)
 * POST /api/subscriptions/set-free
 * IMPORTANT: Only resets credits if period expired or no credit record exists
 */
app.post('/api/subscriptions/set-free', async (req, res) => {
  try {
    const userId = req.user.uid;

    // Check existing credit balance to see if we should reset
    const creditRef = db.collection('credit_balance').doc(userId);
    const creditDoc = await creditRef.get();
    
    let shouldResetCredits = false;
    let now = new Date();
    let nextMonth = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    let nowTimestamp = Date.now() / 1000;
    let nextMonthTimestamp = nowTimestamp + (30 * 24 * 60 * 60);

    if (!creditDoc.exists) {
      // No credit balance exists, initialize it
      shouldResetCredits = true;
      console.log(`[STRIPE] Initializing credits for new FREE user: ${userId}`);
    } else {
      // Check if period has expired (30 days passed)
      const creditData = creditDoc.data();
      const periodEnd = creditData.periodEnd?.toDate ? creditData.periodEnd.toDate() : null;
      
      if (periodEnd && now >= periodEnd) {
        // Period expired, reset credits
        shouldResetCredits = true;
        console.log(`[STRIPE] Period expired for FREE user ${userId}, resetting credits`);
      } else {
        // Period still active, keep existing credits
        shouldResetCredits = false;
        console.log(`[STRIPE] Period still active for FREE user ${userId}, keeping existing credits (${creditData.remainingCredits || 0} remaining)`);
        
        // Use existing period dates
        if (periodEnd) {
          nextMonth = periodEnd;
          nextMonthTimestamp = Math.floor(periodEnd.getTime() / 1000);
        }
        if (creditData.periodStart?.toDate) {
          now = creditData.periodStart.toDate();
          nowTimestamp = Math.floor(now.getTime() / 1000);
        }
      }
    }

    // Update subscription collection with proper period dates
    await db.collection('subscriptions').doc(userId).set({
      userId: userId,
      plan: 'FREE',
      status: 'active',
      stripeSubscriptionId: null,
      currentPeriodStart: admin.firestore.Timestamp.fromDate(now),
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(nextMonth),
      lastInvoiceId: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Update user profile subscription field
    await db.collection('users').doc(userId).update({
      subscription: 'FREE',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Only reset credits if period expired or no credit record exists
    if (shouldResetCredits) {
      await resetCreditsForUser(userId, 'FREE', nowTimestamp, nextMonthTimestamp);
      console.log(`[STRIPE] User ${userId} set to FREE plan - credits reset to 3`);
    } else {
      console.log(`[STRIPE] User ${userId} set to FREE plan - credits preserved`);
    }

    res.json({
      success: true,
      plan: 'FREE'
    });
  } catch (error) {
    console.error('[STRIPE] Error setting FREE plan:', error);
    return res.status(500).json({ 
      error: 'Failed to set FREE plan',
      message: error.message 
    });
  }
});

/**
 * Sync subscription from Stripe (call after checkout to ensure immediate update)
 * POST /api/subscriptions/sync
 */
app.post('/api/subscriptions/sync', async (req, res) => {
  try {
    console.log('[BACKEND] [SYNC] 🔄 Starting subscription sync...');
    if (!stripeClient) {
      console.error('[BACKEND] [SYNC] ❌ Stripe is not configured');
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    const userId = req.user.uid;
    console.log('[BACKEND] [SYNC] 👤 User ID:', userId);
    
    // Get user's Stripe customer ID
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || !userDoc.data().stripeCustomerId) {
      console.error('[BACKEND] [SYNC] ❌ No Stripe customer found for user:', userId);
      return res.status(404).json({ error: 'No Stripe customer found' });
    }

    const customerId = userDoc.data().stripeCustomerId;
    console.log('[BACKEND] [SYNC] 💳 Stripe customer ID:', customerId);

    // Get active or trialing subscriptions from Stripe
    // Check both 'active' and 'trialing' statuses (trialing happens right after checkout)
    console.log('[BACKEND] [SYNC] 📡 Fetching subscriptions from Stripe...');
    const [activeSubscriptions, trialingSubscriptions] = await Promise.all([
      stripeClient.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      }),
      stripeClient.subscriptions.list({
        customer: customerId,
        status: 'trialing',
        limit: 1
      })
    ]);

    const allSubscriptions = [...activeSubscriptions.data, ...trialingSubscriptions.data];
    
    if (allSubscriptions.length === 0) {
      console.error('[BACKEND] [SYNC] ❌ No active or trialing subscription found in Stripe');
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Use the most recent subscription (should be the one just created)
    const subscriptions = { data: allSubscriptions.sort((a, b) => b.created - a.created) };

    const stripeSubscription = subscriptions.data[0];
    const priceId = stripeSubscription.items.data[0]?.price?.id;
    const planFromPrice = getPlanFromPriceId(priceId);

    // IMPORTANT: Fallback to subscription metadata if price ID mapping fails
    // This handles cases where environment variables aren't properly set
    const planFromMetadata = stripeSubscription.metadata?.plan;
    const plan = planFromPrice !== 'FREE' ? planFromPrice : (planFromMetadata || 'FREE');

    console.log('[BACKEND] [SYNC] 🔍 Plan resolution:', {
      priceId,
      planFromPrice,
      planFromMetadata,
      finalPlan: plan
    });

    console.log('[BACKEND] [SYNC] 📋 Subscription details:', {
      subscriptionId: stripeSubscription.id,
      priceId,
      plan,
      status: stripeSubscription.status,
      periodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      periodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString()
    });

    // Convert timestamps to integers (Firestore Timestamp requires integer seconds)
    // Fallback to current time + 30 days if timestamps are missing
    const nowSyncTime = Math.floor(Date.now() / 1000);
    const thirtyDaysSyncTime = nowSyncTime + (30 * 24 * 60 * 60);

    const syncPeriodStart = typeof stripeSubscription.current_period_start === 'number'
      ? Math.floor(stripeSubscription.current_period_start)
      : nowSyncTime;
    const syncPeriodEnd = typeof stripeSubscription.current_period_end === 'number'
      ? Math.floor(stripeSubscription.current_period_end)
      : thirtyDaysSyncTime;

    if (typeof stripeSubscription.current_period_start !== 'number') {
      console.warn(`[BACKEND] [SYNC] ⚠️ Missing current_period_start, using fallback: ${syncPeriodStart}`);
    }
    if (typeof stripeSubscription.current_period_end !== 'number') {
      console.warn(`[BACKEND] [SYNC] ⚠️ Missing current_period_end, using fallback: ${syncPeriodEnd}`);
    }

    // Update subscription collection
    console.log('[BACKEND] [SYNC] 💾 Updating subscriptions collection...');
    await db.collection('subscriptions').doc(userId).set({
      userId: userId,
      stripeSubscriptionId: stripeSubscription.id,
      plan: plan,
      status: stripeSubscription.status,
      currentPeriodStart: admin.firestore.Timestamp.fromDate(new Date(syncPeriodStart * 1000)),
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(syncPeriodEnd * 1000)),
      lastInvoiceId: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('[BACKEND] [SYNC] ✅ Subscriptions collection updated');

    // Update user profile subscription field
    console.log('[BACKEND] [SYNC] 👤 Updating user profile...');
    await userRef.update({
      subscription: plan,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('[BACKEND] [SYNC] ✅ User profile updated with plan:', plan);

    // Force reset credits for the new plan
    console.log('[BACKEND] [SYNC] 💰 Resetting credits for plan:', plan);
    await resetCreditsForUser(
      userId,
      plan,
      syncPeriodStart,
      syncPeriodEnd
    );
    console.log('[BACKEND] [SYNC] ✅ Credits reset for plan:', plan);

    console.log(`[BACKEND] [SYNC] ✅ ✓ Subscription synced successfully for user ${userId}, plan ${plan}`);

    res.json({
      success: true,
      plan: plan,
      message: 'Subscription synced successfully'
    });
  } catch (error) {
    console.error('[BACKEND] [SYNC] ❌ Error syncing subscription:', error);
    return res.status(500).json({ 
      error: 'Failed to sync subscription',
      message: error.message 
    });
  }
});

/**
 * Get subscription status and credits
 * GET /api/subscriptions/status
 */
app.get('/api/subscriptions/status', async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log(`[BACKEND] [STATUS] 📊 Getting subscription status for user: ${userId}`);
    const { subscription, creditBalance } = await getUserSubscriptionData(userId);

    const statusData = {
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart?.toDate?.()?.toISOString() || subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd?.toDate?.()?.toISOString() || subscription.currentPeriodEnd,
      },
      credits: {
        monthlyCredits: creditBalance.monthlyCredits,
        usedCredits: creditBalance.usedCredits,
        remainingCredits: creditBalance.remainingCredits,
        periodStart: creditBalance.periodStart?.toDate?.()?.toISOString() || creditBalance.periodStart,
        periodEnd: creditBalance.periodEnd?.toDate?.()?.toISOString() || creditBalance.periodEnd,
      }
    };

    console.log(`[BACKEND] [STATUS] ✅ Returning status:`, {
      plan: statusData.subscription.plan,
      status: statusData.subscription.status,
      monthlyCredits: statusData.credits.monthlyCredits,
      remainingCredits: statusData.credits.remainingCredits,
      usedCredits: statusData.credits.usedCredits
    });

    res.json(statusData);
  } catch (error) {
    console.error('[BACKEND] [STATUS] ❌ Error getting subscription status:', error);
    return res.status(500).json({ 
      error: 'Failed to get subscription status',
      message: error.message 
    });
  }
});

/**
 * Stripe Webhook Handler
 * POST /api/subscriptions/webhook
 * 
 * This is the CENTRAL POINT for credit resets
 * Only resets credits when invoice.paid is received for subscription_cycle
 */
app.post('/api/subscriptions/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeClient || !webhookSecret) {
    console.error('[WEBHOOK] Stripe or webhook secret not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let event;

  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[WEBHOOK] Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[WEBHOOK] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planFromMetadata = session.metadata?.plan;

        console.log(`[WEBHOOK] checkout.session.completed - userId: ${userId}, plan from metadata: ${planFromMetadata}`);

        if (!userId) {
          console.warn('[WEBHOOK] checkout.session.completed missing userId');
          break;
        }

        // Get subscription details from Stripe
        const subscriptionId = session.subscription;
        if (!subscriptionId) {
          console.warn('[WEBHOOK] No subscription ID in checkout session');
          break;
        }

        try {
          const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price?.id;
          console.log(`[WEBHOOK] Retrieved subscription ${subscriptionId}, price ID: ${priceId}`);
          
          // Try to get plan from price ID first, then fall back to metadata
          // Following documentation pattern: use metadata as fallback
          const planFromPrice = getPlanFromPriceId(priceId);
          const planFromSubMetadata = subscription.metadata?.plan;
          const finalPlan = planFromPrice !== 'FREE' ? planFromPrice : 
                           (planFromSubMetadata || planFromMetadata || 'FREE');
          
          console.log(`[WEBHOOK] Plan resolution:`, {
            priceId,
            planFromPrice,
            planFromSubMetadata,
            planFromMetadata,
            finalPlan,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end
          });

          // Convert timestamps to integers (Firestore Timestamp requires integer seconds)
          // Fallback to current time + 30 days if timestamps are missing
          const now = Math.floor(Date.now() / 1000);
          const thirtyDaysLater = now + (30 * 24 * 60 * 60);

          const checkoutPeriodStart = typeof subscription.current_period_start === 'number'
            ? Math.floor(subscription.current_period_start)
            : now;
          const checkoutPeriodEnd = typeof subscription.current_period_end === 'number'
            ? Math.floor(subscription.current_period_end)
            : thirtyDaysLater;

          if (typeof subscription.current_period_start !== 'number') {
            console.warn(`[WEBHOOK] Missing current_period_start, using fallback: ${checkoutPeriodStart}`);
          }
          if (typeof subscription.current_period_end !== 'number') {
            console.warn(`[WEBHOOK] Missing current_period_end, using fallback: ${checkoutPeriodEnd}`);
          }

          // Save subscription to Firestore
          await db.collection('subscriptions').doc(userId).set({
            userId: userId,
            stripeSubscriptionId: subscriptionId,
            plan: finalPlan,
            status: subscription.status,
            currentPeriodStart: admin.firestore.Timestamp.fromDate(new Date(checkoutPeriodStart * 1000)),
            currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(checkoutPeriodEnd * 1000)),
            lastInvoiceId: null, // Will be set on first invoice.paid
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          // Update user profile subscription field
          await db.collection('users').doc(userId).update({
            subscription: finalPlan,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Initialize credits for new subscription (following documentation pattern)
          await resetCreditsForUser(
            userId,
            finalPlan,
            checkoutPeriodStart,
            checkoutPeriodEnd
          );

          console.log(`[WEBHOOK] ✓ Subscription created for user ${userId}, plan ${finalPlan} - Updated user profile and credits`);
        } catch (error) {
          console.error(`[WEBHOOK] Error processing checkout.session.completed:`, error.message);
          // Don't break - let the webhook return success so Stripe doesn't retry
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        
        // For Premium (annual), we need to handle monthly resets
        // For other plans, only process subscription_cycle invoices
        const isSubscriptionCycle = invoice.billing_reason === 'subscription_cycle';
        
        if (!isSubscriptionCycle) {
          console.log(`[WEBHOOK] invoice.paid skipped - billing_reason is ${invoice.billing_reason}, not subscription_cycle`);
          break;
        }

        const subscriptionId = invoice.subscription;
        if (!subscriptionId) {
          console.warn('[WEBHOOK] invoice.paid has no subscription ID');
          break;
        }

        // Find user by subscription ID
        const subscriptionsSnapshot = await db.collection('subscriptions')
          .where('stripeSubscriptionId', '==', subscriptionId)
          .limit(1)
          .get();

        if (subscriptionsSnapshot.empty) {
          console.warn(`[WEBHOOK] No subscription found for subscription ID ${subscriptionId}`);
          break;
        }

        const subscriptionDoc = subscriptionsSnapshot.docs[0];
        const userId = subscriptionDoc.id;
        const subscriptionData = subscriptionDoc.data();

        // DOUBLE RESET PROTECTION: Check if this invoice was already processed
        if (subscriptionData.lastInvoiceId === invoice.id) {
          console.log(`[WEBHOOK] Invoice ${invoice.id} already processed for user ${userId}, skipping`);
          break;
        }

        const plan = subscriptionData.plan;
        const periodStart = invoice.period_start;
        const periodEnd = invoice.period_end;

        // For Premium (annual), check if a month has passed since last reset
        if (plan === 'PREMIUM') {
          const creditRef = db.collection('credit_balance').doc(userId);
          const creditDoc = await creditRef.get();
          
          if (creditDoc.exists) {
            const creditData = creditDoc.data();
            const lastReset = creditData.periodStart?.toDate ? creditData.periodStart.toDate() : null;
            
            if (lastReset) {
              const now = new Date();
              const daysSinceReset = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));
              
              // Only reset if at least 30 days have passed (monthly reset for annual plan)
              if (daysSinceReset < 30) {
                console.log(`[WEBHOOK] Premium plan: Only ${daysSinceReset} days since last reset, skipping monthly reset`);
                // Still update the invoice ID to prevent double processing
                await db.collection('subscriptions').doc(userId).update({
                  lastInvoiceId: invoice.id,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                break;
              }
              
              // Calculate next monthly period (30 days from last reset)
              const nextPeriodStart = Math.floor(lastReset.getTime() / 1000) + (30 * 24 * 60 * 60);
              const nextPeriodEnd = nextPeriodStart + (30 * 24 * 60 * 60);
              
              await resetCreditsForUser(userId, plan, nextPeriodStart, nextPeriodEnd);
              
              await db.collection('subscriptions').doc(userId).update({
                lastInvoiceId: invoice.id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              
              console.log(`[WEBHOOK] ✓ Premium monthly credits reset for user ${userId} (invoice: ${invoice.id})`);
              break;
            }
          }
        }

        // For other plans (monthly), reset credits normally
        // Reset credits (this is the ONLY place credits are reset)
        await resetCreditsForUser(userId, plan, periodStart, periodEnd);

        // Update subscription with new invoice ID and period
        await db.collection('subscriptions').doc(userId).update({
          lastInvoiceId: invoice.id,
          currentPeriodStart: admin.firestore.Timestamp.fromDate(new Date(periodStart * 1000)),
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(periodEnd * 1000)),
          status: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[WEBHOOK] ✓ Credits reset for user ${userId} (plan: ${plan}, invoice: ${invoice.id})`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) break;

        const subscriptionsSnapshot = await db.collection('subscriptions')
          .where('stripeSubscriptionId', '==', subscriptionId)
          .limit(1)
          .get();

        if (subscriptionsSnapshot.empty) break;

        const userId = subscriptionsSnapshot.docs[0].id;

        // Update status to past_due - NO CREDIT RESET
        await db.collection('subscriptions').doc(userId).update({
          status: 'past_due',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Note: We don't change the subscription plan in user profile on payment failure
        // The plan stays the same, just status changes to past_due

        console.log(`[WEBHOOK] Payment failed for user ${userId} - status set to past_due (NO credit reset, plan unchanged)`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        const subscriptionsSnapshot = await db.collection('subscriptions')
          .where('stripeSubscriptionId', '==', subscriptionId)
          .limit(1)
          .get();

        if (subscriptionsSnapshot.empty) break;

        const userId = subscriptionsSnapshot.docs[0].id;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId);

        const newPlan = plan || 'FREE';

        // Convert timestamps to integers (Firestore Timestamp requires integer seconds)
        // Fallback to current time + 30 days if timestamps are missing
        const nowUpdate = Math.floor(Date.now() / 1000);
        const thirtyDaysUpdate = nowUpdate + (30 * 24 * 60 * 60);

        const updatePeriodStart = typeof subscription.current_period_start === 'number'
          ? Math.floor(subscription.current_period_start)
          : nowUpdate;
        const updatePeriodEnd = typeof subscription.current_period_end === 'number'
          ? Math.floor(subscription.current_period_end)
          : thirtyDaysUpdate;

        await db.collection('subscriptions').doc(userId).update({
          plan: newPlan,
          status: subscription.status,
          currentPeriodStart: admin.firestore.Timestamp.fromDate(new Date(updatePeriodStart * 1000)),
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(updatePeriodEnd * 1000)),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update user profile subscription field
        await db.collection('users').doc(userId).update({
          subscription: newPlan,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[WEBHOOK] Subscription updated for user ${userId}, plan: ${newPlan}, status: ${subscription.status} - Updated user profile`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        const subscriptionsSnapshot = await db.collection('subscriptions')
          .where('stripeSubscriptionId', '==', subscriptionId)
          .limit(1)
          .get();

        if (subscriptionsSnapshot.empty) break;

        const userId = subscriptionsSnapshot.docs[0].id;
        const subscriptionData = subscriptionsSnapshot.docs[0].data();

        // Handle Premium → Pro downgrade
        if (subscriptionData.plan === 'PREMIUM') {
          // TODO: Create Pro subscription automatically
          // For now, just set to FREE
          await db.collection('subscriptions').doc(userId).update({
            plan: 'FREE',
            status: 'canceled',
            stripeSubscriptionId: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Update user profile subscription field
          await db.collection('users').doc(userId).update({
            subscription: 'FREE',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Reset credits to 3 for FREE plan with 30-day period
          const now = Date.now() / 1000;
          const nextMonth = now + (30 * 24 * 60 * 60); // 30 days from now
          await resetCreditsForUser(userId, 'FREE', now, nextMonth);
          console.log(`[WEBHOOK] Premium subscription canceled for user ${userId} - set to FREE - Updated user profile`);
        } else {
          // Regular cancellation
          await db.collection('subscriptions').doc(userId).update({
            plan: 'FREE',
            status: 'canceled',
            stripeSubscriptionId: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Update user profile subscription field
          await db.collection('users').doc(userId).update({
            subscription: 'FREE',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Reset credits to 3 for FREE plan with 30-day period
          const now = Date.now() / 1000;
          const nextMonth = now + (30 * 24 * 60 * 60); // 30 days from now
          await resetCreditsForUser(userId, 'FREE', now, nextMonth);
          console.log(`[WEBHOOK] Subscription canceled for user ${userId} - set to FREE - Updated user profile`);
        }
        break;
      }

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ============================================================================
// END STRIPE SUBSCRIPTION ENDPOINTS
// ============================================================================

// Health check endpoint (public, no auth required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'AllSports Backend API',
    version: '1.0.0'
  });
});

// Root endpoint (public, no auth required)
app.get('/', (req, res) => {
  res.json({ 
    message: 'AllSports Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      profile: '/api/profile/:userId'
    }
  });
});

// Automated cleanup function to delete expired posters
const cleanupExpiredPosters = async () => {
  try {
    console.log('[CLEANUP] Starting automated cleanup of expired posters...');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
    
    // Get all posters
    const postersRef = db.collection('posters');
    const snapshot = await postersRef.get();
    
    if (snapshot.empty) {
      console.log('[CLEANUP] No posters found in database');
      return;
    }

    const bucket = storage.bucket();
    let deletedCount = 0;
    let errorCount = 0;

    for (const doc of snapshot.docs) {
      try {
        const posterData = doc.data();
        const posterId = doc.id;
        
        // Check if poster has a match date
        if (!posterData.match || !posterData.match.date) {
          console.log(`[CLEANUP] Skipping poster ${posterId} - no match date`);
          continue;
        }

        // Parse the match date
        const matchDate = new Date(posterData.match.date);
        // Compare dates (ignore time, just compare dates)
        const matchDateOnly = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate());
        
        // If match date is before today, delete the poster
        if (matchDateOnly < today) {
          console.log(`[CLEANUP] Found expired poster ${posterId} - Match date: ${posterData.match.date}, Today: ${today.toISOString().split('T')[0]}`);
          await deletePosterFiles(posterData, posterId, bucket);
          deletedCount++;
        }
      } catch (error) {
        console.error(`[CLEANUP] Error processing poster ${doc.id}:`, error.message);
        errorCount++;
        // Continue with next poster even if one fails
      }
    }

    console.log(`[CLEANUP] Cleanup completed. Deleted: ${deletedCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('[CLEANUP] Fatal error during cleanup:', error);
  }
};

// Schedule automated cleanup
// Runs daily at 2:00 AM (configurable via CRON_SCHEDULE env var)
// Format: minute hour day month dayOfWeek
// Default: '0 2 * * *' = Every day at 2:00 AM
const CRON_SCHEDULE = process.env.CLEANUP_CRON_SCHEDULE || '0 2 * * *';

console.log(`[CLEANUP] Scheduling automated cleanup with cron: ${CRON_SCHEDULE}`);
cron.schedule(CRON_SCHEDULE, async () => {
  await cleanupExpiredPosters();
}, {
  scheduled: true,
  timezone: "UTC"
});

// Also run cleanup on server start (optional - can be disabled)
if (process.env.RUN_CLEANUP_ON_START !== 'false') {
  console.log('[CLEANUP] Running initial cleanup on server start...');
  // Run after a short delay to ensure server is fully initialized
  setTimeout(async () => {
    await cleanupExpiredPosters();
  }, 5000);
}

// Manual cleanup endpoint (for testing or manual triggers)
app.post('/api/admin/cleanup-posters', async (req, res) => {
  try {
    // Optional: Add admin authentication here
    console.log('[CLEANUP] Manual cleanup triggered via API');
    await cleanupExpiredPosters();
    res.json({ 
      success: true, 
      message: 'Cleanup completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[CLEANUP] Error in manual cleanup:', error);
    return res.status(500).json({ 
      error: 'Cleanup failed',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Catch-all for undefined routes (protected)
// Note: This must be the last route defined
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[CLEANUP] Automated cleanup scheduled: ${CRON_SCHEDULE}`);
});

