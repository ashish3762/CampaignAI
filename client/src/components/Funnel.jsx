// Funnel visual — Impressions → Clicks → Conversions.
// Horizontal bars with drop-off callouts between stages so the bottleneck is
// obvious at a glance. Bars use a sqrt-compressed scale so even a 1% stage
// stays readable against the 100% top-of-funnel bar.

function compact(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function pct(num, denom) {
  const n = Number(num);
  const d = Number(denom);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return 0;
  return (n / d) * 100;
}

function widthFor(absolutePct) {
  const p = Math.max(0, Math.min(100, absolutePct));
  return Math.sqrt(p / 100) * 100;
}

export default function Funnel({ inputs, metrics }) {
  const impressions = Number(inputs.impressions) || 0;
  const clicks = Number(inputs.clicks) || 0;
  const conversions = Number(inputs.conversions) || 0;

  const ctr = Number(metrics.ctr);
  const cvr = Number(metrics.cvr);
  const overall = pct(conversions, impressions);

  // Drops between consecutive stages (as percentages of the upstream stage).
  const dropImpToClicks = 100 - (Number.isFinite(ctr) ? ctr : pct(clicks, impressions));
  const dropClicksToConv = 100 - (Number.isFinite(cvr) ? cvr : pct(conversions, clicks));

  const stages = [
    {
      key: 'impressions',
      label: 'Impressions',
      value: impressions,
      subLabel: 'Top of funnel',
      absolutePct: 100,
      fill: 'bg-slate-500',
    },
    {
      key: 'clicks',
      label: 'Clicks',
      value: clicks,
      subLabel: `${Number.isFinite(ctr) ? ctr.toFixed(2) : '0.00'}% CTR from impressions`,
      absolutePct: pct(clicks, impressions),
      fill: 'bg-blue-500',
    },
    {
      key: 'conversions',
      label: 'Conversions',
      value: conversions,
      subLabel: `${Number.isFinite(cvr) ? cvr.toFixed(2) : '0.00'}% CVR from clicks`,
      absolutePct: overall,
      fill: 'bg-emerald-500',
    },
  ];

  // Pick the worse drop-off and highlight it.
  const ctrPenalty = Math.max(0, 1 - (ctr || 0) / 1);
  const cvrPenalty = Math.max(0, 1 - (cvr || 0) / 2);
  const bottleneck =
    ctrPenalty === 0 && cvrPenalty === 0
      ? null
      : ctrPenalty >= cvrPenalty
      ? 'clicks'
      : 'conversions';

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Funnel
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Where traffic drops off between impression and conversion.
          </p>
        </div>
        {bottleneck && (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Bottleneck at {bottleneck === 'clicks' ? 'Clicks' : 'Conversions'}
          </span>
        )}
      </div>

      <div className="mt-6 space-y-1">
        <Stage {...stages[0]} />
        <DropStep
          percent={dropImpToClicks}
          highlight={bottleneck === 'clicks'}
        />
        <Stage {...stages[1]} />
        <DropStep
          percent={dropClicksToConv}
          highlight={bottleneck === 'conversions'}
        />
        <Stage {...stages[2]} />
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Overall: <span className="font-medium text-slate-700">{overall.toFixed(2)}%</span> of
        impressions become conversions.
      </p>
    </section>
  );
}

function Stage({ label, value, subLabel, absolutePct, fill }) {
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <div className="font-medium text-slate-800">{label}</div>
        <div className="tabular-nums font-semibold text-slate-900">
          {compact(value)}
        </div>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${widthFor(absolutePct)}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-slate-500">{subLabel}</div>
    </div>
  );
}

function DropStep({ percent, highlight }) {
  const safe = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const toneText = highlight ? 'text-amber-700' : 'text-slate-500';
  const toneBg = highlight ? 'bg-amber-50 ring-amber-200' : 'bg-slate-50 ring-slate-200';

  return (
    <div className="flex items-center gap-3 py-1 pl-3">
      <span className="text-slate-300" aria-hidden>
        ↓
      </span>
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${toneBg} ${toneText}`}
      >
        {safe.toFixed(1)}% drop
      </span>
    </div>
  );
}
