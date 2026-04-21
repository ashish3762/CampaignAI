import { useState } from 'react';
import { publishAnalysis } from '../lib/analyses.js';

// Single row of UI below the saved-confirmation banner: one button that
// generates a public share link and swaps in a copy-to-clipboard readout.
// Gated to premium users — free users see the same CTA but it bounces them
// to the upgrade modal.
export default function ShareBar({ analysisId, isPremium, onRequireUpgrade }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (!isPremium) {
      onRequireUpgrade?.();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { url } = await publishAnalysis(analysisId);
      setUrl(url);
    } catch (e) {
      setError(e.message || 'Could not create share link');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — user can still select the URL manually.
    }
  }

  if (url) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
            ✓
          </span>
          <span>Public link ready</span>
        </div>
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="min-w-[240px] flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
        />
        <button
          onClick={copy}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
        >
          Open ↗
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <div className="text-sm font-medium text-slate-800">Share this report</div>
        <p className="text-xs text-slate-500">
          Create a public, read-only link anyone can open — no login needed.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {error && <span className="text-xs text-rose-600">{error}</span>}
        <button
          onClick={handleShare}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Creating link…' : 'Share Report'}
          {!isPremium && (
            <span className="rounded-full bg-indigo-400/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Pro
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
