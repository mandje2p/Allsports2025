# Complete Subscription Workflow: Step-by-Step Guide

This document explains the entire flow from when a user navigates to the subscription page until they return from Stripe and are redirected back to the app.

---

## 📋 **OVERVIEW**

**Frontend Routes:**
- `/subscription` - Subscription selection page
- `/home` - App home page (redirect destination)

**Backend Routes:**
- `POST /api/subscriptions/create-checkout` - Creates Stripe checkout session
- `POST /api/subscriptions/sync` - Syncs subscription from Stripe
- `POST /api/subscriptions/webhook` - Receives Stripe webhook events
- `GET /api/subscriptions/status` - Gets current subscription status

---

## 🔄 **COMPLETE WORKFLOW**

### **STEP 1: User Navigates to Subscription Page**
**Location:** Frontend (`/subscription`)

**File:** `pages/Subscription.tsx`

**What happens:**
- User lands on subscription page
- Page displays available plans (FREE, BASIC, PRO, PREMIUM)
- User selects a plan (e.g., clicks "BASIC")
- `selectedPlan` state is updated

**No API calls yet** - Just UI interaction

---

### **STEP 2: User Clicks "Subscribe" Button**
**Location:** Frontend (`/subscription`)

**File:** `pages/Subscription.tsx` → `handleSubscribe()` function (line ~120)

**What happens:**

#### **2A. If FREE Plan Selected:**
- Calls `POST /api/subscriptions/set-free` (backend)
- Updates user profile with `subscription: 'FREE'`
- Updates `subscriptions` collection in Firestore
- Resets credits to 3 (if period expired)
- Navigates directly to `/home`
- **Flow ends here for FREE plan**

#### **2B. If Paid Plan Selected (BASIC/PRO/PREMIUM):**
- Maps plan ID to Stripe plan name and Price ID:
  ```javascript
  basic → { plan: 'BASIC', priceId: 'price_1SecX6...' }
  pro → { plan: 'PRO', priceId: 'price_1SecX7...' }
  premium → { plan: 'PREMIUM', priceId: 'price_1SecX8...' }
  ```
- Validates Price ID exists and starts with `price_`
- Calls `createCheckoutSession()` from `subscriptionService.ts`

---

### **STEP 3: Frontend Calls Create Checkout Service**
**Location:** Frontend Service

**File:** `services/subscriptionService.ts` → `createCheckoutSession()` (line ~70)

**What happens:**
- Gets Firebase ID token for authentication
- Makes HTTP request to backend:
  ```javascript
  POST http://localhost:3001/api/subscriptions/create-checkout
  Headers:
    Authorization: Bearer <idToken>
    Content-Type: application/json
  Body:
    {
      plan: "BASIC",
      priceId: "price_1SecX6KK6S7sJxPfCO2yg7R9"
    }
  ```
- Waits for response
- Returns `{ sessionId, url }` from backend

---

### **STEP 4: Backend Creates Stripe Checkout Session**
**Location:** Backend API

**File:** `backend/index.js` → `POST /api/subscriptions/create-checkout` (line ~1317)

**What happens:**
1. **Authentication:** Verifies Firebase ID token (via middleware)
2. **Validation:** Checks plan and priceId are provided
3. **Get/Create Stripe Customer:**
   - Checks if user has `stripeCustomerId` in Firestore `users` collection
   - If not, creates new Stripe customer
   - Saves `stripeCustomerId` to user document
4. **Create Checkout Session:**
   ```javascript
   stripe.checkout.sessions.create({
     customer: customer.id,
     payment_method_types: ['card'],
     line_items: [{ price: priceId, quantity: 1 }],
     mode: 'subscription',
     success_url: 'http://localhost:5173/subscription?success=true&session_id={CHECKOUT_SESSION_ID}',
     cancel_url: 'http://localhost:5173/subscription?canceled=true',
     metadata: { userId, plan },
     subscription_data: { metadata: { userId, plan } }
   })
   ```
5. **Response:** Returns `{ sessionId, url }` to frontend

**Key Points:**
- `success_url` includes `?success=true` query parameter
- Metadata is set on both session and subscription
- Stripe generates a unique checkout URL

---

### **STEP 5: Frontend Redirects to Stripe**
**Location:** Frontend (`/subscription`)

**File:** `pages/Subscription.tsx` → `handleSubscribe()` (line ~200)

