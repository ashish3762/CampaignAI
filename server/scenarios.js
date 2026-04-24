// Server-side scenario comparison.
//
// Runs the baseline + three what-if variants through analyze() in a single
// request and returns a compact comparison with deltas. This replaces the
// three sequential round-trips the Simulator component was making.

import { analyze } from './analyze.js';

const SCENARIOS = [
  {
    id: 'ctr20',
    label: 'Improve CTR by 20%',
    description: 'Better hooks or creative drive 20% more clicks at the same impressions.',
    transform(input) {
      const m = 1.2;
      return {
        ...input,
        clicks: Math.round(input.clicks * m),
        conversions: Math.round(input.conversions * m),
        revenue: input.revenue * m,
      };
    },
  },
  {
    id: 'cvr20',
    label: 'Improve CVR by 20%',
    description: 'A better landing page or offer lifts conversions 20%.',
    transform(input) {
      const m = 1.2;
      return {
        ...input,
        conversions: Math.round(input.conversions * m),
        revenue: input.revenue * m,
      };
    },
  },
  {
    id: 'budget2x',
    label: 'Increase budget 2x',
    description: 'Double spend at current efficiency (all volumes scale).',
    transform(input) {
      const m = 2;
      return {
        ...input,
        spend: input.spend * m,
        impressions: Math.round(input.impressions * m),
        clicks: Math.round(input.clicks * m),
        conversions: Math.round(input.conversions * m),
        revenue: input.revenue * m,
      };
    },
  },
];

function delta(base, scen) {
  const absolute = +(scen - base).toFixed(4);
  const percent = base === 0 ? 0 : +((scen - base) / base * 100).toFixed(1);
  return { absolute, percent };
}

function pickMetrics(result) {
  const m = result.metrics;
  return { roas: m.roas, cpa: m.cpa, ctr: m.ctr, cvr: m.cvr, cpm: m.cpm };
}

export function runScenarios(input) {
  const baseResult = analyze(input);
  const baseMetrics = pickMetrics(baseResult);

  const scenarios = SCENARIOS.map((s) => {
    const transformed = s.transform(input);
    const result = analyze(transformed);
    const metrics = pickMetrics(result);

    return {
      id: s.id,
      label: s.label,
      description: s.description,
      metrics,
      deltas: {
        roas: delta(baseMetrics.roas, metrics.roas),
        cpa: delta(baseMetrics.cpa, metrics.cpa),
        ctr: delta(baseMetrics.ctr, metrics.ctr),
        cvr: delta(baseMetrics.cvr, metrics.cvr),
        cpm: delta(baseMetrics.cpm, metrics.cpm),
      },
      result,
    };
  });

  return {
    baseline: { metrics: baseMetrics, result: baseResult },
    scenarios,
  };
}
