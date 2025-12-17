# Testing Your Subscription Page - Quick Guide

## 🎯 How to Access the Subscription Page

### URL:
```
http://localhost:5173/#/subscription
```

*(Replace `localhost:5173` with your frontend URL if different)*

---

## 🚀 Step-by-Step Testing

### 1. Start Your Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# Should be running on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Should be running on http://localhost:5173
```

**Terminal 3 - Stripe CLI (for webhook testing):**
```bash
stripe listen --forward-to localhost:3001/api/subscriptions/webhook
```

### 2. Access the Subscription Page

**Option A: Direct URL**
- Open your browser
- Go to: `http://localhost:5173/#/subscription`

**Option B: After Login**
1. Go to `http://localhost:5173/#/login`
2. Sign in (or sign up if you don't have an account)
3. Manually navigate to: `http://localhost:5173/#/subscription`

**Option C: Add Navigation Link (Optional)**
You can add a link to the subscription page from your Profile or Home page.

### 3. Test the Subscription Flow

1. **Select a Plan**
   - Click on Basic, Pro, or Premium plan
   - The selected plan will be highlighted

2. **Click "Souscrire" (Subscribe)**
   - You should be redirected to Stripe Checkout

3. **Complete Test Payment**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

4. **Verify Success**
   - After payment, you'll be redirected back to your app
   - Check backend logs for webhook events
   - Check your Profile page to see updated credits

---

## 🔍 What to Check

### ✅ Frontend Checks:
- [ ] Subscription page loads correctly
- [ ] All 4 plans are visible (Free, Basic, Pro, Premium)
- [ ] Plan selection works (clicking changes selection)
- [ ] "Souscrire" button is clickable
- [ ] Redirects to Stripe Checkout
- [ ] Returns to app after payment

### ✅ Backend Checks:
- [ ] Backend server is running
- [ ] No errors in backend logs
- [ ] Checkout session is created successfully
- [ ] Webhook events are received

### ✅ Stripe Checks:
- [ ] Test payment completes
- [ ] Subscription is created in Stripe Dashboard
- [ ] Webhook events are sent (check Stripe CLI output)

---

## 🧪 Testing Checklist

### Before Testing:
- [ ] Backend `.env` has `STRIPE_SECRET_KEY`
- [ ] Backend `.env` has `STRIPE_WEBHOOK_SECRET`
- [ ] Frontend `.env` has all 3 price IDs (`VITE_STRIPE_PRICE_*`)
- [ ] Backend `getPlanFromPriceId()` function is updated with your price IDs
- [ ] All servers are running

### During Testing:
- [ ] Can access `/subscription` page
- [ ] Can select different plans
- [ ] Clicking "Souscrire" redirects to Stripe
- [ ] Test payment works
- [ ] Returns to app after payment
- [ ] Webhook events are received
- [ ] Credits are reset/allocated

---

## 🐛 Troubleshooting

### "Cannot access /subscription"
- ✅ Make sure you're logged in (it's a protected route)
- ✅ Check the URL: `http://localhost:5173/#/subscription`
- ✅ Make sure frontend is running

### "Invalid price ID" Error
- ✅ Check your `.env` file has the correct price IDs
- ✅ Verify price IDs start with `price_`
- ✅ Make sure you created products in Stripe Dashboard
- ✅ Check backend `getPlanFromPriceId()` function

### "Failed to create checkout session"
- ✅ Check backend is running
- ✅ Check `STRIPE_SECRET_KEY` is in backend `.env`
- ✅ Check backend logs for errors
- ✅ Verify you're logged in (need auth token)

### "Webhook not received"
- ✅ Check Stripe CLI is running
- ✅ Check webhook secret is correct
- ✅ Check backend logs for webhook errors
- ✅ Verify webhook endpoint URL is correct

---

## 📝 Quick Test Commands

### Test Webhook Manually:
```bash
# In Stripe CLI terminal
stripe trigger checkout.session.completed
stripe trigger invoice.paid
```

### Check Backend Logs:
Look for messages like:
```
[STRIPE] Checkout session created for user abc123, plan BASIC: sess_...
[WEBHOOK] Received event: invoice.paid (evt_...)
[WEBHOOK] ✓ Credits reset for user abc123 (plan: BASIC, invoice: in_...)
```

---

## 🎯 Expected Flow

1. **User visits** `/subscription` page
2. **User selects** a plan (Basic, Pro, or Premium)
3. **User clicks** "Souscrire"
4. **Frontend calls** `/api/subscriptions/create-checkout`
5. **Backend creates** Stripe Checkout Session
6. **User redirected** to Stripe Checkout
7. **User completes** payment with test card
8. **Stripe redirects** back to app (`/subscription?success=true`)
9. **Webhook fires** `checkout.session.completed`
10. **Webhook fires** `invoice.paid` (credits reset)
11. **User sees** updated subscription in Profile

---

## 🔗 Quick Links

- **Subscription Page**: `http://localhost:5173/#/subscription`
- **Profile Page**: `http://localhost:5173/#/profile` (to see credits)
- **Stripe Dashboard**: https://dashboard.stripe.com/test/subscriptions
- **Stripe Test Cards**: https://stripe.com/docs/testing#cards

---

## 💡 Pro Tips

1. **Keep Stripe CLI running** while testing to see webhook events in real-time
2. **Check browser console** for frontend errors
3. **Check backend terminal** for server logs
4. **Use Stripe Dashboard** to verify subscriptions are created
5. **Test all 3 plans** (Basic, Pro, Premium) to ensure all price IDs work

---

**Ready to test?** Start your servers and navigate to `http://localhost:5173/#/subscription`!






