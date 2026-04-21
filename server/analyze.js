// Per-platform benchmarks. Numbers are drawn from WordStream 2024 reports
// and widely cited industry rules-of-thumb. Treat them as reasonable defaults,
// not statistically rigorous. Edit with your own data when available.
const BENCHMARKS = {
  default: { ctr: 1.0, cvr: 2.5, cpm: 12.0, roas: 3.0 },
  Meta:    { ctr: 1.1, cvr: 1.8, cpm: 11.0, roas: 2.5 },
  Google:  { ctr: 3.0, cvr: 4.0, cpm:  8.0, roas: 3.5 },
  TikTok:  { ctr: 1.5, cvr: 1.5, cpm:  7.0, roas: 2.0 },
};

// Band widths as ratios of the platform's benchmark. Asymmetric on purpose —
// beating the benchmark has a higher bar than missing it on effort-driven
// metrics (CVR, ROAS) where moving the number up is harder.
const BAND_RATIOS = {
  ctr:  { low: 0.8,  high: 1.2  },
  cvr:  { low: 0.8,  high: 1.4  },
  cpm:  { low: 0.67, high: 1.25 }, // CPM flipped: "low" = efficient (good)
  roas: { low: 0.67, high: 1.17 },
};

const LABELS = {
  ctr:  { low: 'Low CTR', avg: 'Average CTR', high: 'Strong CTR' },
  cvr:  { low: 'Low conversion rate', avg: 'Average conversion rate', high: 'Strong conversion rate' },
  cpm:  { low: 'Efficient CPM', avg: 'Normal CPM', high: 'High CPM' },
  roas: { low: 'Unprofitable', avg: 'Break-even to moderate', high: 'Profitable' },
};

const safeDiv = (a, b) => (b > 0 ? a / b : 0);

function validate(input) {
  const required = ['spend', 'impressions', 'clicks', 'conversions', 'revenue'];
  for (const f of required) {
    const v = Number(input[f]);
    if (!Number.isFinite(v) || v < 0) {
      throw new Error(`Invalid value for ${f}`);
    }
  }
  if (Number(input.clicks) > Number(input.impressions)) {
    throw new Error('Clicks cannot exceed impressions');
  }
  if (Number(input.conversions) > Number(input.clicks)) {
    throw new Error('Conversions cannot exceed clicks');
  }
}

function computeMetrics(input) {
  const spend = Number(input.spend);
  const impressions = Number(input.impressions);
  const clicks = Number(input.clicks);
  const conversions = Number(input.conversions);
  const revenue = Number(input.revenue);

  return {
    cpm: safeDiv(spend, impressions) * 1000,
    ctr: safeDiv(clicks, impressions) * 100,
    cpc: safeDiv(spend, clicks),
    cvr: safeDiv(conversions, clicks) * 100,
    roas: safeDiv(revenue, spend),
    cpa: safeDiv(spend, conversions),
    aov: safeDiv(revenue, conversions),
  };
}

function resolveBenchmarks(platform) {
  if (platform && BENCHMARKS[platform]) {
    return { source: platform, values: BENCHMARKS[platform] };
  }
  return { source: 'Cross-industry default', values: BENCHMARKS.default };
}

function bandFor(metric, value, benchmark) {
  const { low, high } = BAND_RATIOS[metric];
  const loBound = benchmark * low;
  const hiBound = benchmark * high;
  if (metric === 'cpm') {
    if (value > hiBound) return 'high';
    if (value >= loBound) return 'avg';
    return 'low';
  }
  if (value < loBound) return 'low';
  if (value <= hiBound) return 'avg';
  return 'high';
}

function bandAll(metrics, benchmarks) {
  const bands = {};
  for (const key of ['ctr', 'cvr', 'cpm', 'roas']) {
    const level = bandFor(key, metrics[key], benchmarks[key]);
    bands[key] = { level, label: LABELS[key][level] };
  }
  return bands;
}

function computeGaps(metrics, benchmarks) {
  return {
    ctr:  (metrics.ctr  - benchmarks.ctr)  / benchmarks.ctr  * 100,
    cvr:  (metrics.cvr  - benchmarks.cvr)  / benchmarks.cvr  * 100,
    cpm:  (benchmarks.cpm - metrics.cpm) / benchmarks.cpm * 100, // flipped: + = good
    roas: (metrics.roas - benchmarks.roas) / benchmarks.roas * 100,
  };
}

