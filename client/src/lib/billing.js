import { supabase } from './supabase.js';

// Kicks off a Stripe Checkout session via our server and redirects the browser
// to Stripe. Server uses client_reference_id = user.id so the webhook can flip
// that user's is_premium flag on successful payment.
export async function startCheckout() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch('/api/billing/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Could not start checkout');
  if (!json.url) throw new Error('No checkout URL returned');
  window.location.href = json.url;
}
