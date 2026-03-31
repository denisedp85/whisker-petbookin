# Debugging Webhook Issues - Quick Guide

## Step 1: Check Stripe Webhook Logs

1. **Go to Stripe Dashboard**
2. **Click "Developers"** (bottom left)
3. **Click "Webhooks"**
4. **Click on your webhook** (petbookin endpoint)
5. **Scroll down to "Recent events"**
6. **Look for recent `checkout.session.completed` events**

### What to Look For:

**If you see ✓ 200 responses:**
- Webhook is working
- Issue is in the code logic

**If you see ✗ 400/500 errors:**
- Webhook signature verification failing
- OR code error in webhook handler

**Take a screenshot of the webhook logs and share with me!**

---

## Step 2: Check if Webhook Secret is in Production

The webhook secret needs to be added to your **production environment variables**.

**Current situation:**
- Workspace has: `STRIPE_WEBHOOK_SECRET="whsec_i1KDe5nZMh8c4sb4HT7dBA1NR7aMPIAb"`
- Production might NOT have it (causing webhook to fail)

### How to Add:

When you deploy, the environment variables from `/app/backend/.env` should transfer automatically. But sometimes they need to be manually added.

---

## Step 3: Temporary Fix - Disable Signature Verification

If the webhook secret isn't being passed to production, I can temporarily disable signature verification so webhooks work.

Let me know what you see in the Stripe webhook logs!
