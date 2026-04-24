import { useState } from 'react';
import { Link } from 'react-router-dom';
import InputForm from '../components/InputForm.jsx';
import Results from '../components/Results.jsx';
import ShareBar from '../components/ShareBar.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import { AppLayout } from '../layouts/AppLayout.jsx';
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
    <AppLayout userEmail={user?.email}>
      <main className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="heading-2">Ad Performance Analyzer</h1>
            <p className="mt-1 text-neutral-600">
              Paste your campaign numbers. Get a diagnosis and next steps in seconds.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {PAYWALL_ENABLED && !isPremium && (
              <button
                onClick={() => { setUpgradeReason(null); setUpgradeOpen(true); }}
                className="btn-primary"
              >
                Upgrade
              </button>
            )}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn-secondary"
            >
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </div>

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
        <footer className="text-center text-xs text-neutral-500 mt-8">
          Benchmarks adapt to the selected platform. Select Meta, Google, or TikTok for platform-specific thresholds.
        </footer>
      </main>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </AppLayout>
  );
}

function FreePlanBanner({ remaining, onUpgrade }) {
  const empty = remaining <= 0;
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm ring-1 ${
        empty
          ? 'bg-error-50 text-error-800 ring-error-100'
          : 'bg-neutral-50 text-neutral-600 ring-neutral-200'
      }`}
    >
      <span>
        {empty
          ? "You've reached the free plan limit. New analyses won't be saved."
          : `Free plan: ${remaining} of ${FREE_ANALYSIS_LIMIT} saves remaining.`}
      </span>
      <button
        onClick={onUpgrade}
        className="btn-primary text-xs"
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
      <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 text-sm font-medium">
        {options.map((o) => {
          const on = o.id === mode;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={`rounded-md px-4 py-1.5 transition ${
                on
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-neutral-500">{current.hint}</p>
    </div>
  );
}

function SaveStatus({ status }) {
  if (!status) return null;

  if (status === 'saving') {
    return (
      <div className="rounded-lg bg-neutral-50 px-4 py-2 text-xs text-neutral-500 ring-1 ring-neutral-200">
        Saving to history…
      </div>
    );
  }
  if (status === 'saved') {
    return (
      <div className="flex items-center justify-between rounded-lg bg-success-50 px-4 py-2 text-xs text-success-700 ring-1 ring-success-100">
        <span>Saved to your history.</span>
        <Link to="/dashboard" className="font-medium hover:underline">
          View in Dashboard →
        </Link>
      </div>
    );
  }
  if (status === 'blocked') {
    return (
      <div className="rounded-lg bg-warning-50 px-4 py-2 text-xs text-warning-800 ring-1 ring-warning-100">
        Not saved — free plan limit reached.
      </div>
    );
  }
  if (status?.error) {
    return (
      <div className="rounded-lg bg-error-50 px-4 py-2 text-xs text-error-700 ring-1 ring-error-100">
        Couldn't save this analysis: {status.error}
      </div>
    );
  }
  return null;
}
