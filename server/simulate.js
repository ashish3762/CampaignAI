// Campaign simulation engine.
//
// Takes campaign-planning inputs (budget, audience, creative scores, landing
// page quality, placements) and PREDICTS performance metrics using benchmark
// data and multiplicative factor models.
//
// This is distinct from analyze.js which evaluates ACTUAL campaign data.

// ─── Benchmarks ─────────────────────────────────────────────────────────────
// Industry × Geo → CPM / CTR / CVR ranges.
// Ranges are { min, max }; the midpoint is the "expected" value.

const BENCHMARK_DATA = [
  { industry: 'E-commerce', geo: 'US',    cpm: { min: 8, max: 14 },  ctr: { min: 0.8, max: 1.6 },  cvr: { min: 1.5, max: 3.5 } },
  { industry: 'E-commerce', geo: 'India', cpm: { min: 2, max: 5 },   ctr: { min: 0.6, max: 1.4 },  cvr: { min: 1.0, max: 2.8 } },
  { industry: 'SaaS',       geo: 'US',    cpm: { min: 15, max: 28 }, ctr: { min: 0.5, max: 1.2 },  cvr: { min: 1.0, max: 3.0 } },
  { industry: 'SaaS',       geo: 'India', cpm: { min: 4, max: 10 },  ctr: { min: 0.4, max: 1.0 },  cvr: { min: 0.8, max: 2.5 } },
  { industry: 'Finance',    geo: 'US',    cpm: { min: 18, max: 35 }, ctr: { min: 0.4, max: 1.0 },  cvr: { min: 0.8, max: 2.5 } },
  { industry: 'Finance',    geo: 'India', cpm: { min: 5, max: 12 },  ctr: { min: 0.3, max: 0.9 },  cvr: { min: 0.6, max: 2.0 } },
  { industry: 'Education',  geo: 'US',    cpm: { min: 6, max: 12 },  ctr: { min: 0.6, max: 1.4 },  cvr: { min: 1.2, max: 3.0 } },
  { industry: 'Education',  geo: 'India', cpm: { min: 1.5, max: 4 }, ctr: { min: 0.5, max: 1.2 },  cvr: { min: 1.0, max: 2.5 } },
  { industry: 'Health',     geo: 'US',    cpm: { min: 10, max: 20 }, ctr: { min: 0.5, max: 1.3 },  cvr: { min: 1.0, max: 2.8 } },
  { industry: 'Health',     geo: 'India', cpm: { min: 3, max: 8 },   ctr: { min: 0.4, max: 1.1 },  cvr: { min: 0.8, max: 2.3 } },
  { industry: 'Gaming',     geo: 'US',    cpm: { min: 5, max: 11 },  ctr: { min: 1.0, max: 2.0 },  cvr: { min: 0.8, max: 2.0 } },
  { industry: 'Gaming',     geo: 'India', cpm: { min: 1.5, max: 4 }, ctr: { min: 0.8, max: 1.8 },  cvr: { min: 0.6, max: 1.5 } },
  { industry: 'Travel',     geo: 'US',    cpm: { min: 7, max: 15 },  ctr: { min: 0.7, max: 1.5 },  cvr: { min: 1.0, max: 2.5 } },
  { industry: 'Travel',     geo: 'India', cpm: { min: 2, max: 6 },   ctr: { min: 0.5, max: 1.3 },  cvr: { min: 0.8, max: 2.0 } },
];

function getBenchmark(industry, geo) {
  const match = BENCHMARK_DATA.find(
    (b) => b.industry === industry && b.geo === geo
  );
  if (!match) {
    throw new Error(`No benchmark for industry="${industry}", geo="${geo}"`);
  }
  return match;
}

function mid(range) {
  return (range.min + range.max) / 2;
}

// ─── CPM Calculator ─────────────────────────────────────────────────────────