// ---------------------------------------------------------------------------
// Pattern-based diagnosis & recommendations
//
// Each pattern function takes the full analytical context and returns:
//   { diagnosis: string[], recommendations: string[], pattern: string }
//
// Patterns are ordered in detectPattern() by specificity — the most
// diagnostic combination wins. Every string is quantified with the actual
// numbers so the marketer reads their own campaign, not a template.
// ---------------------------------------------------------------------------

const nf = (n, d = 2) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (n, d = 2) => `$${nf(n, d)}`;
const pctAbs = (n) => `${Math.abs(n).toFixed(0)}%`;

function benchLabel(source) {
  return source === 'Cross-industry default' ? 'cross-industry' : source;
}

function creativeBottleneck(ctx) {
  const { m, g, b, benchmarks, platform, source } = ctx;
  const diagnosis = [
    `CTR of ${nf(m.ctr)}% runs ${pctAbs(g.ctr)} below the ${benchLabel(source)} benchmark of ${nf(benchmarks.ctr, 1)}%. CVR is holding at ${nf(m.cvr)}%, so the funnel breaks before the click — creative isn't earning the stop.`,
  ];
  if (b.cpm !== 'high') {
    diagnosis.push(
      `CPM of ${money(m.cpm)} is within tolerance, so you're not overpaying for reach. Targeting isn't the problem — the hooks are.`
    );
  }

  const recs = [
    'Ship 5–8 new creative concepts this week. At this CTR gap, small iterations won\'t close it — you need new angles, not tweaks.',
    'Front-load the outcome in the first 2 seconds. Brand logos, polished intros, and "we\'re excited to…" openings bleed scroll-stops.',
    'Kill any creative under 0.5% CTR after 10k impressions. Testing only works if you cut losers aggressively.',
  ];
  if (platform === 'TikTok') {
    recs.push('Switch to raw UGC. Polished brand content underperforms creator-style content 2–3x on TikTok CTR.');
  } else if (platform === 'Meta') {
    recs.push('Turn on Advantage+ Creative so Meta auto-varies winning formats across placements.');
  } else if (platform === 'Google') {
    recs.push('On Search: rewrite H1 headlines around the benefit + verb CTA. On Display: lead with a face or a specific number.');
  } else {
    recs.push('Run a 3-day hook test: same audience, same offer, 5 different opening frames. Pick the winner by scroll-stop rate, not by CPA.');
  }

  return { diagnosis, recommendations: recs.slice(0, 5), pattern: 'creative_bottleneck' };
}

function postClickBottleneck(ctx) {
  const { m, g, benchmarks, source } = ctx;
  const dropOff = (100 - m.cvr).toFixed(1);
  const diagnosis = [
    `CTR of ${nf(m.ctr)}% is ${g.ctr >= 0 ? `${pctAbs(g.ctr)} above` : `${pctAbs(g.ctr)} below`} the ${benchLabel(source)} benchmark, but CVR of ${nf(m.cvr)}% drops ${dropOff}% of clicks before they convert. This is a post-click problem — landing page, offer, or checkout.`,
  ];
  if (m.cpa > 0 && m.aov > 0) {
    diagnosis.push(
      `At ${money(m.cpa)} CPA against ${money(m.aov)} AOV, every point of CVR you lose compounds against ROAS before media spend can save the math.`
    );
  }

  const recs = [
    'Watch session replays (Hotjar / Microsoft Clarity) on 50 drop-offs. You\'ll find the friction point faster than any A/B test.',
    'Strip the landing page: one CTA above the fold, no nav, no secondary offer. Add nav back only after CVR recovers.',
    'Measure LP load time — anything above 2.5s is silently bleeding mobile conversions. Fix Core Web Vitals before copy.',
    'Add three trust signals within eye-line of the CTA: review stars, recognizable logos, or a specific number ("4,218 shipped this month").',
    'Test a lighter first-touch offer (quiz, sample, free shipping threshold) to rescue users who aren\'t ready to buy at full price.',
  ];

  return { diagnosis, recommendations: recs.slice(0, 5), pattern: 'post_click_bottleneck' };
}