**What happens:**
- Receives `{ sessionId, url }` from backend
- Uses `window.location.href = url` to redirect user
- **User leaves your app** and goes to Stripe's hosted checkout page

**No API calls** - Browser redirect

---

### **STEP 6: User Completes Payment on Stripe**
**Location:** Stripe Hosted Checkout (external)

**What happens:**
- User enters payment details on Stripe's page
- Stripe processes payment
- Stripe creates subscription in their system
- Stripe sends webhook events to your backend (see Step 7)
- Stripe redirects user back to your app using `success_url`

**Stripe sends webhooks:**
- `checkout.session.completed` - When checkout is completed
- `customer.subscription.created` - When subscription is created
- `invoice.paid` - When first invoice is paid (if immediate payment)

---

### **STEP 7: Stripe Webhook Events (Parallel Process)**
**Location:** Backend Webhook Handler

**File:** `backend/index.js` → `POST /api/subscriptions/webhook` (line ~1707)

**What happens:**

#### **7A. Webhook Signature Verification:**
- Stripe sends POST request with `stripe-signature` header
- Backend verifies signature using `STRIPE_WEBHOOK_SECRET`
- If invalid, returns 400 error

#### **7B. Event Processing:**
- Parses event type from Stripe
- Handles different event types:

**Event: `checkout.session.completed`**
- Extracts `userId` and `plan` from session metadata
- Retrieves subscription from Stripe using `session.subscription`
- Resolves plan from Price ID (with metadata fallback)
- Updates Firestore:
  - `subscriptions` collection: saves subscription details
  - `users` collection: updates `subscription` field
- **Resets credits** using `resetCreditsForUser()`:
  - BASIC → `remainingCredits: -1` (unlimited)
  - PRO → `remainingCredits: 100`
  - PREMIUM → `remainingCredits: 200`

**Event: `invoice.paid`**
- Only processes if `billing_reason === 'subscription_cycle'`
- Prevents double-reset using `lastInvoiceId` check
- Resets credits for monthly cycle

**Event: `customer.subscription.updated`**
- Updates subscription status and plan in Firestore

**Event: `customer.subscription.deleted`**
- Sets plan to FREE
- Resets credits to 0

#### **7C. Response:**
- Returns `{ received: true }` to Stripe
- Stripe marks webhook as successfully processed

**Note:** Webhook may arrive before or after user returns to your app (race condition)

---

### **STEP 8: User Redirected Back to Your App**
**Location:** Frontend (`/subscription?success=true`)

**File:** `pages/Subscription.tsx` → `useEffect` hook (line ~21)

**What happens:**
1. **URL Detection:**
   - `useSearchParams()` detects `?success=true` in URL
   - Triggers sync process

2. **Sync Subscription:**
   - Calls `syncSubscription()` from `subscriptionService.ts`
   - This calls `POST /api/subscriptions/sync` (backend)

---

### **STEP 9: Frontend Calls Sync Endpoint**
**Location:** Frontend Service

**File:** `services/subscriptionService.ts` → `syncSubscription()` (line ~142)

**What happens:**
- Gets Firebase ID token
- Makes HTTP request:
  ```javascript
  POST http://localhost:3001/api/subscriptions/sync
  Headers:
    Authorization: Bearer <idToken>
    Content-Type: application/json
  ```
- Waits for response
- Returns `{ success: true, plan: "BASIC", message: "..." }`

---

### **STEP 10: Backend Syncs Subscription from Stripe**
**Location:** Backend API

**File:** `backend/index.js` → `POST /api/subscriptions/sync` (line ~1534)

**What happens:**
1. **Get Stripe Customer ID:**
   - Reads `stripeCustomerId` from Firestore `users` collection

2. **Fetch Active Subscriptions:**
   - Calls Stripe API:
     ```javascript
     stripe.subscriptions.list({
       customer: customerId,
       status: 'active',  // Also checks 'trialing'
       limit: 1
     })
     ```
   - Gets most recent subscription

3. **Resolve Plan:**
   - Extracts Price ID from subscription
   - Maps to plan using `getPlanFromPriceId()`
   - Falls back to subscription metadata if needed

4. **Update Firestore:**
   - Updates `subscriptions` collection with:
     - `stripeSubscriptionId`
     - `plan` (BASIC/PRO/PREMIUM)
     - `status` (active/trialing)
     - `currentPeriodStart` / `currentPeriodEnd`
   - Updates `users` collection:
     - `subscription: "BASIC"`

