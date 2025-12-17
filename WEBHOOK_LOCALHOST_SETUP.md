# Setting Up Stripe Webhooks for Localhost Testing

This guide shows you how to configure Stripe webhooks when testing on localhost.

## 🎯 Two Options for Localhost Testing

### Option 1: Stripe CLI (Recommended - Easiest) ⭐
**Best for:** Quick local development and testing

### Option 2: ngrok (Alternative)
**Best for:** Testing with real webhook events from Stripe Dashboard

---

## ✅ Option 1: Stripe CLI (Recommended)

### Why Stripe CLI?
- ✅ No need to configure webhook in Stripe Dashboard for local testing
- ✅ Automatically forwards webhooks to your local server
- ✅ Gives you a webhook secret automatically
- ✅ Can trigger test events easily

### Step-by-Step Setup:

#### 1. Install Stripe CLI
- **Windows**: Download from https://github.com/stripe/stripe-cli/releases
- **Mac**: `brew install stripe/stripe-cli/stripe`
- **Linux**: See https://stripe.com/docs/stripe-cli

#### 2. Login to Stripe
```bash
stripe login
```
This will open your browser to authenticate.

#### 3. Forward Webhooks to Your Local Server
```bash
stripe listen --forward-to localhost:3001/api/subscriptions/webhook
```

**Output you'll see:**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

#### 4. Copy the Webhook Secret
Copy the `whsec_...` secret and add it to your backend `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

#### 5. Keep Both Terminals Running
- **Terminal 1**: Your backend server (`npm start` or `npm run dev`)
- **Terminal 2**: Stripe CLI (`stripe listen --forward-to localhost:3001/api/subscriptions/webhook`)

#### 6. Test Webhook Events
In a new terminal, trigger test events:
```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test invoice payment (most important!)
stripe trigger invoice.paid

# Test payment failure
stripe trigger invoice.payment_failed
```

### ✅ With Stripe CLI, You DON'T Need to Configure Dashboard Webhook
The CLI automatically forwards events, so you can skip the Dashboard webhook setup for local testing.

---

## 🌐 Option 2: ngrok (For Real Dashboard Webhooks)

### Why ngrok?
- ✅ Test with actual Stripe Dashboard webhook configuration
- ✅ See real webhook events from Stripe
- ✅ Test the exact production setup

### Step-by-Step Setup:

#### 1. Install ngrok
- Download from https://ngrok.com/download
- Or: `brew install ngrok` (Mac) / `choco install ngrok` (Windows)

#### 2. Start Your Backend Server
```bash
cd backend
npm start
# Server should be running on http://localhost:3001
```

#### 3. Create ngrok Tunnel
```bash
ngrok http 3001
```

**Output you'll see:**
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3001
```

#### 4. Copy the HTTPS URL
Copy the `https://abc123.ngrok.io` URL (yours will be different).

#### 5. Configure Stripe Dashboard Webhook

Go to: https://dashboard.stripe.com/webhooks

**Fill in the form:**

**Endpoint URL:**
```
https://abc123.ngrok.io/api/subscriptions/webhook
```
*(Replace `abc123.ngrok.io` with your actual ngrok URL)*

**Description:**
```
Localhost Testing - AllSports Subscription Webhooks
```

**Events to send:**
- ✅ `checkout.session.completed`
- ✅ `invoice.paid`
- ✅ `invoice.payment_failed`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`

**API version:**
```
2020-08-27
```
*(Or leave default - your code should work with any recent version)*

**Payload style:**
```
Snapshot
```
*(This is the default and correct option)*

#### 6. Copy Webhook Signing Secret

After creating the webhook:
1. Click on the webhook endpoint you just created
2. Under **Signing secret**, click **Reveal** or **Click to reveal**
3. Copy the secret (starts with `whsec_`)
4. Add to your backend `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

#### 7. Test It

1. Make sure ngrok is running (showing your URL)
2. Make sure your backend is running on port 3001
3. Go to your app and complete a test checkout
4. Check your backend logs - you should see webhook events!

---

## 📋 Complete Configuration Example (ngrok)

### Stripe Dashboard Webhook Form:

```
Events from: Your account
Payload style: Snapshot
API version: 2020-08-27
Listening to: 5 events

Destination name: allsports-localhost-test
Endpoint URL: https://abc123.ngrok.io/api/subscriptions/webhook
Description: Localhost Testing - AllSports Subscription Webhooks
```

### Backend .env:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
```

---

## 🎯 Which Option Should You Use?

### Use **Stripe CLI** if:
- ✅ You're just testing locally
- ✅ You want the easiest setup
- ✅ You don't need to test Dashboard webhook configuration
- ✅ You want to trigger test events easily

### Use **ngrok** if:
- ✅ You want to test the exact production setup
- ✅ You want to see real webhook events from Stripe Dashboard
- ✅ You're testing webhook configuration before production
- ✅ You want to test with actual Stripe Dashboard webhook settings

---

## 🧪 Testing Checklist

### With Stripe CLI:
- [ ] Stripe CLI installed and logged in
- [ ] `stripe listen` command running
- [ ] Webhook secret copied to `.env`
- [ ] Backend server running
- [ ] Test event triggered successfully
- [ ] Backend logs show webhook received

### With ngrok:
- [ ] ngrok installed
- [ ] Backend server running on port 3001
- [ ] ngrok tunnel active (showing HTTPS URL)
- [ ] Webhook configured in Stripe Dashboard
- [ ] Webhook secret copied to `.env`
- [ ] Test checkout completed
- [ ] Backend logs show webhook received

---

## 🚨 Common Issues

### "Webhook signature verification failed"
- ✅ Check `STRIPE_WEBHOOK_SECRET` is correct in `.env`
- ✅ Make sure you're using the secret from the same webhook endpoint
- ✅ Restart your backend after changing `.env`

### "Connection refused" or "Cannot reach endpoint"
- ✅ Make sure your backend is running on port 3001
- ✅ Check ngrok is running and showing the correct URL
- ✅ Verify the endpoint URL in Stripe Dashboard matches ngrok URL

### "No events received"
- ✅ Check webhook events are selected in Dashboard
- ✅ Verify endpoint URL is correct
- ✅ Check backend logs for errors
- ✅ Test with `stripe trigger` command (if using CLI)

---

## 📝 Quick Reference

### Stripe CLI Command:
```bash
stripe listen --forward-to localhost:3001/api/subscriptions/webhook
```

### ngrok Command:
```bash
ngrok http 3001
```

### Test Event (Stripe CLI):
```bash
stripe trigger invoice.paid
```

### Webhook Endpoint Path:
```
/api/subscriptions/webhook
```

### Full URL (ngrok):
```
https://your-ngrok-url.ngrok.io/api/subscriptions/webhook
```

---

## 🎓 Next Steps

1. **Choose your method** (CLI or ngrok)
2. **Set up the webhook** following the steps above
3. **Test with a checkout** - complete a test subscription
4. **Check backend logs** - verify webhook events are received
5. **Verify credits reset** - check that `invoice.paid` resets credits

---

**For Production:** Use a real HTTPS URL (not localhost/ngrok) and configure the webhook in Stripe Dashboard with your production backend URL.






