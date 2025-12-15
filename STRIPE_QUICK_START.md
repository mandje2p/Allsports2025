# Stripe Setup - Quick Start Guide

This is a quick reference for setting up Stripe. For detailed instructions, see [STRIPE_CREDENTIALS.md](./STRIPE_CREDENTIALS.md).

## 🚀 Quick Setup (5 Steps)

### Step 1: Get Stripe Secret Key
1. Go to https://dashboard.stripe.com → **Developers** → **API keys**
2. Copy **Secret key** (starts with `sk_test_` or `sk_live_`)
3. Add to backend `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   ```

### Step 2: Create Products & Get Price IDs
1. Go to **Products** → **Add product**
2. Create 3 products:
   - **Basic**: €70/month → Copy Price ID
   - **Pro**: €60/month → Copy Price ID  
   - **Premium**: €598/year → Copy Price ID
3. Add to frontend `.env`:
   ```env
   VITE_STRIPE_PRICE_BASIC=price_...
   VITE_STRIPE_PRICE_PRO=price_...
   VITE_STRIPE_PRICE_PREMIUM=price_...
   ```

### Step 3: Set Up Webhook
1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://your-backend.com/api/subscriptions/webhook`
3. Select events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.*`
4. Copy **Signing secret** (starts with `whsec_`)
5. Add to backend `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Step 4: Update Backend Code
In `backend/index.js`, find `getPlanFromPriceId()` and add your price IDs:
```javascript
const getPlanFromPriceId = (priceId) => {
  const priceToPlan = {
    'price_YOUR_BASIC_ID': 'BASIC',
    'price_YOUR_PRO_ID': 'PRO',
    'price_YOUR_PREMIUM_ID': 'PREMIUM'
  };
  return priceToPlan[priceId] || 'FREE';
};
```

### Step 5: Test
1. Start backend: `cd backend && npm start`
2. Start frontend: `npm run dev`
3. Go to subscription page
4. Select a plan → Should redirect to Stripe Checkout
5. Use test card: `4242 4242 4242 4242`

## 📋 All Required Credentials

| Credential | Where to Find | Example Format |
|------------|---------------|----------------|
| **STRIPE_SECRET_KEY** | Dashboard → Developers → API keys | `sk_test_51...` |
| **STRIPE_WEBHOOK_SECRET** | Dashboard → Developers → Webhooks | `whsec_...` |
| **VITE_STRIPE_PRICE_BASIC** | Dashboard → Products → Basic → Price ID | `price_1...` |
| **VITE_STRIPE_PRICE_PRO** | Dashboard → Products → Pro → Price ID | `price_1...` |
| **VITE_STRIPE_PRICE_PREMIUM** | Dashboard → Products → Premium → Price ID | `price_1...` |

## 🔧 Local Development (Webhook Testing)

For local testing, you have two options:

### Option 1: Stripe CLI (Easiest) ⭐
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/subscriptions/webhook

# This outputs a webhook secret - use it in your .env
```

### Option 2: ngrok (For Dashboard Testing)
```bash
# Install ngrok from https://ngrok.com
ngrok http 3001

# Use the HTTPS URL in Stripe Dashboard webhook configuration
# Example: https://abc123.ngrok.io/api/subscriptions/webhook
```

> 📋 **For detailed localhost setup instructions, see [WEBHOOK_LOCALHOST_SETUP.md](./WEBHOOK_LOCALHOST_SETUP.md)**

## ✅ Checklist

- [ ] Stripe account created
- [ ] Secret key copied to backend `.env`
- [ ] 3 products created (Basic, Pro, Premium)
- [ ] 3 price IDs copied to frontend `.env`
- [ ] Webhook endpoint configured
- [ ] Webhook secret copied to backend `.env`
- [ ] Backend `getPlanFromPriceId()` updated
- [ ] Tested checkout flow

## 📚 Full Documentation

- **Complete credentials guide**: [STRIPE_CREDENTIALS.md](./STRIPE_CREDENTIALS.md)
- **Full setup guide**: [STRIPE_SETUP.md](./STRIPE_SETUP.md)

