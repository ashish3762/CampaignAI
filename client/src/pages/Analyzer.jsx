import { useState } from 'react';
import { Link } from 'react-router-dom';
import InputForm from '../components/InputForm.jsx';
import Results from '../components/Results.jsx';
import ShareBar from '../components/ShareBar.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { FREE_ANALYSIS_LIMIT, PaywallError, saveAnalysis } from '../lib/analyses.js';
import { PAYWALL_ENABLED } from '../lib/features.js';
import { useProfile } from '../lib/useProfile.js';

export default function Analyzer() {
  const { user, logout } = useAuth();
  const { isPremium, analysisCount, refresh: refreshProfile } = useProfile();

  const [mode, setMode] = useState('actual'); // 'actual' | 'planned'
  const [inputs, setInputs] = useState(null);
  const [result, setResult] = useState(null);
  const [resultMode, setResultMode] = useState('actual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // save status: null | 'saving' | 'saved' | { error: string } | 'blocked'
  const [saveStatus, setSaveStatus] = useState(null);
  const [savedAnalysisId, setSavedAnalysisId] = useState(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState(null);

  async function runAnalyze(data) {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Analysis failed');
    return json;
  }

  async function handleSubmit(data) {
    setLoading(true);
    setError(null);
    setSaveStatus(null);
    setSavedAnalysisId(null);
    try {
      const r = await runAnalyze(data);
      setInputs(data);
      setResult(r);
      setResultMode(mode);

      setSaveStatus('saving');
      try {
        const saved = await saveAnalysis({ user, inputs: data, result: r, mode });
        setSavedAnalysisId(saved?.id ?? null);
        setSaveStatus('saved');
        refreshProfile();
      } catch (e) {
        if (e instanceof PaywallError) {
          setSaveStatus('blocked');
          setUpgradeReason(e.message);
          setUpgradeOpen(true);
        } else {
          setSaveStatus({ error: e.message || 'Failed to save' });
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Wipe any previously rendered result when the user toggles modes — the
  // old output belongs to the prior context (real vs projected) and would
  // read as stale next to a fresh, empty form.
  function handleModeChange(next) {
    setMode(next);
    setResult(null);
    setInputs(null);
    setError(null);
    setSaveStatus(null);
    setSavedAnalysisId(null);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  const remaining = Math.max(0, FREE_ANALYSIS_LIMIT - analysisCount);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Ad Performance Analyzer
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Paste your campaign numbers. Get a diagnosis and next steps in seconds.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {PAYWALL_ENABLED && !isPremium && (
              <button
                onClick={() => { setUpgradeReason(null); setUpgradeOpen(true); }}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                Upgrade
              </button>
            )}
            <Link
              to="/dashboard"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <span
              className="hidden max-w-[200px] truncate text-sm text-slate-600 sm:inline"
              title={user?.email}
            >
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            >
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <ModeToggle mode={mode} onChange={handleModeChange} />
        {PAYWALL_ENABLED && !isPremium && (
          <FreePlanBanner
            remaining={remaining}
            onUpgrade={() => { setUpgradeReason(null); setUpgradeOpen(true); }}
          />
        )}
        <InputForm mode={mode} onSubmit={handleSubmit} loading={loading} error={error} />
        {result && (
          <>
            <SaveStatus status={saveStatus} />
            {saveStatus === 'saved' && savedAnalysisId && (
              <ShareBar
                analysisId={savedAnalysisId}
                isPremium={isPremium}
                onRequireUpgrade={() => {
                  setUpgradeReason('Sharing reports is a Pro feature.');
                  setUpgradeOpen(true);
                }}
              />
            )}
            <Results inputs={inputs} result={result} mode={resultMode} runAnalyze={runAnalyze} />
          </>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-center text-xs text-slate-400">
        Benchmarks adapt to the selected platform. Select Meta, Google, or TikTok for platform-specific thresholds.
      </footer>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </div>
  );
}

function FreePlanBanner({ remaining, onUpgrade }) {
  const empty = remaining <= 0;
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm ring-1 ${
        empty
          ? 'bg-rose-50 text-rose-800 ring-rose-100'
          : 'bg-slate-50 text-slate-600 ring-slate-200'
      }`}
    >
      <span>
        {empty
          ? "You've reached the free plan limit. New analyses won't be saved."
          : `Free plan: ${remaining} of ${FREE_ANALYSIS_LIMIT} saves remaining.`}
      </span>
      <button
        onClick={onUpgrade}
        className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
      >
        Upgrade to Pro
      </button>
    </div>
  );
}

function ModeToggle({ mode, onChange }) {
  const options = [
    { id: 'actual',  label: 'Actual Performance', hint: 'Real campaign data' },
    { id: 'planned', label: 'Planned Campaign',   hint: 'Projected / expected metrics' },
  ];
  const current = options.find((o) => o.id === mode) || options[0];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm font-medium">
        {options.map((o) => {
          const on = o.id === mode;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={`rounded-md px-4 py-1.5 transition ${
                on
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">{current.hint}</p>
    </div>
  );
}

function SaveStatus({ status }) {
  if (!status) return null;

  if (status === 'saving') {
    return (
      <div className="rounded-lg bg-slate-50 px-4 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
        Saving to history…
      </div>
    );
  }
  if (status === 'saved') {
    return (
      <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2 text-xs text-emerald-700 ring-1 ring-emerald-100">
        <span>Saved to your history.</span>
        <Link to="/dashboard" className="font-medium hover:underline">
          View in Dashboard →
        </Link>
      </div>
    );
  }
  if (status === 'blocked') {
    return (
      <div className="rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-800 ring-1 ring-amber-100">
        Not saved — free plan limit reached.
      </div>
    );
  }
  if (status?.error) {
    return (
      <div className="rounded-lg bg-rose-50 px-4 py-2 text-xs text-rose-700 ring-1 ring-rose-100">
        Couldn't save this analysis: {status.error}
      </div>
    );
  }
  return null;
}
