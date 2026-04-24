import FeasibilityCard from './FeasibilityCard.jsx';
import Funnel from './Funnel.jsx';
import MetricsCards from './MetricsCards.jsx';
import Simulator from './Simulator.jsx';

export default function Results({ inputs, result, runAnalyze, mode = 'actual' }) {
  const isPlanned = mode === 'planned';

  return (
    <div className="space-y-8">
      {isPlanned && <FeasibilityCard metrics={result.metrics} />}

      <MetricsCards
        metrics={result.metrics}
        analysis={result.analysis}
        biggestIssue={result.biggestIssue}
      />

      <Funnel inputs={inputs} metrics={result.metrics} />

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {isPlanned ? 'Projected Performance Outlook' : 'Performance Summary'}
          </h2>
          {result.benchmarkSource && (
            <BenchmarkBadge source={result.benchmarkSource} values={result.benchmarks} />
          )}
        </div>
        <p className="mt-2 text-lg leading-relaxed text-neutral-900">
          {isPlanned ? toPredictiveTone(result.summary) : result.summary}
        </p>
        {Number.isFinite(result.moneyImpact) && Math.abs(result.moneyImpact) >= 1 && (
          <MoneyImpact value={result.moneyImpact} planned={isPlanned} />
        )}
        <ConfidenceLine planned={isPlanned} />
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Panel title={isPlanned ? 'Likely risks' : "What's going wrong"}>
          {result.issues.length === 0 ? (
            <p className="text-sm text-slate-500">
              {isPlanned
                ? 'No major red flags in the projected inputs.'
                : 'No major issues detected. Keep scaling what\'s working.'}
            </p>
          ) : (
            <List
              items={isPlanned ? result.issues.map(toPredictiveTone) : result.issues}
              dotClass="bg-warning-500"
            />
          )}
        </Panel>
        <Panel title={isPlanned ? 'Before you launch' : 'What you should do'}>
          <List
            items={isPlanned ? plannedRecommendations(result) : result.recommendations}
            dotClass="bg-success-500"
          />
        </Panel>
      </div>

      {isPlanned && (
        <p className="text-center text-xs text-neutral-500">
          Insights are based on projected inputs and may not reflect real campaign performance.
        </p>
      )}

      <Simulator baseInputs={inputs} baseResult={result} runAnalyze={runAnalyze} />
    </div>
  );
}

// Soften declarative phrasing into predictive phrasing for Planned mode.
// Conservative: only swap obvious tense/certainty words, leave numbers alone.
function toPredictiveTone(text) {
  if (!text) return text;
  return text
    .replace(/\bis\b/gi, 'may be')
    .replace(/\bare\b/gi, 'may be')
    .replace(/\bwas\b/gi, 'could be')
    .replace(/\bwere\b/gi, 'could be')
    .replace(/\bwill\b/gi, 'could')
    .replace(/\byour campaign\b/gi, 'this campaign')
    .replace(/\byou('re| are)\b/gi, 'you may be');
}

// Forward-looking recommendations for the planning phase.
function plannedRecommendations(result) {
  const base = [
    'Validate these projections with a small pilot budget before scaling.',
    'Prepare stronger creative variants to have ready if CTR underperforms.',
    'Confirm landing page conversion readiness — weak CVR caps every downstream metric.',
  ];
  // Fold in 2 of the existing recs, softened, so platform/industry-specific advice still shows.
  const extra = (result.recommendations || []).slice(0, 2).map(toPredictiveTone);
  return [...base, ...extra];
}

function ConfidenceLine({ planned }) {
  const text = planned
    ? 'Confidence: Medium — based on projected inputs.'
    : 'Confidence: High — based on real campaign data.';
  const tone = planned ? 'text-warning-700' : 'text-success-700';
  return (
    <p className={`mt-3 text-xs font-medium ${tone}`}>{text}</p>
  );
}

function Panel({ title, children }) {
  return (
    <section className="card">
      <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MoneyImpact({ value, planned }) {
  const behind = value < 0;
  const money = Math.abs(value).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  let msg;
  if (planned) {
    msg = behind
      ? `At these projections, you could leave around ${money} of revenue on the table versus benchmark.`
      : `At these projections, you could earn around ${money} of extra revenue above benchmark.`;
  } else {
    msg = behind
      ? `That's ${money} of revenue left on the table at your current spend.`
      : `That's ${money} of extra revenue above the benchmark at your current spend.`;
  }

  return (
    <p className={`mt-2 text-sm ${behind ? 'text-error-700' : 'text-success-700'}`}>
      {msg}
    </p>
  );
}

function BenchmarkBadge({ source, values }) {
  const label = source === 'Cross-industry default' ? 'Cross-industry default' : `${source} benchmarks`;
  return (
    <div className="group relative">
      <span className="inline-flex cursor-default items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 ring-1 ring-neutral-200">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
        {label}
      </span>
      <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-56 rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100 opacity-0 shadow-lg ring-1 ring-neutral-800 transition group-hover:opacity-100">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
          Benchmarks used
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
          <dt className="text-neutral-400">CTR</dt>
          <dd className="text-right font-medium">{values.ctr.toFixed(1)}%</dd>
          <dt className="text-neutral-400">CVR</dt>
          <dd className="text-right font-medium">{values.cvr.toFixed(1)}%</dd>
          <dt className="text-neutral-400">CPM</dt>
          <dd className="text-right font-medium">${values.cpm.toFixed(0)}</dd>
          <dt className="text-neutral-400">ROAS</dt>
          <dd className="text-right font-medium">{values.roas.toFixed(1)}x</dd>
        </dl>
      </div>
    </div>
  );
}

function List({ items, dotClass }) {
  return (
    <ul className="space-y-2.5">
      {items.map((text, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-neutral-700">
          <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotClass}`} />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}