function targetingMismatch(ctx) {
  const { m, g, benchmarks, platform, source } = ctx;
  const diagnosis = [
    `CPM of ${money(m.cpm)} is ${pctAbs(g.cpm)} above the ${benchLabel(source)} benchmark of ${money(benchmarks.cpm, 0)}, and CTR is only ${nf(m.ctr)}%. You're paying a premium to reach users who don't want the product — classic targeting mismatch.`,
  ];

  const recs = [
    'Narrow the audience. Broad targeting at these CPMs compounds the cost of every bad impression.',
    'Exclude existing customers and recent converters from prospecting sets — they inflate CPM without adding new demand.',
    'Audit audience overlap across active ad sets. Competing against yourself in the auction is the silent CPM killer.',
  ];
  if (platform === 'Meta') {
    recs.push('Tighten to a 1% lookalike from recent high-LTV customers. The 5% LL is usually noise at these CPMs.');
  } else if (platform === 'Google') {
    recs.push('Pull the search terms report; high CPM often hides broad-match bleed. Add aggressive negatives and review match types.');
  } else if (platform === 'TikTok') {
    recs.push('Pull back on broad interest targeting; hashtag + creator affinity usually outperforms demographic stacks on TikTok.');
  }
  recs.push('Move 20% of prospecting spend to retargeting until CPM normalizes — warm audiences absorb waste better than cold.');

  return { diagnosis, recommendations: recs.slice(0, 5), pattern: 'targeting_mismatch' };
}

function fullFunnelBreak(ctx) {
  const { m, g, platform } = ctx;
  const diagnosis = [
    `Both CTR (${nf(m.ctr)}%, ${pctAbs(g.ctr)} below benchmark) and CVR (${nf(m.cvr)}%, ${pctAbs(g.cvr)} below benchmark) are underperforming. The funnel leaks at both stages — fixing just one won't move ROAS.`,
    `Sequence matters: fix CVR first. Doubling CTR on a broken landing page just buys more wasted clicks at your current ${money(m.cpc)} CPC.`,
  ];

  const recs = [
    'Triage CVR first. Get LP load under 2.5s, cut the form in half, add three trust signals. Give it a full week before judging.',
    'Parallel-track creative: ship 5 new variants with clearer value-prop copy while you\'re fixing post-click.',
    'Pause the bottom 30% of creatives and audiences now. You\'re spending into a leaky bucket — shrink the bucket first.',
    'Set a ROAS floor (e.g. 1.5x) and auto-pause ad sets below it while you rebuild. Protects budget from the learning phase.',
  ];
  if (platform === 'Meta') {
    recs.push('Consolidate into fewer, higher-budget ad sets. Fragmented spend starves the algorithm of learning signal and amplifies both CTR and CVR noise.');
  }

  return { diagnosis, recommendations: recs.slice(0, 5), pattern: 'full_funnel_break' };
}

function economicsProblem(ctx) {
  const { m, g, source } = ctx;
  const diagnosis = [
    `Acquisition looks efficient — CTR ${nf(m.ctr)}% and CVR ${nf(m.cvr)}% are both in range — but ROAS of ${nf(m.roas)}x is ${pctAbs(g.roas)} below the ${benchLabel(source)} benchmark. This is a unit-economics problem, not a media problem.`,
    `At ${money(m.cpa)} CPA against ${money(m.aov)} AOV, each converter costs more than they return on first purchase. Media tuning can't fix an AOV or margin gap.`,
  ];

  const recs = [
    'Raise AOV: bundle, add post-purchase upsells, or remove the cheapest SKU from ad landing pages.',
    'Check 60-day LTV against CPA. If repeat rate is strong, ROAS around 2x on day-one can still be profitable — you may be optimizing against the wrong target.',
    'Test a premium or higher-margin SKU as the hero product. You don\'t have a traffic problem; you have a basket problem.',
    'Audit attribution: if you\'re on 1-day click, you\'re understating revenue. Move to 7-day click for a truer ROAS read.',
    'Kill discount codes in ad copy. They train the audience on price and cap AOV permanently.',
  ];

  return { diagnosis, recommendations: recs.slice(0, 5), pattern: 'economics_problem' };
}

function profitable(ctx) {
  const { m, g, source } = ctx;
  const diagnosis = [
    `ROAS of ${nf(m.roas)}x beats the ${benchLabel(source)} benchmark by ${pctAbs(g.roas)}. The funnel is working end-to-end; the risk from here is scale decay, not efficiency.`,
  ];

  const recs = [
    'Scale spend in 20% increments every 3–4 days. Doubling budget at these margins usually cracks CPM and frequency before it cracks ROAS.',
    'Duplicate winning ad sets into adjacent audiences rather than raising their budget — preserves the learning phase across new pockets.',
    'Build a creative pipeline: 3–5 new concepts per week. Top creative fatigues in 10–14 days at scale, and you\'ll feel it before the data shows it.',
    'Introduce retargeting and post-purchase upsell flows if you haven\'t already. Cheapest incremental revenue available at this stage.',
    'Set a frequency watch (flag ad sets >2.5 weekly frequency). First early-warning sign of scale decay.',
  ];

  return { diagnosis, recommendations: recs.slice(0, 5), pattern: 'profitable' };
}

