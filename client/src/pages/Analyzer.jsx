import { useState } from 'react';
import SimulatorForm from '../components/SimulatorForm.jsx';
import SimulationResults from '../components/SimulationResults.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { PAYWALL_ENABLED } from '../lib/features.js';
import { useProfile } from '../lib/useProfile.js';

export default function Analyzer() {
  const { user, logout } = useAuth();
  const { isPremium } = useProfile();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  async function handleSubmit(data) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || json.issues?.map((i) => i.message).join(', ') || 'Simulation failed');
      }
      setResult(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleRestart() {
    setResult(null);
    setError(null);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <AppLayout userEmail={user?.email}>
      <main className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="heading-2">Campaign Simulator</h1>
            <p className="mt-1 text-neutral-600">
              Predict campaign performance before you spend. Enter your campaign parameters and get projected ROAS, conversions, and actionable insights.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {PAYWALL_ENABLED && !isPremium && (
              <button
                onClick={() => setUpgradeOpen(true)}
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

        {!result && !loading && (
          <SimulatorForm onSubmit={handleSubmit} loading={loading} error={error} />
        )}

        {loading && (
          <div className="card text-center py-12">
            <p className="text-neutral-600">Running simulation…</p>
          </div>
        )}

        {result && !loading && (
          <SimulationResults result={result} onRestart={handleRestart} />
        )}
      </main>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </AppLayout>
  );
}