const AUDIENCE_TIERS = [
  { max: 50_000,    mult: 1.35, label: 'very narrow' },
  { max: 200_000,   mult: 1.15, label: 'narrow' },
  { max: 1_000_000, mult: 1.00, label: 'medium' },
  { max: 5_000_000, mult: 0.95, label: 'broad' },
  { max: Infinity,   mult: 0.90, label: 'mass' },
];

const COMPETITION_MULT = { low: 0.88, medium: 1.0, high: 1.18, very_high: 1.40 };

const PLACEMENT_MULT = {
  feed: 1.05, reels: 0.85, stories: 0.88, in_stream: 1.15,
  audience_network: 0.75, right_column: 0.70, search: 1.20,
};

function audienceFactor(size) {
  const tier = AUDIENCE_TIERS.find((t) => size <= t.max);
  return { name: 'Audience size', multiplier: tier.mult, note: `${tier.label} audience (${size.toLocaleString()})` };
}

function competitionFactor(level) {
  const m = COMPETITION_MULT[level] ?? 1;
  return { name: 'Competition', multiplier: m, note: `${level} competition` };
}

function placementFactor(placements) {
  const totalWeight = placements.reduce((s, p) => s + p.weight, 0);
  if (totalWeight <= 0) return { name: 'Placements', multiplier: 1, note: 'default' };
  const weighted = placements.reduce(
    (s, p) => s + (PLACEMENT_MULT[p.placement] ?? 1) * p.weight,
    0
  );
  const m = weighted / totalWeight;
  const labels = placements.map((p) => p.placement).join(', ');
  return { name: 'Placements', multiplier: +m.toFixed(4), note: labels };
}

function calculateCPM(benchmark, input) {
  const base = mid(benchmark.cpm);
  const factors = [
    audienceFactor(input.audienceSize),
    competitionFactor(input.competition),
    placementFactor(input.placements),
  ];
  const combined = factors.reduce((acc, f) => acc * f.multiplier, 1);
  const expected = +(base * combined).toFixed(2);
  const low = +(benchmark.cpm.min * combined).toFixed(2);
  const high = +(benchmark.cpm.max * combined).toFixed(2);
  return { low, expected, high, currency: 'USD', factors };
}

// ─── CTR Calculator ─────────────────────────────────────────────────────────

const CREATIVE_WEIGHTS = { hook: 0.35, visual: 0.25, offerClarity: 0.20, ctaClarity: 0.20 };
const FORMAT_MULT = { video: 1.25, carousel: 1.15, image: 1.0, text: 0.80 };

function creativeFactor(scores) {
  const composite =
    scores.hook * CREATIVE_WEIGHTS.hook +
    scores.visual * CREATIVE_WEIGHTS.visual +
    scores.offerClarity * CREATIVE_WEIGHTS.offerClarity +
    scores.ctaClarity * CREATIVE_WEIGHTS.ctaClarity;
  const m = Math.max(0.55, Math.min(1.55, 1 + (composite - 50) * 0.01));
  return { name: 'Creative quality', multiplier: +m.toFixed(4), note: `composite ${composite.toFixed(0)}/100` };
}

function formatFactor(format) {
  const m = FORMAT_MULT[format] ?? 1;
  return { name: 'Ad format', multiplier: m, note: format };
}

function calculateCTR(benchmark, input) {
  const base = mid(benchmark.ctr);
  const factors = [creativeFactor(input.creative), formatFactor(input.format)];
  const combined = factors.reduce((acc, f) => acc * f.multiplier, 1);
  const expected = +(base * combined).toFixed(4);
  const low = +(benchmark.ctr.min * combined).toFixed(4);
  const high = +(benchmark.ctr.max * combined).toFixed(4);
  return { low, expected, high, factors };
}

// ─── CVR Calculator ─────────────────────────────────────────────────────────

const QUALITY_WEIGHTS = { messageMatch: 0.35, trustSignals: 0.25, speed: 0.25, mobileFriendliness: 0.15 };

