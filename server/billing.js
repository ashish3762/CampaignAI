// Stripe + Supabase wiring for the paywall.
//
// Exposes two endpoints via attachBillingRoutes(app):
//   POST /api/billing/create-checkout-session
//        Auth: Bearer <Supabase access token>
//        Returns: { url } (Stripe Checkout redirect URL)
//
//   POST /api/billing/webhook
//        Called by Stripe. Verifies signature and flips profiles.is_premium
//        to true when checkout.session.completed fires.
//
// Env vars required:
//   STRIPE_SECRET_KEY              sk_live_... / sk_test_...
//   STRIPE_PRICE_ID                price_... (monthly subscription)
//   STRIPE_WEBHOOK_SECRET          whsec_...
//   PUBLIC_APP_URL                 e.g. http://localhost:5173
//   SUPABASE_URL                   https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY      service role key (server-only, never ship to client)
//
// Keep the webhook mounted BEFORE express.json() — Stripe requires the raw body
// for signature verification.

import express from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const {
  STRIPE_SECRET_KEY,
  STRIPE_PRICE_ID,
  STRIPE_WEBHOOK_SECRET,
  PUBLIC_APP_URL = 'http://localhost:5173',
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// Service-role client — bypasses RLS so webhooks can update any profile.
// Only instantiate if both env vars are present; skip quietly otherwise so
// the rest of the server still boots in local dev without billing configured.
const admin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

function billingConfigured() {
  return stripe && admin && STRIPE_PRICE_ID && STRIPE_WEBHOOK_SECRET;
}

export function attachBillingRoutes(app) {
  // -- Webhook (raw body) -----------------------------------------------------
  // Must be mounted before any JSON body parsing middleware.
  app.post(
    '/api/billing/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      if (!billingConfigured()) {
        return res.status(503).json({ error: 'Billing not configured' });
      }
      const sig = req.headers['stripe-signature'];
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.error('[stripe webhook] signature verify failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        if (event.type === 'checkout.session.completed') {
          const s = event.data.object;
          const userId = s.client_reference_id;
          const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id;
          if (userId) {
            await admin
              .from('profiles')
              .update({ is_premium: true, stripe_customer_id: customerId ?? null })
              .eq('id', userId);
          }
        }

        // Downgrade on cancellation. Safe no-op if the subscription wasn't active.
        if (event.type === 'customer.subscription.deleted') {
          const sub = event.data.object;
          const customerId = sub.customer;
          if (customerId) {
            await admin
              .from('profiles')
              .update({ is_premium: false })
              .eq('stripe_customer_id', customerId);
          }
        }
      } catch (err) {
        console.error('[stripe webhook] handler failed:', err);
        // Tell Stripe we failed so it retries.
        return res.status(500).json({ error: 'Handler failed' });
      }

      res.json({ received: true });
    }
  );

  // -- Create checkout session -----------------------------------------------
  // This is a JSON route; it relies on the global express.json() middleware
  // that gets attached in index.js AFTER this function returns.
  app.post('/api/billing/create-checkout-session', async (req, res) => {
    if (!billingConfigured()) {
      return res.status(503).json({ error: 'Billing not configured' });
    }

    try {
      // Validate the Supabase access token sent from the client.
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Missing access token' });

      const { data: userRes, error: userErr } = await admin.auth.getUser(token);
      if (userErr || !userRes?.user) {
        return res.status(401).json({ error: 'Invalid access token' });
      }
      const user = userRes.user;

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
        client_reference_id: user.id,
        customer_email: user.email,
        success_url: `${PUBLIC_APP_URL}/?upgrade=success`,
        cancel_url: `${PUBLIC_APP_URL}/?upgrade=cancel`,
        allow_promotion_codes: true,
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('[stripe checkout] failed:', err);
      res.status(500).json({ error: err.message || 'Could not create checkout session' });
    }
  });
}
