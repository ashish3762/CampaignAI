import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { listRecentAnalyses } from '../lib/analyses.js';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'actual' | 'planned'

  const visibleRows = useMemo(() => {
    if (typeFilter === 'all') return rows;
    return rows.filter((r) => analysisType(r) === typeFilter);
  }, [rows, typeFilter]);

  const counts = useMemo(() => ({
    all: rows.length,
    actual: rows.filter((r) => analysisType(r) === 'actual').length,
    planned: rows.filter((r) => analysisType(r) === 'planned').length,
  }), [rows]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listRecentAnalyses(10);
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load analyses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="heading-2">Your Campaign Performance</h1>
            <p className="mt-1 text-neutral-600">
              A rolling log of your recent analyses and how they're trending.
            </p>
          </div>
          <Link
            to="/simulator"
            className="btn-primary"
          >
            New analysis
          </Link>
        </div>
        {error && (
          <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 ring-1 ring-error-100">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <TypeFilter value={typeFilter} onChange={setTypeFilter} counts={counts} />
            {visibleRows.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                No {typeFilter} analyses yet.
              </div>
            ) : (
              <>
                <TrendInsight rows={visibleRows} />
                <ActionBlock rows={visibleRows} />
                <ComparisonCard rows={visibleRows} />
                <TrendChart rows={visibleRows} />
                <RecentTable rows={visibleRows} />
              </>
            )}
          </>
        )}
      </main>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="card">
      <p className="text-neutral-600">Loading your analyses…</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card text-center">
      <h2 className="text-lg font-semibold text-neutral-900">No analyses yet</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Run your first analysis to start building history.
      </p>
      <Link
        to="/simulator"
        className="mt-5 btn-primary inline-flex"
      >
        Run an analysis
      </Link>
    </div>
  );
}

// -- Context -----------------------------------------------------------------

function isComparable(a, b) {
  const norm = (v) => (v ?? '').trim().toLowerCase();
  // Treat missing type as 'actual' (legacy rows predate the planned mode).
  const type = (v) => norm(v?.type || 'actual');
  return (
    norm(a.platform) === norm(b.platform) &&
    norm(a.industry) === norm(b.industry) &&
    type(a) === type(b)
  );
}

function analysisType(row) {
  return (row?.type || 'actual').toLowerCase() === 'planned' ? 'planned' : 'actual';
}

function formatContextScope(row) {
  const p = row.platform?.trim();
  const i = row.industry?.trim();
  if (p && i) return `${p} (${i})`;
  if (p) return p;
  if (i) return i;
  return '';
}

// -- Trend intelligence ------------------------------------------------------

const DROP = -20;
const RISE = 20;
const STABLE = 10;

function pctChange(cur, prev) {
  const c = Number(cur);
  const p = Number(prev);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return 0;
  return ((c - p) / p) * 100;
}

function roundPct(n) {
  return Math.abs(Math.round(n));
}

function computeTrendInsight(current, previous) {
  const ctr = pctChange(current.ctr, previous.ctr);
  const cvr = pctChange(current.cvr, previous.cvr);
  const roas = pctChange(current.roas, previous.roas);
  const cpm = pctChange(current.cpm, previous.cpm);

  if (ctr < DROP && cvr < DROP) {
    return {
      primaryIssue: 'funnel',
      tone: 'down',
      headline: 'Performance is declining across the funnel.',
      body: `Both engagement (CTR ↓ ${roundPct(ctr)}%) and conversions (CVR ↓ ${roundPct(cvr)}%) are down — this suggests broader issues like targeting or messaging misalignment.`,
    };
  }
  if (cvr < DROP && Math.abs(cvr) > Math.abs(ctr)) {
    return {
      primaryIssue: 'conversion',
      tone: 'down',
      headline: `Conversion rate has dropped sharply (↓ ${roundPct(cvr)}%).`,
      body: 'Traffic is stable, but fewer users are converting — this points to a landing page or offer issue.',
    };
  }
  if (ctr < DROP) {
    return {
      primaryIssue: 'creative',
      tone: 'down',
      headline: `Click-through rate has declined (↓ ${roundPct(ctr)}%).`,
      body: 'Your ads are losing engagement — this suggests creative fatigue or weaker hooks.',
    };
  }
  if (cpm > RISE) {
    return {
      primaryIssue: 'cost',
      tone: 'warn',
      headline: `CPM has increased (↑ ${roundPct(cpm)}%).`,
      body: "You're paying more to reach users — likely due to increased competition or inefficient audience targeting.",
    };
  }
  if (roas < DROP && Math.abs(ctr) < STABLE && Math.abs(cvr) < STABLE) {
    return {
      primaryIssue: 'cost',
      tone: 'down',
      headline: `ROAS has declined (↓ ${roundPct(roas)}%) despite stable engagement and conversion rates.`,
      body: 'This may indicate rising costs or weaker unit economics.',
    };
  }
  return {
    primaryIssue: null,
    tone: 'neutral',
    headline: 'Performance is relatively stable with no major shifts in key metrics.',
    body: null,
  };
}

