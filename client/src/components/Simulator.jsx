import { useState } from 'react';

const SCENARIOS = [
  {
    id: 'ctr20',
    label: 'Improve CTR by 20%',
    desc: 'Better hooks or creative drive 20% more clicks at the same impressions.',
  },
  {
    id: 'cvr20',
    label: 'Improve CVR by 20%',
    desc: 'A better landing page or offer lifts conversions 20%.',
  },
  {
    id: 'budget2x',
    label: 'Increase budget 2x',
    desc: 'Double spend at current efficiency (all volumes scale).',
  },
];

function applyScenario(inputs, id) {
  const n = { ...inputs };
  if (id === 'ctr20') {
    const m = 1.2;
    n.clicks = Math.round(inputs.clicks * m);
    n.conversions = Math.round(inputs.conversions * m);
    n.revenue = inputs.revenue * m;
  } else if (id === 'cvr20') {
    const m = 1.2;
    n.conversions = Math.round(inputs.conversions * m);
    n.revenue = inputs.revenue * m;
  } else if (id === 'budget2x') {
    const m = 2;
    n.spend = inputs.spend * m;
    n.impressions = Math.round(inputs.impressions * m);
    n.clicks = Math.round(inputs.clicks * m);
    n.conversions = Math.round(inputs.conversions * m);
    n.revenue = inputs.revenue * m;
  }
  return n;
}

export default function Simulator({ baseInputs, baseResult, runAnalyze }) {
  const [active, setActive] = useState(null);
  const [sim, setSim] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function choose(id) {
    setActive(id);
    setLoading(true);
    setError(null);
    try {
      const next = applyScenario(baseInputs, id);
      const r = await runAnalyze(next);
      setSim({ id, inputs: next, result: r });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setActive(null);
    setSim(null);
    setError(null);
  }

  const currentRoas = Number(baseResult.metrics.roas) || 0;
  const projectedRoas = sim ? Number(sim.result.metrics.roas) || 0 : null;

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Scenario Simulator
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            See how your numbers move if one lever improves.
          </p>
        </div>
        {sim && (
          <button
            onClick={reset}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            Reset
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SCENARIOS.map((s) => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => choose(s.id)}
              disabled={loading}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition disabled:opacity-50 ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="font-medium">{s.label}</div>
              <div
                className={`mt-1 text-xs ${
                  isActive ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {s.desc}
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

      {sim && (
        <div className="mt-6 space-y-5">
          <ProjectedRoas current={currentRoas} projected={projectedRoas} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Compare label="Clicks" before={baseInputs.clicks} after={sim.inputs.clicks} digits={0} />
            <Compare
              label="Conversions"
              before={baseInputs.conversions}
              after={sim.inputs.conversions}
              digits={0}
            />
            <Compare
              label="Revenue"
              before={baseInputs.revenue}
              after={sim.inputs.revenue}
              prefix="$"
              digits={2}
            />
            <Compare
              label="ROAS"
              before={baseResult.metrics.roas}
              after={sim.result.metrics.roas}
              suffix="x"
              digits={2}
            />
          </div>
        </div>
      )}
    </section>
  );
}

// Hero band: "Current ROAS 1.80x → Projected ROAS 2.40x" with a small twin-bar
// visual so users can see the movement at a glance.
function ProjectedRoas({ current, projected }) {
  const diff = projected - current;
  const up = diff > 0.005;
  const down = diff < -0.005;
  const flat = !up && !down;
  const pct = current !== 0 ? (diff / current) * 100 : 0;

  // Scale bars against the larger of the two so the longer bar always fills the track.
  const peak = Math.max(current, projected, 0.001);
  const currentW = Math.max(4, (current / peak) * 100);
  const projW = Math.max(4, (projected / peak) * 100);

  const toneText = up
    ? 'text-emerald-700'
    : down
    ? 'text-rose-700'
    : 'text-slate-500';
  const toneBar = up
    ? 'bg-emerald-500'
    : down
    ? 'bg-rose-500'
    : 'bg-slate-400';

  return (
    <div className="rounded-xl bg-slate-50 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Projected ROAS
        </p>
        {!flat && (
          <span className={`text-xs font-medium ${toneText}`}>
            {up ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-lg font-semibold text-slate-500 line-through decoration-slate-300">
          {current.toFixed(2)}x
        </span>
        <span className="text-slate-400">→</span>
        <span className="text-3xl font-semibold tracking-tight text-slate-900">
          {projected.toFixed(2)}x
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <BarRow label="Current" value={current} widthPct={currentW} barClass="bg-slate-300" />
        <BarRow label="Projected" value={projected} widthPct={projW} barClass={toneBar} />
      </div>
    </div>
  );
}

function BarRow({ label, value, widthPct, barClass }) {
  return (
    <div className="grid grid-cols-[5rem_1fr_3rem] items-center gap-3 text-xs">
      <span className="text-slate-500">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${widthPct}%` }} />
      </div>
      <span className="text-right tabular-nums font-medium text-slate-700">
        {value.toFixed(2)}x
      </span>
    </div>
  );
}

function Compare({ label, before, after, prefix = '', suffix = '', digits = 0 }) {
  const fmt = (n) =>
    `${prefix}${Number(n).toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })}${suffix}`;
  const diff = Number(after) - Number(before);
  const pct = Number(before) !== 0 ? (diff / Number(before)) * 100 : 0;
  const up = diff > 0;
  const flat = Math.abs(diff) < 0.005;

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
        Before
      </div>
      <div className="text-sm text-slate-700">{fmt(before)}</div>
      <div className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
        After
      </div>
      <div className="text-lg font-semibold tracking-tight text-slate-900">
        {fmt(after)}
      </div>
      {!flat && (
        <div
          className={`mt-1 text-xs font-medium ${
            up ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {up ? '▲' : '▼'} {fmt(Math.abs(diff))}
          <span className="ml-1 text-slate-400 font-normal">
            ({up ? '+' : '-'}
            {Math.abs(pct).toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  );
}
