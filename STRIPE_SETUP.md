# Stripe Subscription Integration Setup Guide

This guide will help you set up Stripe subscriptions for the AllSports app with the credit-based system.

> 📋 **For a complete list of all required Stripe keys, IDs, and tokens, see [STRIPE_CREDENTIALS.md](./STRIPE_CREDENTIALS.md)**

## 📋 Overview

The subscription system implements:
- **Free Plan**: €0 - 0 credits
- **Basic Plan**: €70/month - 50 credits/month
- **Pro Plan**: €60/month (1-year commitment) - 100 credits/month
- **Premium Plan**: €598/year - 200 credits/month (monthly reset)

Credits reset **ONLY** when Stripe invoice is paid (`invoice.paid` webhook with `billing_reason === 'subscription_cycle'`).

## 🔑 Required Environment Variables

### Backend (.env file in project root)

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key (test or live)
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook signing secret from Stripe Dashboard

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173  # Your frontend URL
```

### Frontend (.env file in project root)

```env
# Stripe Publishable Key (optional, if you need it for future features)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Price IDs (from your Stripe Dashboard)
VITE_STRIPE_PRICE_BASIC=price_xxxxx  # Basic plan monthly price ID
VITE_STRIPE_PRICE_PRO=price_xxxxx    # Pro plan monthly price ID
VITE_STRIPE_PRICE_PREMIUM=price_xxxxx # Premium plan annual price ID

# Backend API URL
VITE_API_BASE_URL=http://localhost:3001
```

## 🛠️ Stripe Dashboard Setup

### Step 1: Create Products and Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Products**
2. Create products for each plan:

#### Basic Plan (Monthly)
- **Name**: Basic Plan
- **Price**: €70.00
- **Billing period**: Monthly
- **Recurring**: Yes
- **Metadata**: Add `plan: BASIC`

#### Pro Plan (Monthly)
- **Name**: Pro Plan
- **Price**: €60.00
- **Billing period**: Monthly
- **Recurring**: Yes
- **Metadata**: Add `plan: PRO`

#### Premium Plan (Annual)
- **Name**: Premium Plan
- **Price**: €598.00
- **Billing period**: Yearly
- **Recurring**: Yes
- **Metadata**: Add `plan: PREMIUM`

3. **Copy the Price IDs** (they start with `price_`) and add them to your frontend `.env` file.

### Step 2: Configure Webhook Endpoint

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL**: `https://your-backend-url.com/api/subscriptions/webhook`
   - For local testing, use [Stripe CLI](https://stripe.com/docs/stripe-cli) or [ngrok](https://ngrok.com)
3. **Events to listen for** (select these 5 events):
   - `checkout.session.completed` ⭐ **CRITICAL** - Creates subscription
   - `invoice.paid` ⭐ **MOST CRITICAL** - This is where credits reset!
   - `invoice.payment_failed` ⭐ **IMPORTANT** - Handles failed payments
   - `customer.subscription.updated` - Keeps subscription in sync
   - `customer.subscription.deleted` - Handles cancellations
   
   > 📋 **For detailed explanation of each event, see [WEBHOOK_EVENTS.md](./WEBHOOK_EVENTS.md)**

4. **Copy the Webhook Signing Secret** (starts with `whsec_`) and add it to your backend `.env` file.

### Step 3: Update Backend Price Mapping

In `backend/index.js`, update the `getPlanFromPriceId` function with your actual price IDs:

```javascript
const getPlanFromPriceId = (priceId) => {
  const priceToPlan = {
    'price_basic_monthly': 'BASIC',      // Replace with your actual price ID
    'price_pro_monthly': 'PRO',          // Replace with your actual price ID
    'price_premium_annual': 'PREMIUM'    // Replace with your actual price ID
  };
  return priceToPlan[priceId] || 'FREE';
};
```

Alternatively, you can use Stripe Price metadata to store the plan name, which is more flexible.

## 🧪 Testing with Stripe CLI

For local development, use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/subscriptions/webhook

# This will give you a webhook signing secret (whsec_...)
# Add it to your .env file as STRIPE_WEBHOOK_SECRET
```

## 🔄 How Credit Reset Works

### The Golden Rule
**Credits reset ONLY when `invoice.paid` webhook is received with `billing_reason === 'subscription_cycle'`**

### Flow:
1. User subscribes → `checkout.session.completed` → Subscription created in Firestore
2. Monthly billing cycle → Stripe sends `invoice.paid` with `billing_reason: 'subscription_cycle'`
3. Backend checks:
   - ✅ Invoice is for subscription cycle (not upgrade/proration)
   - ✅ Invoice hasn't been processed before (double-reset protection)
   - ✅ User has active subscription
4. Credits reset to plan limit:
   - Basic: 50 credits
   - Pro: 100 credits
   - Premium: 200 credits (monthly reset even though it's annual)

### Premium Plan Special Handling
Premium is annual but credits reset monthly. The system:
- Checks if 30 days have passed since last reset
- Resets credits monthly based on time, not just invoice events

## 🗄️ Firestore Collections

### `subscriptions/{userId}`
```javascript
{
  userId: string,
  stripeSubscriptionId: string,
  plan: 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM',
  status: 'active' | 'past_due' | 'canceled' | 'unpaid',
  currentPeriodStart: Timestamp,
  currentPeriodEnd: Timestamp,
  lastInvoiceId: string,  // Prevents double reset
  updatedAt: Timestamp
}
```

### `credit_balance/{userId}`
```javascript
{
  monthlyCredits: number,      // Plan limit (50/100/200)
  usedCredits: number,         // Credits used this period
  remainingCredits: number,     // Available credits
  periodStart: Timestamp,       // Current period start
  periodEnd: Timestamp,         // Current period end
  updatedAt: Timestamp
}
```

## 🔒 Security Notes

1. **Webhook Verification**: Always verify webhook signatures using `STRIPE_WEBHOOK_SECRET`
2. **Double Reset Protection**: Uses `lastInvoiceId` to prevent processing the same invoice twice
3. **Credit Deduction**: Uses Firestore transactions for atomic operations
4. **Subscription Status Check**: Generation is blocked if status is not `active`

## 🚨 Important Notes

1. **No Credit Accumulation**: Credits don't carry over. Unused credits are lost at period end.
2. **Payment Required**: No payment = no credits. Status must be `active` to generate.
3. **Premium Monthly Reset**: Even though Premium is annual, credits reset monthly (30-day intervals).
4. **Pro Commitment**: The 1-year commitment is currently handled in the UI/customer portal. You may want to add server-side enforcement.

## 📝 Next Steps

1. ✅ Set up Stripe products and prices
2. ✅ Configure webhook endpoint
3. ✅ Add environment variables
4. ✅ Update price IDs in backend
5. ✅ Test with Stripe test cards
6. ✅ Verify credit reset on invoice payment
7. ✅ Test subscription cancellation
8. ✅ Test Premium → Pro downgrade (when implemented)

## 🧪 Test Cards

Use Stripe test cards for testing:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Expiry: Any future date  
CVC: Any 3 digits  
ZIP: Any 5 digits

## 📞 Support

For Stripe-specific issues, check:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)