function qualityFactor(lp) {
  const composite =
    lp.messageMatch * QUALITY_WEIGHTS.messageMatch +
    lp.trustSignals * QUALITY_WEIGHTS.trustSignals +
    lp.speed * QUALITY_WEIGHTS.speed +
    lp.mobileFriendliness * QUALITY_WEIGHTS.mobileFriendliness;
  const m = Math.max(0.55, Math.min(1.50, 1 + (composite - 50) * 0.012));
  return { name: 'Landing page quality', multiplier: +m.toFixed(4), note: `composite ${composite.toFixed(0)}/100` };
}

function frictionFactor(friction) {
  const penalty = Math.pow(friction / 100, 1.3) * 0.75;
  const m = Math.max(0.25, +(1 - penalty).toFixed(4));
  return { name: 'Friction', multiplier: m, note: `friction score ${friction}/100` };
}

function calculateCVR(benchmark, input) {
  const base = mid(benchmark.cvr);
  const factors = [qualityFactor(input.landingPage), frictionFactor(input.landingPage.friction)];
  const combined = factors.reduce((acc, f) => acc * f.multiplier, 1);
  const expected = +(base * combined).toFixed(4);
  const low = +(benchmark.cvr.min * combined).toFixed(4);
  const high = +(benchmark.cvr.max * combined).toFixed(4);
  return { low, expected, high, factors };
}

// ─── Funnel Calculator ──────────────────────────────────────────────────────

function calculateFunnel(budget, cpm, ctr, cvr, aov) {
  const PERCENT = 100;

  const impExp = cpm.expected > 0 ? (budget / cpm.expected) * 1000 : 0;
  const impLow = cpm.high > 0 ? (budget / cpm.high) * 1000 : 0;   // inverted
  const impHigh = cpm.low > 0 ? (budget / cpm.low) * 1000 : 0;

  const clickExp = impExp * (ctr.expected / PERCENT);
  const clickLow = impLow * (ctr.low / PERCENT);
  const clickHigh = impHigh * (ctr.high / PERCENT);

  const convExp = clickExp * (cvr.expected / PERCENT);
  const convLow = clickLow * (cvr.low / PERCENT);
  const convHigh = clickHigh * (cvr.high / PERCENT);

  const revExp = convExp * aov;
  const revLow = convLow * aov;
  const revHigh = convHigh * aov;

  const safe = (a, b) => (b > 0 && Number.isFinite(b) ? a / b : 0);
  const r = (n, d = 2) => Number.isFinite(n) ? +n.toFixed(d) : 0;

  return {
    metrics: {
      impressions: Math.round(impExp),
      clicks: Math.round(clickExp),
      conversions: r(convExp, 1),
      spend: r(budget, 2),
      revenue: r(revExp, 2),
      roas: r(safe(revExp, budget), 2),
      cpa: r(safe(budget, convExp), 2),
    },
    ranges: {
      impressions: { low: Math.round(impLow), high: Math.round(impHigh) },
      clicks: { low: Math.round(clickLow), high: Math.round(clickHigh) },
      conversions: { low: r(convLow, 1), high: r(convHigh, 1) },
      revenue: { low: r(revLow, 2), high: r(revHigh, 2) },
      roas: { low: r(safe(revLow, budget), 2), high: r(safe(revHigh, budget), 2) },
      cpa: { low: r(safe(budget, convHigh), 2), high: r(safe(budget, convLow), 2) },
    },
  };
}

// ─── Confidence Scorer ──────────────────────────────────────────────────────