const ISSUE_LABELS = {
  conversion: 'Conversion Issue',
  creative:   'Creative Issue',
  cost:       'High CPM',
  funnel:     'Funnel Breakdown',
};

function getIssueLabel(primaryIssue) {
  return ISSUE_LABELS[primaryIssue] || 'No major issue';
}

function getActions(primaryIssue, type = 'actual') {
  // Forward-looking advice when all the inputs are still projections.
  if (type === 'planned') {
    switch (primaryIssue) {
      case 'conversion':
        return [
          'Improve landing page conversion readiness before launch',
          'Validate the offer and CTA in a small pilot first',
          'Start with a smaller budget to de-risk the conversion assumption',
        ];
      case 'creative':
        return [
          'Test stronger creative variants before scaling budget',
          'Prepare 3–5 hook alternatives to rotate in if CTR stalls',
          'Pressure-test creative with a small audience before broad launch',
        ];
      case 'cost':
        return [
          'Narrow audience targeting before committing full budget',
          'Benchmark projected CPM against prior campaigns in this context',
          'Plan incremental budget increases rather than scaling in one step',
        ];
      case 'funnel':
        return [
          'Audit the end-to-end funnel before launch — ad, landing page, checkout',
          'Confirm message consistency between planned creative and landing page',
          'Run a small pilot to validate the funnel before scaling spend',
        ];
      default:
        return [
          'Launch with a smaller validation budget before scaling',
          'Set clear success thresholds for ROAS and CVR up front',
        ];
    }
  }
  switch (primaryIssue) {
    case 'conversion':
      return [
        'Check landing page for broken elements (forms, checkout, tracking)',
        'Review page load speed, especially on mobile',
        'Improve offer clarity (pricing, CTA, trust signals)',
      ];
    case 'creative':
      return [
        'Test 5–8 new creatives with different hooks',
        'Focus on stronger first 2 seconds to stop scroll',
        'Pause ads with low CTR (<0.5%) after sufficient impressions',
      ];
    case 'cost':
      return [
        'Narrow or refine audience targeting',
        'Test different placements or platforms',
        'Monitor frequency to avoid ad fatigue',
      ];
    case 'funnel':
      return [
        'Audit full funnel from ad to conversion',
        'Ensure message consistency between ad and landing page',
        'Check targeting relevance and landing page alignment',
      ];
    default:
      return ['Monitor performance for further changes'];
  }
}

function remapStoredIssue(stored) {
  if (!stored) return null;
  const map = {
    'Low CTR':              'Creative Issue',
    'Low CVR':              'Conversion Issue',
    'High CPM':             'High CPM',
    'CTR + CVR low':        'Funnel Breakdown',
    'Weak unit economics':  'High CPM',
    'Profitable':           'No major issue',
    'Healthy':              'No major issue',
  };
  return map[stored] || stored;
}

// -- Insight hero card -------------------------------------------------------
// White card with a 4px left accent. Severity carried by the border color, not
// a full panel tint — keeps the page calm and pushes attention to text.

