# Fix: "No such price: 'price_basic_monthly'" Error

## 🔴 The Problem

You're getting this error because the code is using placeholder price IDs instead of real Stripe Price IDs.

## ✅ The Solution

You need to:
1. **Create products in Stripe Dashboard** (if you haven't already)
2. **Copy the real Price IDs** from Stripe
3. **Add them to your `.env` file**
4. **Restart your frontend server**

---

## 🚀 Step-by-Step Fix

### Step 1: Create Products in Stripe Dashboard

1. Go to https://dashboard.stripe.com → **Products**
2. Click **Add product**

#### Create Basic Plan:
- **Name**: `Basic Plan`
- Click **Add price**:
  - **Price**: `70.00`
  - **Currency**: `EUR (€)`
  - **Billing period**: `Monthly`
  - **Recurring**: ✅ Yes
- Click **Save product**
- **Copy the Price ID** (you'll see it like `price_1AbCdEf...`)

#### Create Pro Plan:
- **Name**: `Pro Plan`
- Click **Add price**:
  - **Price**: `60.00`
  - **Currency**: `EUR (€)`
  - **Billing period**: `Monthly`
  - **Recurring**: ✅ Yes
- Click **Save product**
- **Copy the Price ID**

#### Create Premium Plan:
- **Name**: `Premium Plan`
- Click **Add price**:
  - **Price**: `598.00`
  - **Currency**: `EUR (€)`
  - **Billing period**: `Yearly`
  - **Recurring**: ✅ Yes
- Click **Save product**
- **Copy the Price ID**

### Step 2: Add Price IDs to Your .env File

Create or edit `.env` file in your **project root** (same level as `package.json`):

```env
# Stripe Price IDs (from Stripe Dashboard)
VITE_STRIPE_PRICE_BASIC=price_1AbCdEfGhIjKlMnOpQrStUv
VITE_STRIPE_PRICE_PRO=price_1XyZaBcDeFgHiJkLmNoPqRs
VITE_STRIPE_PRICE_PREMIUM=price_1MnOpQrStUvWxYzAbCdEfGh
```

**Important:**
- Replace the example IDs with your **actual** Price IDs from Stripe
- Make sure they start with `price_`
- No quotes, no spaces

### Step 3: Restart Your Frontend Server

**CRITICAL:** Environment variables are only loaded when the server starts!

1. **Stop** your frontend server (Ctrl+C)
2. **Start** it again:
   ```bash
   npm run dev
   ```

### Step 4: Test Again

1. Go to `http://localhost:5173/#/subscription`
2. Select a plan
3. Click "Souscrire"
4. Should now redirect to Stripe Checkout! ✅

---

## 🔍 How to Find Your Price IDs

### In Stripe Dashboard:

1. Go to **Products** → Click on your product (e.g., "Basic Plan")
2. You'll see:
   ```
   Product: Basic Plan
   Price: €70.00 / month
   Price ID: price_1AbCdEfGhIjKlMnOpQrStUv  ← Copy this!
   ```
3. Click the Price ID to copy it

### Or via Stripe API:

```bash
# List all prices
stripe prices list
```

---

## ✅ Verification Checklist

- [ ] Created 3 products in Stripe Dashboard (Basic, Pro, Premium)
- [ ] Copied the Price ID for each product
- [ ] Added all 3 Price IDs to `.env` file in project root
- [ ] Price IDs start with `price_`
- [ ] No quotes or spaces in `.env` file
- [ ] Restarted frontend server after adding env vars
- [ ] Tested subscription page again

---

## 🐛 Still Getting Error?

### Check 1: Environment Variable Format
```env
# ✅ Correct
VITE_STRIPE_PRICE_BASIC=price_1AbCdEfGhIjKlMnOpQrStUv

# ❌ Wrong
VITE_STRIPE_PRICE_BASIC="price_1AbCdEfGhIjKlMnOpQrStUv"  # No quotes
VITE_STRIPE_PRICE_BASIC = price_1AbCdEfGhIjKlMnOpQrStUv  # No spaces
VITE_STRIPE_PRICE_BASIC=price_basic_monthly  # This is placeholder, not real
```

### Check 2: File Location
Make sure `.env` is in the **project root** (same folder as `package.json`), not in `backend/` or `frontend/`.

### Check 3: Server Restart
**You MUST restart the frontend server** after changing `.env` file. Vite only reads env vars on startup.

### Check 4: Browser Console
Open browser console and check:
```javascript
console.log(import.meta.env.VITE_STRIPE_PRICE_BASIC)
```
Should show your actual price ID, not `undefined` or `price_basic_monthly`.

---

## 📝 Example .env File

Your `.env` file in project root should look like:

```env
# Stripe Price IDs
VITE_STRIPE_PRICE_BASIC=price_1QwErTyUiOpAsDfGhJkLzXcVbNm
VITE_STRIPE_PRICE_PRO=price_1MnBvCxZaSdFgHjKlQwErTyUiOp
VITE_STRIPE_PRICE_PREMIUM=price_1AsDfGhJkLzXcVbNmQwErTyUi

# Backend API URL
VITE_API_BASE_URL=http://localhost:3001
```

---

## 🎯 Quick Fix Summary

1. **Create products** in Stripe Dashboard → Get Price IDs
2. **Add to `.env`** file in project root
3. **Restart frontend** server
4. **Test again**

That's it! The error should be gone. 🎉