function scoreConfidence(input, benchmark) {
  const reasons = [];
  let total = 0;

  // Benchmark fit (35%)
  const fitScore = benchmark ? 85 : 40;
  total += fitScore * 0.35;
  reasons.push({ factor: 'Benchmark fit', score: fitScore, note: benchmark ? 'Industry × geo benchmark found' : 'No exact benchmark' });

  // Completeness (40%)
  const optional = ['durationDays'];
  const filled = optional.filter((f) => input[f] != null).length;
  const compScore = 70 + (filled / optional.length) * 30;
  total += compScore * 0.40;
  reasons.push({ factor: 'Completeness', score: Math.round(compScore), note: `${filled + 6} of ${7 + optional.length} fields provided` });

  // Assumptions (25%)
  const assumptionScore = input.placements?.length >= 2 ? 80 : 60;
  total += assumptionScore * 0.25;
  reasons.push({ factor: 'Assumptions', score: assumptionScore, note: input.placements?.length >= 2 ? 'Multi-placement reduces assumption risk' : 'Single placement — higher assumption risk' });

  const score = Math.round(total);
  const label = score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low';
  return { score, label, reasons };
}

// ─── Funnel Stages (for visualization) ──────────────────────────────────────

function buildStages(funnel) {
  const { impressions, clicks, conversions } = funnel.metrics;
  const safe = (a, b) => (b > 0 ? +(a / b).toFixed(4) : 0);
  return [
    { name: 'Impressions', count: impressions, conversionRate: 1 },
    { name: 'Clicks', count: clicks, conversionRate: safe(clicks, impressions) },
    { name: 'Conversions', count: conversions, conversionRate: safe(conversions, clicks) },
  ];
}

// ─── Insights Generator ─────────────────────────────────────────────────────

function generateInsights(output) {
  const insights = [];
  const { roas, cpa } = output.funnel.metrics;

  if (roas < 1) {
    insights.push({
      title: 'Projected to lose money',
      impact: 'high',
      suggestion: `Expected ROAS is ${roas.toFixed(2)}× — below breakeven. Tighten the weakest funnel stage, raise AOV, or reduce CPM.`,
    });
  } else if (roas >= 3) {
    insights.push({
      title: 'Strong projected ROAS — candidate for scale',
      impact: 'positive',
      suggestion: `Expected ROAS is ${roas.toFixed(2)}×. Consider a staged 20–30% budget increase.`,
    });
  }

  // Creative quality
  const creativeMult = output.ctr.factors.find((f) => f.name === 'Creative quality');
  if (creativeMult && creativeMult.multiplier < 0.9) {
    insights.push({
      title: 'Weak creative is dragging down CTR',
      impact: 'high',
      suggestion: `Creative multiplier is ${creativeMult.multiplier.toFixed(2)}×. Focus on hook and visual scores — these carry 60% of the weight.`,
    });
  }

  // Friction
  const frictionMult = output.cvr.factors.find((f) => f.name === 'Friction');
  if (frictionMult && frictionMult.multiplier < 0.6) {
    insights.push({
      title: 'High friction is killing conversions',
      impact: 'high',
      suggestion: `Friction penalty is ${frictionMult.multiplier.toFixed(2)}×. Simplify the landing page: fewer form fields, clear CTA, remove distractions.`,
    });
  }

  // Wide ROAS range
  const { low, high } = output.funnel.ranges.roas;
  if (roas >= 1 && high - low > 2.5 && low < 1) {
    insights.push({
      title: 'Wide outcome range — downside includes losses',
      impact: 'medium',
      suggestion: `ROAS range: ${low.toFixed(2)}× – ${high.toFixed(2)}×. Start with a test budget to validate before committing full spend.`,
    });
  }

  return insights;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export function simulate(input) {
  const benchmark = getBenchmark(input.industry, input.geo);

  const cpm = calculateCPM(benchmark, input);
  const ctr = calculateCTR(benchmark, input);
  const cvr = calculateCVR(benchmark, input);
  const funnel = calculateFunnel(input.budget, cpm, ctr, cvr, input.averageOrderValue);
  const confidence = scoreConfidence(input, benchmark);
  const funnelStages = buildStages(funnel);
  const insights = generateInsights({ cpm, ctr, cvr, funnel });

  return {
    campaignId: input.campaignId,
    name: input.name,
    cpm,
    ctr,
    cvr,
    funnel,
    funnelStages,
    confidence,
    insights,
  };
}