function steadyState(ctx) {
  const { source } = ctx;
  const diagnosis = [
    `Every metric sits within ±20% of the ${benchLabel(source)} benchmark. No single lever is broken, so gains come from compounding testing velocity rather than a single fix.`,
  ];

  const recs = [
    'Commit to a weekly rhythm: 3 new creatives, 1 new audience angle, 1 LP test. Compounding small wins beats hunting for a hero.',
    'Pick the metric with the most headroom (your current worst band) and concentrate the next two weeks there. One-lever focus.',
    'Introduce a creative kill rule (e.g. <0.5x account CTR after 10k impressions). Without one, the average drags down top performers.',
    'Audit attribution fidelity — CAPI, Enhanced Conversions, server-side events. Patchy tracking means you\'re flying half-blind on what\'s actually working.',
  ];

  return { diagnosis, recommendations: recs.slice(0, 5), pattern: 'steady_state' };
}

function detectPattern(ctx) {
  const { b } = ctx;
  // Priority order: most diagnostic combination first.
  if (b.ctr === 'low' && b.cvr === 'low') return fullFunnelBreak(ctx);
  if (b.ctr === 'low' && b.cpm === 'high') return targetingMismatch(ctx);
  if (b.ctr === 'low' && b.cvr !== 'low') return creativeBottleneck(ctx);
  if (b.cvr === 'low' && b.ctr !== 'low') return postClickBottleneck(ctx);
  if (b.roas === 'low') return economicsProblem(ctx);
  if (b.roas === 'high') return profitable(ctx);
  return steadyState(ctx);
}

const HEADLINES = {
  creative_bottleneck:   'Top of funnel is the bottleneck — creative isn\'t earning clicks.',
  post_click_bottleneck: 'Bottleneck is post-click — landing page or offer, not media.',
  targeting_mismatch:    'You\'re overpaying to reach the wrong audience.',
  full_funnel_break:     'Funnel is broken at both stages. Fix CVR first.',
  economics_problem:     'Acquisition works; unit economics don\'t.',
  profitable:            'Profitable — manage for scale decay, not efficiency.',
  steady_state:          'No single broken lever. Gains come from testing velocity.',
};

// Short, table-friendly labels for the dashboard column.
const BIGGEST_ISSUE = {
  creative_bottleneck:   'Low CTR',
  post_click_bottleneck: 'Low CVR',
  targeting_mismatch:    'High CPM',
  full_funnel_break:     'CTR + CVR low',
  economics_problem:     'Weak unit economics',
  profitable:            'Profitable',
  steady_state:          'Healthy',
};

function summarize(ctx, pattern) {
  const { m, g, benchmarks, source } = ctx;
  const roas = nf(m.roas);
  const bench = nf(benchmarks.roas, 1);
  const gap = Math.abs(g.roas).toFixed(0);
  const dir = m.roas >= benchmarks.roas ? 'above' : 'below';
  return `ROAS ${roas}x is ${gap}% ${dir} the ${benchLabel(source)} benchmark of ${bench}x. ${HEADLINES[pattern.pattern]}`;
}

export function analyze(input) {
  validate(input);
  const metrics = computeMetrics(input);
  const { source, values: benchmarks } = resolveBenchmarks(input.platform);
  const bands = bandAll(metrics, benchmarks);
  const gaps = computeGaps(metrics, benchmarks);

  const ctx = {
    input,
    m: metrics,
    b: { ctr: bands.ctr.level, cvr: bands.cvr.level, cpm: bands.cpm.level, roas: bands.roas.level },
    g: gaps,
    benchmarks,
    platform: input.platform,
    source,
  };

  const pattern = detectPattern(ctx);

  // Single-number read on campaign health vs the benchmark, in dollars.
  // Positive = ahead of benchmark by $X; negative = behind by $X.
  const moneyImpact = (metrics.roas - benchmarks.roas) * Number(input.spend);

  return {
    metrics,
    benchmarks,
    benchmarkSource: source,
    analysis: bands,
    summary: summarize(ctx, pattern),
    pattern: pattern.pattern,
    issues: pattern.diagnosis.slice(0, 4),
    recommendations: pattern.recommendations.slice(0, 5),
    biggestIssue: BIGGEST_ISSUE[pattern.pattern],
    moneyImpact,
  };
}