const INSIGHT_THEME = {
  down:    { border: 'border-error-500',   tint: 'bg-error-50/60',  label: 'text-error-700',  confidence: 'High' },
  warn:    { border: 'border-warning-500',  tint: 'bg-warning-50/60', label: 'text-warning-700', confidence: 'Medium' },
  neutral: { border: 'border-success-500', tint: 'bg-success-50/60', label: 'text-success-700', confidence: 'High' },
};

function TrendInsight({ rows }) {
  if (rows.length < 2) return null;
  if (!isComparable(rows[0], rows[1])) return null;

  const insight = computeTrendInsight(rows[0], rows[1]);
  if (!insight) return null;

  const { primaryIssue, tone, headline, body } = insight;
  const theme = INSIGHT_THEME[tone] || INSIGHT_THEME.neutral;

  // Trust indicator — how many comparable rows back this insight.
  const head = rows[0];
  const comparableCount = rows.filter((r) => isComparable(r, head)).length;
  const headType = analysisType(head);
  // Planned projections deserve lower confidence than observed data, regardless of tone.
  const confidence = headType === 'planned' ? 'Medium' : theme.confidence;
  const confidenceNote = headType === 'planned' ? 'based on projected inputs' : null;

  return (
    <section
      className={`group rounded-xl border border-neutral-200 border-l-4 ${theme.border} bg-white p-6 shadow-sm transition hover:shadow-md sm:p-8`}
    >
      {/* Very subtle tinted header band */}
      <div className={`-mx-6 -mt-6 mb-6 rounded-t-[10px] ${theme.tint} px-6 py-2 sm:-mx-8 sm:-mt-8 sm:px-8`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-xs font-semibold uppercase tracking-wide ${theme.label}`}>
            Performance Insight
          </p>
          {primaryIssue && (
            <IssueBadge
              label={`Biggest Issue: ${getIssueLabel(primaryIssue)}`}
              primaryIssue={primaryIssue}
            />
          )}
        </div>
      </div>

      <p className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-[1.35rem]">
        {headline}
      </p>
      {body && <p className="mt-2 text-sm leading-relaxed text-neutral-600">{body}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${confidence === 'Medium' ? 'bg-warning-500' : 'bg-success-500'}`} />
          Insight confidence: <span className="font-medium text-neutral-700">{confidence}</span>
          {confidenceNote && <span className="text-neutral-400"> ({confidenceNote})</span>}
        </span>
        <span className="text-neutral-300">·</span>
        <span>Based on last {comparableCount} {comparableCount === 1 ? 'analysis' : 'analyses'} in this context</span>
      </div>
    </section>
  );
}

// -- Action block (below insight) --------------------------------------------
// Dedicated "what to do today" checklist — keeps diagnosis (why) and action
// (what) visually separate so the user's eye has two distinct jobs to do.