5. **Reset Credits:**
   - Calls `resetCreditsForUser()`:
     - BASIC → `remainingCredits: -1` (unlimited)
     - PRO → `remainingCredits: 100`
     - PREMIUM → `remainingCredits: 200`

6. **Response:**
   - Returns `{ success: true, plan: "BASIC", message: "..." }`

**Why this step exists:**
- Webhook might be delayed
- Ensures immediate update after checkout
- Handles race conditions

---

### **STEP 11: Frontend Redirects to Home**
**Location:** Frontend (`/subscription`)

**File:** `pages/Subscription.tsx` → `useEffect` hook (line ~36)

**What happens:**
- After successful sync (or even if sync fails)
- Waits 1 second
- Navigates to `/home`:
  ```javascript
  navigate('/home')
  ```

**Flow complete!** User is now in the app with updated subscription.

---

## 🔍 **AUTO-SYNC FALLBACK (Background Process)**

**Location:** Backend (whenever subscription status is checked)

**File:** `backend/index.js` → `getUserSubscriptionData()` (line ~283)

**What happens:**
- When any endpoint calls `getUserSubscriptionData()`:
  - Checks if user has `stripeCustomerId` but plan is still FREE
  - Queries Stripe for active subscriptions
  - If found, auto-updates Firestore
  - Resets credits appropriately

**This ensures:**
- Even if webhook and sync fail, subscription is eventually updated
- Works when user checks subscription status later

---

## 📊 **DATA FLOW SUMMARY**

```
User Action → Frontend → Backend → Stripe → Webhook → Firestore
     ↓           ↓          ↓         ↓         ↓          ↓
  Select Plan  API Call  Create    Payment  Event    Update DB
     ↓           ↓          ↓         ↓         ↓          ↓
  Subscribe  Redirect  Session    Process  Process   Reset Credits
     ↓           ↓          ↓         ↓         ↓          ↓
  Redirect    Stripe    Return    Redirect  Update   User Updated
     ↓           ↓          ↓         ↓         ↓          ↓
  Return      Checkout  Session    Success  Firestore  Credits Set
     ↓           ↓          ↓         ↓         ↓          ↓
  Sync        Payment    URL        App      Sync      Ready!
     ↓           ↓          ↓         ↓         ↓          ↓
  Home        Complete   Redirect   Sync    Complete   ✅
```

---

## 🐛 **COMMON ISSUES & SOLUTIONS**

### **Issue 1: Credits not updating after purchase**
**Cause:** Webhook not configured or sync not called
**Solution:** 
- Check webhook endpoint is accessible
- Verify `STRIPE_WEBHOOK_SECRET` is set
- Ensure sync endpoint is called after redirect

### **Issue 2: Plan shows FREE after purchase**
**Cause:** Webhook delayed or metadata missing
**Solution:**
- Auto-sync should handle this
- Check `getUserSubscriptionData()` logs
- Verify metadata is set in checkout session

### **Issue 3: BASIC plan doesn't get unlimited credits**
**Cause:** `resetCreditsForUser()` not setting `-1`
**Solution:**
- Check `PLAN_CREDITS['BASIC'] === -1`
- Verify `resetCreditsForUser()` handles `-1` correctly

---

## ✅ **CHECKLIST FOR DEBUGGING**

When debugging subscription flow, check:

- [ ] User has `stripeCustomerId` in Firestore
- [ ] Checkout session includes metadata (`userId`, `plan`)
- [ ] Webhook endpoint is accessible and verified
- [ ] `STRIPE_WEBHOOK_SECRET` is set correctly
- [ ] Sync endpoint is called after redirect
- [ ] `getUserSubscriptionData()` auto-sync is working
- [ ] Credits are reset with correct values:
  - BASIC → `-1` (unlimited)
  - PRO → `100`
  - PREMIUM → `200`
- [ ] Firestore `subscriptions` collection is updated
- [ ] Firestore `users` collection `subscription` field is updated

---

## 📝 **KEY FILES REFERENCE**

| File | Purpose |
|------|---------|
| `pages/Subscription.tsx` | Frontend subscription page |
| `services/subscriptionService.ts` | Frontend API service |
| `backend/index.js` | All backend endpoints |
| `backend/index.js:1317` | Create checkout endpoint |
| `backend/index.js:1534` | Sync subscription endpoint |
| `backend/index.js:1707` | Webhook handler |
| `backend/index.js:283` | Get subscription data (auto-sync) |

---

**End of Workflow Documentation**


