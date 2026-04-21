import { useState } from 'react';
import { startCheckout } from '../lib/billing.js';

// Lightweight upgrade prompt. Shown when the user hits the free limit or
// clicks "Upgrade" in the header. Kept minimal by design — title, feature
// list, CTA.
export default function UpgradeModal({ open, onClose, reason }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      await startCheckout();
    } catch (e) {
      setError(e.message || 'Could not start checkout');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-8"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Pro plan
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              Unlock Full Access
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {reason && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-100">
            {reason}
          </p>
        )}

        <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
          <Feature>Unlimited saved analyses</Feature>
          <Feature>Shareable report links</Feature>
          <Feature>Advanced trend insights</Feature>
        </ul>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Redirecting…' : 'Upgrade'}
        </button>

        {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}

        <p className="mt-3 text-center text-xs text-slate-400">
          Cancel anytime from the Stripe customer portal.
        </p>
      </div>
    </div>
  );
}

function Feature({ children }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}
