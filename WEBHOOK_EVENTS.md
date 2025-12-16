# Stripe Webhook Events - Complete List

This document lists **exactly** which webhook events you need to select in Stripe Dashboard.

## ✅ Required Webhook Events

Select these **5 events** in your Stripe webhook endpoint configuration:

### 1. `checkout.session.completed` ⭐ **CRITICAL**
**What it does:**
- Triggered when a user completes checkout
- Creates subscription record in Firestore
- Initializes credits for new subscription

**Why it's needed:**
- Sets up the subscription when user first subscribes
- Links Stripe subscription to your user account
- Gives initial credits to the user

---

### 2. `invoice.paid` ⭐ **MOST CRITICAL**
**What it does:**
- **This is where credits reset!** (The golden rule)
- Resets user credits when monthly invoice is paid
- Only processes `billing_reason === 'subscription_cycle'` (not upgrades/prorations)
- Includes double-reset protection

**Why it's needed:**
- **This is the ONLY event that resets credits**
- Handles monthly credit resets for Basic and Pro plans
- Handles monthly credit resets for Premium (annual plan with monthly resets)
- Updates subscription status to `active`

**⚠️ This is the most important event - credits won't reset without it!**

---

### 3. `invoice.payment_failed` ⭐ **IMPORTANT**
**What it does:**
- Triggered when payment fails
- Sets subscription status to `past_due`
- **Does NOT reset credits** (no payment = no credits)

**Why it's needed:**
- Blocks generation when payment fails
- Prevents users from generating when subscription is unpaid
- Updates subscription status correctly

---

### 4. `customer.subscription.updated`
**What it does:**
- Triggered when subscription changes (plan upgrade/downgrade, status change)
- Updates subscription plan and status in Firestore
- Updates billing period dates

**Why it's needed:**
- Keeps subscription data in sync with Stripe
- Handles plan changes (e.g., upgrade from Basic to Pro)
- Updates subscription status if changed externally

---

### 5. `customer.subscription.deleted`
**What it does:**
- Triggered when subscription is canceled
- Sets subscription to `FREE` plan
- Resets credits to 0
- Handles Premium → Pro downgrade logic (future feature)

**Why it's needed:**
- Properly handles subscription cancellations
- Prevents users from generating after cancellation
- Cleans up subscription data

---

## 📋 Quick Selection Guide

### In Stripe Dashboard:
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint** (or edit existing)
3. Under **Events to send**, select:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.paid` ⭐
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`

### Or use "Select events" and search for:
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

## 🎯 Event Priority

| Event | Priority | What Happens Without It |
|-------|----------|-------------------------|
| `invoice.paid` | 🔴 **CRITICAL** | Credits will NEVER reset |
| `checkout.session.completed` | 🔴 **CRITICAL** | New subscriptions won't be created |
| `invoice.payment_failed` | 🟡 **IMPORTANT** | Users can generate even when payment fails |
| `customer.subscription.updated` | 🟢 **RECOMMENDED** | Subscription data may be out of sync |
| `customer.subscription.deleted` | 🟢 **RECOMMENDED** | Cancellations won't be handled properly |

---

## 🔍 What Each Event Does (Detailed)

### `checkout.session.completed`
```javascript
// Creates subscription in Firestore
// Initializes credits based on plan
// Links Stripe subscription to user
```

### `invoice.paid`
```javascript
// CRITICAL: Resets credits
// Only if billing_reason === 'subscription_cycle'
// Prevents double reset with lastInvoiceId check
// Updates subscription status to 'active'
```

### `invoice.payment_failed`
```javascript
// Sets status to 'past_due'
// Does NOT reset credits
// Blocks generation access
```

### `customer.subscription.updated`
```javascript
// Updates plan if changed
// Updates status
// Updates billing period dates
```

### `customer.subscription.deleted`
```javascript
// Sets plan to 'FREE'
// Sets status to 'canceled'
// Resets credits to 0
// Handles Premium → Pro downgrade (future)
```

---

## ⚠️ Events NOT Needed (But Won't Hurt)

These events are **not required** but won't cause issues if selected:
- `customer.subscription.created` (handled by `checkout.session.completed`)
- `invoice.created` (we only care about paid/failed)
- `invoice.updated` (we only care about paid/failed)
- `payment_intent.*` (not used in our flow)

---

## 🧪 Testing Webhook Events

### Using Stripe CLI:
```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test invoice payment
stripe trigger invoice.paid

# Test payment failure
stripe trigger invoice.payment_failed

# Test subscription update
stripe trigger customer.subscription.updated

# Test subscription deletion
stripe trigger customer.subscription.deleted
```

### Check Your Backend Logs:
You should see messages like:
```
[WEBHOOK] Received event: invoice.paid (evt_...)
[WEBHOOK] ✓ Credits reset for user abc123 (plan: BASIC, invoice: in_...)
```

---

## ✅ Final Checklist

Before going live, verify:
- [ ] All 5 events are selected in Stripe Dashboard
- [ ] Webhook endpoint URL is correct
- [ ] Webhook secret is in your `.env` file
- [ ] Tested `invoice.paid` event (most critical)
- [ ] Tested `checkout.session.completed` event
- [ ] Backend logs show webhook events being received
- [ ] Credits reset when invoice is paid

---

## 🚨 Common Issues

### Credits Not Resetting?
- ✅ Check `invoice.paid` event is selected
- ✅ Check webhook is reaching your server
- ✅ Check `billing_reason === 'subscription_cycle'` in logs
- ✅ Check `lastInvoiceId` isn't blocking (double-reset protection)

### Subscription Not Created?
- ✅ Check `checkout.session.completed` event is selected
- ✅ Check webhook endpoint URL is correct
- ✅ Check metadata (userId, plan) is being passed

### Payment Failed But User Can Still Generate?
- ✅ Check `invoice.payment_failed` event is selected
- ✅ Check subscription status is being updated to `past_due`

---

**Last Updated**: Based on current webhook implementation




