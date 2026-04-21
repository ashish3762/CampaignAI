const CARDS = [
  { key: 'cpm',  label: 'CPM',  prefix: '$', digits: 2 },
  { key: 'ctr',  label: 'CTR',  suffix: '%', digits: 2 },
  { key: 'cpc',  label: 'CPC',  prefix: '$', digits: 2 },
  { key: 'cvr',  label: 'CVR',  suffix: '%', digits: 2 },
  { key: 'roas', label: 'ROAS', suffix: 'x', digits: 2 },
];

const TONE = {
  good:    'bg-emerald-50 text-emerald-700',
  neutral: 'bg-slate-100 text-slate-600',
  bad:     'bg-rose-50 text-rose-700',
};

// For CPM low = efficient = good. For other metrics, high = good.
function toneFor(key, level) {
  if (!level) return TONE.neutral;
  if (key === 'cpm') {
    if (level === 'low')  return TONE.good;
    if (level === 'high') return TONE.bad;
    return TONE.neutral;
  }
  if (level === 'high') return TONE.good;
  if (level === 'low')  return TONE.bad;
  return TONE.neutral;
}

// Backend biggestIssue string → which metric card to visually elevate.
// Returns an array because "CTR + CVR low" covers two metrics.
function keysForIssue(biggestIssue) {
  if (!biggestIssue) return [];
  const map = {
    'Low CTR':             ['ctr'],
    'Low CVR':             ['cvr'],
    'High CPM':            ['cpm'],
    'CTR + CVR low':       ['ctr', 'cvr'],
    'Weak unit economics': ['roas'],
  };
  return map[biggestIssue] || [];
}

function format(value, { prefix = '', suffix = '', digits = 2 }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${prefix}${n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}${suffix}`;
}

export default function MetricsCards({ metrics, analysis, biggestIssue }) {
  const highlightKeys = keysForIssue(biggestIssue);

  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map(({ key, label, ...fmt }) => {
        const band = analysis[key];
        const highlighted = highlightKeys.includes(key);
        return (
          <div
            key={key}
            className={`relative rounded-xl bg-white p-5 shadow-sm transition ${
              highlighted
                ? 'ring-2 ring-rose-300 shadow-md'
                : 'hover:shadow-md'
            }`}
          >
            {highlighted && (
              <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                Focus
              </span>
            )}
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {format(metrics[key], fmt)}
            </div>
            {band && (
              <div
                className={`mt-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneFor(
                  key,
                  band.level
                )}`}
              >
                {band.label}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