function ActionBlock({ rows }) {
  if (rows.length < 2) return null;
  if (!isComparable(rows[0], rows[1])) return null;

  const { primaryIssue } = computeTrendInsight(rows[0], rows[1]);
  const type = analysisType(rows[0]);
  const actions = getActions(primaryIssue, type);

  return (
    <section className="card hover:shadow-modern transition">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900">
          {type === 'planned' ? 'Before you launch' : 'What to focus on today'}
        </h2>
        {primaryIssue && (
          <span className="text-xs text-neutral-500">
            {type === 'planned'
              ? 'Forward-looking — based on projected inputs'
              : 'Derived from your biggest issue'}
          </span>
        )}
      </div>

      {primaryIssue ? (
        <ol className="mt-4 space-y-2.5">
          {actions.map((a, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-700 transition hover:bg-neutral-50"
            >
              <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              <span className="leading-relaxed">{a}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-neutral-600">
          No major issues detected. Continue monitoring performance.
        </p>
      )}
    </section>
  );
}

// -- Comparison card ---------------------------------------------------------

function ComparisonCard({ rows }) {
  return (
    <section className="card">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Since last analysis
      </h2>

      {rows.length < 2 ? (
        <p className="mt-2 text-sm text-neutral-500">
          Run another analysis to see trends.
        </p>
      ) : isComparable(rows[0], rows[1]) ? (
        <ComparableView current={rows[0]} previous={rows[1]} />
      ) : (
        <MismatchView current={rows[0]} previous={rows[1]} />
      )}
    </section>
  );
}

function ComparableView({ current, previous }) {
  const scope = formatContextScope(current);
  return (
    <>
      {scope && (
        <p className="mt-1 text-xs text-neutral-500">Compared within {scope}</p>
      )}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Delta label="ROAS" current={current.roas} previous={previous.roas} suffix="x" digits={2} />
        <Delta label="CTR"  current={current.ctr}  previous={previous.ctr}  suffix="%" digits={2} />
        <Delta label="CVR"  current={current.cvr}  previous={previous.cvr}  suffix="%" digits={2} />
      </div>
    </>
  );
}

function MismatchView({ current, previous }) {
  const curType = analysisType(current);
  const prevType = analysisType(previous);
  const typeMismatch = curType !== prevType;

  const message = typeMismatch
    ? "Your last analysis was a different type (planned vs actual), so a direct comparison isn't reliable."
    : "Your last analysis used a different setup (platform or industry), so a direct comparison isn't reliable.";

  const scope = (row) => {
    const s = formatContextScope(row) || 'no context set';
    return `${s} · ${analysisType(row)}`;
  };

  return (
    <>
      <div className="mt-3 rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-800 ring-1 ring-warning-100">
        {message}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <DualValue label="ROAS" current={current.roas} previous={previous.roas} suffix="x" />
        <DualValue label="CTR"  current={current.ctr}  previous={previous.ctr}  suffix="%" />
        <DualValue label="CVR"  current={current.cvr}  previous={previous.cvr}  suffix="%" />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span>Current: {scope(current)}</span>
        <span>Previous: {scope(previous)}</span>
      </div>
    </>
  );
}

function DualValue({ label, current, previous, suffix = '' }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</div>
      <dl className="mt-2 space-y-0.5 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-neutral-500">Current</dt>
          <dd className="font-semibold text-neutral-900">{fmt(current, suffix)}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-neutral-500">Previous</dt>
          <dd className="text-neutral-600">{fmt(previous, suffix)}</dd>
        </div>
      </dl>
    </div>
  );
}

// Interpret a metric's % change as a short label that reads like how a PM
// would describe the movement — "Efficiency dropped" beats "−44%".
function interpretDelta(label, pct) {
  const abs = Math.abs(pct);
  if (abs < 1) return 'Stable';

  const up = pct > 0;
  if (up) {
    if (abs >= 100) return 'Recovered strongly';
    if (abs >= 30)  return `${label} improving`;
    return 'Modest gain';
  }
  if (abs >= 50) return 'Sharp decline';
  if (abs >= 20) {
    if (label === 'ROAS') return 'Efficiency dropped';
    if (label === 'CTR')  return 'Engagement weakening';
    if (label === 'CVR')  return 'Conversion softening';
    return 'Declining';
  }
  return 'Slight dip';
}

function Delta({ label, current, previous, suffix = '', digits = 2 }) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  const pct = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
  const up = pct > 0;
  const flat = Math.abs(pct) < 0.5 || prev === 0;

  const tone = flat
    ? 'text-neutral-500'
    : up
    ? 'text-success-600'
    : 'text-error-600';

  return (
    <div className="rounded-xl bg-neutral-50 p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
        {cur.toFixed(digits)}{suffix}
      </div>
      <div className={`mt-1 text-sm font-medium ${tone}`}>
        {flat ? '— flat' : `${up ? '↑' : '↓'} ${Math.abs(pct).toFixed(0)}%`}
      </div>
      <div className="mt-0.5 text-xs text-neutral-500">
        {flat ? 'No material change' : interpretDelta(label, pct)}
      </div>
    </div>
  );
}

// -- Trend chart -------------------------------------------------------------

const METRIC_OPTIONS = [
  { key: 'ctr',  label: 'CTR',  color: '#2563eb', suffix: '%', digits: 2 }, // blue
  { key: 'cvr',  label: 'CVR',  color: '#16a34a', suffix: '%', digits: 2 }, // green
  { key: 'roas', label: 'ROAS', color: '#7c3aed', suffix: 'x', digits: 2 }, // purple
];

// Build the chart dataset: latest comparable-context rows, chronological order.
// We restrict to rows that share the top row's context so the line is meaningful.
function buildChartData(rows) {
  if (rows.length === 0) return { data: [], scope: '' };
  const head = rows[0];
  const filtered = rows.filter((r) => isComparable(r, head));
  // Take up to 10, then reverse to oldest → newest for the chart.
  const sliced = filtered.slice(0, 10).reverse();
  const data = sliced.map((r) => ({
    dateLabel: formatDate(r.created_at),
    ctr:  Number(r.ctr)  || 0,
    cvr:  Number(r.cvr)  || 0,
    roas: Number(r.roas) || 0,
  }));
  return { data, scope: formatContextScope(head) };
}

// One-line summary of where the selected series has been heading. Detects
// recent spikes separately from slower first-half / second-half drift.
function summarizeSeries(data, metric, label) {
  if (data.length < 3) return null;
  const values = data.map((d) => d[metric]).filter(Number.isFinite);
  if (values.length < 3) return null;

  // Recent spike — latest vs prior average.
  const last = values[values.length - 1];
  const priorAvg = values.slice(0, -1).reduce((a, b) => a + b, 0) / (values.length - 1);
  if (priorAvg > 0) {
    const recent = ((last - priorAvg) / priorAvg) * 100;
    if (Math.abs(recent) >= 25) {
      return recent > 0
        ? `${label} spike is recent — the latest entry is ${Math.round(recent)}% above the prior average.`
        : `${label} dropped sharply in the latest entry — ${Math.round(Math.abs(recent))}% below the prior average.`;
    }
  }

  // Slower drift — first half vs second half.
  const mid = Math.floor(values.length / 2);
  const f = values.slice(0, mid);
  const s = values.slice(mid);
  const af = f.reduce((a, b) => a + b, 0) / f.length;
  const as_ = s.reduce((a, b) => a + b, 0) / s.length;
  const drift = af !== 0 ? ((as_ - af) / af) * 100 : 0;

  if (drift > 15)  return `${label} has been trending up across the last ${data.length} analyses.`;
  if (drift < -15) return `${label} has been declining across the last ${data.length} analyses.`;
  return `${label} has been relatively stable across the last ${data.length} analyses.`;
}

function TrendChart({ rows }) {
  const [metric, setMetric] = useState('ctr');
  const { data, scope } = useMemo(() => buildChartData(rows), [rows]);
  const active = METRIC_OPTIONS.find((m) => m.key === metric);
  const summary = useMemo(() => summarizeSeries(data, metric, active.label), [data, metric, active.label]);

  if (data.length < 2) {
    return (
      <section className="card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Metric trend
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Run at least two analyses in the same context to see a trend line.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Metric trend
          </h2>
          {scope && (
            <p className="mt-0.5 text-xs text-neutral-500">{scope} · last {data.length} analyses</p>
          )}
        </div>
        <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 text-xs font-medium">
          {METRIC_OPTIONS.map((m) => {
            const on = m.key === metric;
            return (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`rounded-md px-3 py-1.5 transition ${
                  on
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
                style={on ? { color: m.color } : undefined}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {summary && (
        <p className="mt-3 text-sm font-medium text-neutral-700">{summary}</p>
      )}

      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#cbd5e1" strokeDasharray="3 3" />
            <XAxis
              dataKey="dateLabel"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v) => `${Number(v).toFixed(active.digits === 0 ? 0 : 1)}${active.suffix}`}
            />
            <Tooltip
              cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
                fontSize: 12,
              }}
              formatter={(value) => [
                `${Number(value).toFixed(active.digits)}${active.suffix}`,
                active.label,
              ]}
              labelStyle={{ color: '#475569', fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey={metric}
              stroke={active.color}
              strokeWidth={2}
              dot={{ r: 3, fill: active.color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

// -- Recent table ------------------------------------------------------------

function RecentTable({ rows }) {
  return (
    <section className="card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Recent analyses
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Issues shown below are based on each individual analysis.
          </p>
        </div>
        <span className="text-xs text-neutral-400">
          Showing {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <Th>Date</Th>
              <Th>Type</Th>
              <Th className="text-right">ROAS</Th>
              <Th className="text-right">CTR</Th>
              <Th className="text-right">CVR</Th>
              <Th>Issue at that time</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const isLatest = idx === 0;
              // Subtle zebra for non-latest rows; latest row gets a faint accent instead.
              const rowBg = isLatest
                ? 'bg-slate-900/[0.02]'
                : idx % 2 === 1
                ? 'bg-slate-50/60'
                : '';
              return (
                <tr
                  key={r.id}
                  className={`border-t border-slate-100 transition hover:bg-slate-50 ${rowBg}`}
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-800">{formatDate(r.created_at)}</span>
                      {isLatest && (
                        <span className="rounded-full bg-primary-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Latest
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-400">
                      {formatContextScope(r) || '—'}
                    </div>
                  </Td>
                  <Td>
                    <TypeChip type={analysisType(r)} />
                  </Td>
                  <Td className="text-right font-medium">{fmt(r.roas, 'x')}</Td>
                  <Td className="text-right">{fmt(r.ctr, '%')}</Td>
                  <Td className="text-right">{fmt(r.cvr, '%')}</Td>
                  <Td>
                    <IssueChip issue={remapStoredIssue(r.biggest_issue)} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children, className = '' }) {
  return <th className={`px-6 py-2.5 font-medium sm:px-8 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`px-6 py-3 text-neutral-700 sm:px-8 ${className}`}>{children}</td>;
}

// -- Badges ------------------------------------------------------------------

// Soft-color palette per primary issue. Shared between the insight hero badge
// and the table row chips via IssueChip → toneFromLabel.
const ISSUE_TONES = {
  conversion:  'bg-error-50 text-error-700',      // landing / offer
  creative:    'bg-warning-50 text-warning-700', // creative fatigue
  cost:        'bg-warning-50 text-warning-800', // auction / economics
  funnel:      'bg-error-100 text-error-800',    // most severe
  none:        'bg-success-50 text-success-700',
};

function toneFromLabel(label) {
  if (!label) return 'bg-neutral-100 text-neutral-600';
  const l = label.toLowerCase();
  if (l.includes('funnel'))       return ISSUE_TONES.funnel;
  if (l.includes('conversion'))   return ISSUE_TONES.conversion;
  if (l.includes('creative'))     return ISSUE_TONES.creative;
  if (l.includes('cpm') || l.includes('cost') || l.includes('economics')) return ISSUE_TONES.cost;
  if (l.includes('no major'))     return ISSUE_TONES.none;
  return 'bg-neutral-100 text-neutral-600';
}

function IssueBadge({ label, primaryIssue }) {
  const tone = ISSUE_TONES[primaryIssue] || toneFromLabel(label);
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

function IssueChip({ issue }) {
  if (!issue) return <span className="text-neutral-400">—</span>;
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${toneFromLabel(issue)}`}>
      {issue}
    </span>
  );
}

function TypeChip({ type }) {
  const planned = type === 'planned';
  const cls = planned
    ? 'bg-blue-50 text-blue-700 ring-blue-100'
    : 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  const dot = planned ? 'bg-blue-500' : 'bg-emerald-500';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {planned ? 'Planned' : 'Actual'}
    </span>
  );
}

// -- Type filter -------------------------------------------------------------

function TypeFilter({ value, onChange, counts }) {
  const options = [
    { id: 'all',     label: 'All',     count: counts.all },
    { id: 'actual',  label: 'Actual',  count: counts.actual },
    { id: 'planned', label: 'Planned', count: counts.planned },
  ];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 text-sm font-medium">
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 transition ${
                on ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <span>{o.label}</span>
              <span
                className={`rounded-full px-1.5 text-[10px] font-semibold ${
                  on ? 'bg-primary-500 text-white' : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {o.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// -- Formatting --------------------------------------------------------------

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function fmt(n, suffix) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${v.toFixed(2)}${suffix}`;
}
