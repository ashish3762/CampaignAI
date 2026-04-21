import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicAnalysis } from '../lib/analyses.js';

// Read-only, no-auth-required public view of a single analysis.
// Purposefully minimal — just what a recipient needs to understand the finding.
export default function PublicReport() {
  const { shareId } = useParams();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublicAnalysis(shareId);
        if (!cancelled) {
          if (!data) setError('This report is not available.');
          else setRow(data);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load report');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shareId]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Shared report
            </p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
              Ad Performance Analysis
            </h1>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            Read-only
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
            Loading report…
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Report unavailable</h2>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
          </div>
        ) : row ? (
          <ReportView row={row} />
        ) : null}
      </main>

      <footer className="mx-auto max-w-4xl px-6 pb-10 text-center text-xs text-slate-400">
        Analyzed with <span className="font-medium text-slate-500">Ad Performance Analyzer</span>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ReportView({ row }) {
  const label = issueLabel(row.biggest_issue);
  const actions = actionsFor(row.biggest_issue);
  const isPlanned = (row.type || 'actual').toLowerCase() === 'planned';
  const scope = [row.platform, row.industry].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6">
      {/* Insight hero */}
      <section className="rounded-xl border-l-4 border-slate-900 bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Performance Insight
          </p>
          <div className="flex items-center gap-2">
            {scope && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {scope}
              </span>
            )}
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
              isPlanned
                ? 'bg-blue-50 text-blue-700 ring-blue-100'
                : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
            }`}>
              {isPlanned ? 'Planned' : 'Actual'}
            </span>
          </div>
        </div>
        <p className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
          Biggest issue: {label}
        </p>
        {Number.isFinite(Number(row.money_impact)) && Math.abs(Number(row.money_impact)) >= 1 && (
          <MoneyImpact value={Number(row.money_impact)} />
        )}
        <p className="mt-3 text-xs text-slate-400">
          Analyzed on {formatDate(row.created_at)}
        </p>
      </section>

      {/* Metrics */}
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Key metrics
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Metric label="CPM" value={fmt(row.cpm, '$', 2)} />
          <Metric label="CTR" value={fmt(row.ctr, '', 2, '%')} />
          <Metric label="CPC" value={fmt(row.cpc, '$', 2)} />
          <Metric label="CVR" value={fmt(row.cvr, '', 2, '%')} />
          <Metric label="ROAS" value={fmt(row.roas, '', 2, 'x')} />
        </dl>
      </section>

      {/* Actions */}
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h2 className="text-sm font-semibold text-slate-900">
          {isPlanned ? 'Before launch' : 'What to focus on'}
        </h2>
        <ol className="mt-4 space-y-2.5">
          {actions.map((a, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              <span className="leading-relaxed">{a}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function MoneyImpact({ value }) {
  const behind = value < 0;
  const money = Math.abs(value).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  return (
    <p className={`mt-2 text-sm ${behind ? 'text-rose-700' : 'text-emerald-700'}`}>
      {behind
        ? `${money} of revenue left on the table at current spend.`
        : `${money} of extra revenue above the benchmark at current spend.`}
    </p>
  );
}

// Unified vocabulary — mirrors Dashboard.remapStoredIssue so shared reports
// read the same as the private dashboard.
function issueLabel(stored) {
  const map = {
    'Low CTR':             'Creative Issue',
    'Low CVR':             'Conversion Issue',
    'High CPM':            'High CPM',
    'CTR + CVR low':       'Funnel Breakdown',
    'Weak unit economics': 'High CPM',
    'Profitable':          'No major issue',
    'Healthy':             'No major issue',
  };
  return map[stored] || stored || 'No major issue';
}

function actionsFor(stored) {
  const label = issueLabel(stored);
  if (label.includes('Funnel')) {
    return [
      'Audit the full funnel from ad to conversion.',
      'Ensure message consistency between ad and landing page.',
      'Re-check targeting relevance and landing page alignment.',
    ];
  }
  if (label.includes('Conversion')) {
    return [
      'Check the landing page for broken elements (forms, checkout, tracking).',
      'Review page load speed, especially on mobile.',
      'Improve offer clarity — pricing, CTA, trust signals.',
    ];
  }
  if (label.includes('Creative')) {
    return [
      'Test 5–8 new creatives with different hooks.',
      'Strengthen the first 2 seconds to stop the scroll.',
      'Pause ads with low CTR (<0.5%) after enough impressions.',
    ];
  }
  if (label.includes('CPM')) {
    return [
      'Narrow or refine audience targeting.',
      'Test different placements or platforms.',
      'Monitor frequency to avoid ad fatigue.',
    ];
  }
  return ['No major issues detected — continue monitoring performance.'];
}

function fmt(n, prefix = '', digits = 2, suffix = '') {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${prefix}${v.toFixed(digits)}${suffix}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
