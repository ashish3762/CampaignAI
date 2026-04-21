// Feasibility signal for Planned Campaign Mode.
// Projects whether the planned inputs are likely to perform based on
// two leading indicators: ROAS and CVR.
//
//   ROAS < 2  OR CVR < 2%   → Unlikely to perform  (red)
//   ROAS 2–3  OR CVR 2–3%   → Risky                (yellow)
//   ROAS ≥ 3  AND CVR ≥ 3%  → Feasible             (green)
//
// Whichever rule is most pessimistic wins.

export function getFeasibility(metrics) {
  const roas = Number(metrics?.roas) || 0;
  const cvr = Number(metrics?.cvr) || 0;

  const roasLevel = roas < 2 ? 'unlikely' : roas < 3 ? 'risky' : 'feasible';
  const cvrLevel = cvr < 2 ? 'unlikely' : cvr < 3 ? 'risky' : 'feasible';

  const rank = { unlikely: 0, risky: 1, feasible: 2 };
  const worst = rank[roasLevel] <= rank[cvrLevel] ? roasLevel : cvrLevel;

  const reasons = [];
  if (roas < 2) reasons.push('projected ROAS is below break-even');
  else if (roas < 3) reasons.push('projected ROAS leaves little margin for error');

  if (cvr < 2) reasons.push('projected conversion rate is low');
  else if (cvr < 3) reasons.push('projected conversion rate is only borderline');

  let blurb;
  if (worst === 'unlikely') {
    blurb = reasons.length
      ? `Your ${reasons.join(' and ')}, which may limit campaign success.`
      : 'These inputs suggest the campaign is unlikely to hit its goals.';
  } else if (worst === 'risky') {
    blurb = reasons.length
      ? `Your ${reasons.join(' and ')}. Expect volatile results — validate before scaling.`
      : 'Projections are workable but leave little room for error.';
  } else {
    blurb = 'Projected ROAS and conversion rate are both strong. This campaign is positioned to perform.';
  }

  return { level: worst, blurb, roas, cvr };
}

const THEME = {
  unlikely: {
    label: 'Unlikely to perform',
    icon: '⚠',
    border: 'border-l-rose-500',
    chipBg: 'bg-rose-50',
    chipText: 'text-rose-700',
    chipRing: 'ring-rose-200',
    dot: 'bg-rose-500',
  },
  risky: {
    label: 'Risky',
    icon: '!',
    border: 'border-l-amber-500',
    chipBg: 'bg-amber-50',
    chipText: 'text-amber-700',
    chipRing: 'ring-amber-200',
    dot: 'bg-amber-500',
  },
  feasible: {
    label: 'Feasible',
    icon: '✓',
    border: 'border-l-emerald-500',
    chipBg: 'bg-emerald-50',
    chipText: 'text-emerald-700',
    chipRing: 'ring-emerald-200',
    dot: 'bg-emerald-500',
  },
};

export default function FeasibilityCard({ metrics }) {
  const { level, blurb, roas, cvr } = getFeasibility(metrics);
  const theme = THEME[level];

  return (
    <section
      className={`rounded-xl border-l-4 bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 ${theme.border}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Campaign Feasibility
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${theme.chipBg} ${theme.chipText} ${theme.chipRing}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
              {theme.label}
            </span>
            <span className="text-xs text-slate-400">Based on projected ROAS and CVR</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{blurb}</p>
        </div>

        <dl className="flex shrink-0 gap-6 rounded-lg bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
          <div className="text-right">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Projected ROAS
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900">
              {roas.toFixed(2)}x
            </dd>
          </div>
          <div className="text-right">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Projected CVR
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900">
              {cvr.toFixed(2)}%
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
