export default function SimulationResults({ result, onRestart }) {
  const { funnel, cpm, ctr, cvr, funnelStages, confidence, insights } = result;
  const m = funnel.metrics;
  const r = funnel.ranges;

  return (
    <div className="space-y-8">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="ROAS" value={`${m.roas}x`} range={`${r.roas.low}x – ${r.roas.high}x`} tone={m.roas >= 2 ? 'good' : m.roas >= 1 ? 'warn' : 'bad'} />
        <KpiCard label="Revenue" value={money(m.revenue)} range={`${money(r.revenue.low)} – ${money(r.revenue.high)}`} tone="neutral" />
        <KpiCard label="Conversions" value={fmt(m.conversions)} range={`${fmt(r.conversions.low)} – ${fmt(r.conversions.high)}`} tone="neutral" />
        <KpiCard label="CPA" value={money(m.cpa)} range={`${money(r.cpa.low)} – ${money(r.cpa.high)}`} tone={m.cpa < 30 ? 'good' : m.cpa < 60 ? 'warn' : 'bad'} />
      </div>

      {/* Funnel Breakdown */}
      <section className="card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-4">
          Funnel Breakdown
        </h2>
        <div className="space-y-3">
          {funnelStages.map((stage, i) => {
            const pct = funnelStages[0].count > 0 ? (stage.count / funnelStages[0].count) * 100 : 0;
            return (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-neutral-700">{stage.name}</span>
                  <span className="tabular-nums text-neutral-600">{fmtInt(stage.count)}</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Confidence */}
      <section className="card">
        <div className="flex items-center gap-4">
          <ConfidenceBadge score={confidence.score} label={confidence.label} />
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Confidence: {confidence.label}
            </h2>
            <ul className="mt-1 space-y-0.5">
              {confidence.reasons.map((r, i) => (
                <li key={i} className="text-xs text-neutral-600">
                  {r.factor}: {r.score}/100 — {r.note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Factor Breakdown */}
      <section className="card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-4">
          Why This Result?
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <FactorGroup title="CPM Factors" factors={cpm.factors} baseLabel={`$${cpm.expected} CPM`} />
          <FactorGroup title="CTR Factors" factors={ctr.factors} baseLabel={`${ctr.expected}% CTR`} />
          <FactorGroup title="CVR Factors" factors={cvr.factors} baseLabel={`${cvr.expected}% CVR`} />
        </div>
      </section>

      {/* Insights */}
      {insights.length > 0 && (
        <section className="card">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-4">
            Insights & Recommendations
          </h2>
          <div className="space-y-4">
            {insights.map((ins, i) => (
              <div
                key={i}
                className={`rounded-lg p-4 ring-1 ${
                  ins.impact === 'high'
                    ? 'bg-error-50 ring-error-100'
                    : ins.impact === 'positive'
                    ? 'bg-success-50 ring-success-100'
                    : 'bg-warning-50 ring-warning-100'
                }`}
              >
                <h3 className="text-sm font-semibold text-neutral-900">{ins.title}</h3>
                <p className="mt-1 text-sm text-neutral-700">{ins.suggestion}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="text-center">
        <button onClick={onRestart} className="btn-secondary">
          ← Run Another Simulation
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({ label, value, range, tone }) {
  const border =
    tone === 'good' ? 'ring-success-200' :
    tone === 'bad' ? 'ring-error-200' :
    tone === 'warn' ? 'ring-warning-200' :
    'ring-neutral-200';

  return (
    <div className={`rounded-xl bg-white p-4 shadow-sm ring-1 ${border}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">{value}</div>
      <div className="mt-1 text-xs text-neutral-500">{range}</div>
    </div>
  );
}

function ConfidenceBadge({ score, label }) {
  const color =
    label === 'high' ? 'text-success-600 ring-success-200 bg-success-50' :
    label === 'medium' ? 'text-warning-600 ring-warning-200 bg-warning-50' :
    'text-error-600 ring-error-200 bg-error-50';

  return (
    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-2 text-lg font-bold ${color}`}>
      {score}
    </div>
  );
}

function FactorGroup({ title, factors, baseLabel }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-neutral-700 mb-2">{title}</h3>
      <p className="text-xs text-neutral-500 mb-2">Result: {baseLabel}</p>
      <ul className="space-y-1.5">
        {factors.map((f, i) => {
          const delta = ((f.multiplier - 1) * 100).toFixed(0);
          const sign = f.multiplier >= 1 ? '+' : '';
          const color = f.multiplier > 1.02 ? 'text-error-600' : f.multiplier < 0.98 ? 'text-success-600' : 'text-neutral-600';
          // For CPM, higher = worse. For CTR/CVR, higher = better. Keep uniform for now.
          return (
            <li key={i} className="flex items-center justify-between text-xs">
              <span className="text-neutral-700">{f.name}</span>
              <span className={`font-medium tabular-nums ${color}`}>
                {sign}{delta}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Formatters ─────────────────────────────────────────────────────────────

function money(n) {
  return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmt(n) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function fmtInt(n) {
  return Math.round(n).toLocaleString();
}
