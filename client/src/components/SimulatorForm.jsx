import { useEffect, useState } from 'react';

const STEPS = [
  { id: 'basics', title: 'Campaign Basics', hint: 'Name, industry, budget, and revenue target.' },
  { id: 'audience', title: 'Audience', hint: 'Size, competition level.' },
  { id: 'creative', title: 'Creative', hint: 'Score your ad creative quality (1–100).' },
  { id: 'landingPage', title: 'Landing Page', hint: 'Score your landing page quality (1–100).' },
  { id: 'advanced', title: 'Placements', hint: 'Where your ads run and in what format.' },
];

const INDUSTRIES = ['E-commerce', 'SaaS', 'Finance', 'Education', 'Health', 'Gaming', 'Travel'];
const GEOS = ['US', 'India'];
const COMPETITIONS = ['low', 'medium', 'high', 'very_high'];
const FORMATS = ['video', 'carousel', 'image', 'text'];
const PLACEMENTS = ['feed', 'reels', 'stories', 'in_stream', 'audience_network', 'right_column', 'search'];

const STORAGE_KEY = 'simulator-form-draft';

const DEFAULT_FORM = {
  campaignId: '',
  name: '',
  industry: '',
  geo: '',
  budget: '',
  durationDays: '',
  averageOrderValue: '',
  audienceSize: '',
  competition: 'medium',
  format: 'video',
  creative: { hook: 50, visual: 50, offerClarity: 50, ctaClarity: 50 },
  landingPage: { speed: 50, mobileFriendliness: 50, messageMatch: 50, trustSignals: 50, friction: 30 },
  placements: [{ placement: 'feed', weight: 60 }],
};

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_FORM, ...JSON.parse(raw) } : { ...DEFAULT_FORM };
  } catch {
    return { ...DEFAULT_FORM };
  }
}

export default function SimulatorForm({ onSubmit, loading, error }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(loadDraft);
  const [errors, setErrors] = useState({});

  // Persist draft to localStorage on every change.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const updateNested = (group, key, val) =>
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: val } }));

  function validateStep(s) {
    const e = {};
    if (s === 0) {
      if (!form.campaignId.trim()) e.campaignId = 'Required';
      if (!form.name.trim()) e.name = 'Required';
      if (!form.industry) e.industry = 'Required';
      if (!form.geo) e.geo = 'Required';
      if (!(Number(form.budget) > 0)) e.budget = 'Must be > 0';
      if (!(Number(form.averageOrderValue) > 0)) e.averageOrderValue = 'Must be > 0';
    } else if (s === 1) {
      if (!(Number(form.audienceSize) > 0)) e.audienceSize = 'Must be > 0';
    } else if (s === 4) {
      if (!form.placements.length) e.placements = 'Add at least one';
    }
    return e;
  }

  function next() {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit(ev) {
    ev.preventDefault();
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length) return;

    // Convert string values to numbers for the API.
    onSubmit({
      campaignId: form.campaignId,
      name: form.name,
      industry: form.industry,
      geo: form.geo,
      budget: Number(form.budget),
      durationDays: form.durationDays ? Number(form.durationDays) : undefined,
      averageOrderValue: Number(form.averageOrderValue),
      audienceSize: Number(form.audienceSize),
      competition: form.competition,
      format: form.format,
      creative: {
        hook: Number(form.creative.hook),
        visual: Number(form.creative.visual),
        offerClarity: Number(form.creative.offerClarity),
        ctaClarity: Number(form.creative.ctaClarity),
      },
      landingPage: {
        speed: Number(form.landingPage.speed),
        mobileFriendliness: Number(form.landingPage.mobileFriendliness),
        messageMatch: Number(form.landingPage.messageMatch),
        trustSignals: Number(form.landingPage.trustSignals),
        friction: Number(form.landingPage.friction),
      },
      placements: form.placements.map((p) => ({
        placement: p.placement,
        weight: Number(p.weight),
      })),
    });
  }

  function reset() {
    setForm({ ...DEFAULT_FORM });
    setStep(0);
    setErrors({});
    localStorage.removeItem(STORAGE_KEY);
  }

  const isLast = step === STEPS.length - 1;

  return (
    <section className="card">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-neutral-900">{STEPS[step].title}</h2>
          <span className="text-xs text-neutral-500">Step {step + 1} of {STEPS.length}</span>
        </div>
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-neutral-600">{STEPS[step].hint}</p>
      </div>

      <form onSubmit={isLast ? submit : (e) => { e.preventDefault(); next(); }}>
        {step === 0 && <StepBasics form={form} update={update} errors={errors} />}
        {step === 1 && <StepAudience form={form} update={update} errors={errors} />}
        {step === 2 && <StepCreative form={form} updateNested={updateNested} update={update} />}
        {step === 3 && <StepLandingPage form={form} updateNested={updateNested} />}
        {step === 4 && <StepPlacements form={form} setForm={setForm} update={update} errors={errors} />}

        {error && <p className="mt-4 text-sm text-error-600">{error}</p>}

        <div className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-5">
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={back} className="btn-secondary text-sm">
                ← Back
              </button>
            )}
            <button type="button" onClick={reset} className="text-xs text-neutral-400 hover:text-neutral-600 px-2">
              Reset
            </button>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Simulating…' : isLast ? 'Run Simulation' : 'Next →'}
          </button>
        </div>
      </form>
    </section>
  );
}

// ─── Step Components ────────────────────────────────────────────────────────

function StepBasics({ form, update, errors }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Campaign ID" value={form.campaignId} onChange={(v) => update('campaignId', v)} error={errors.campaignId} required />
      <Field label="Campaign Name" value={form.name} onChange={(v) => update('name', v)} error={errors.name} required />
      <SelectField label="Industry" value={form.industry} onChange={(v) => update('industry', v)} options={INDUSTRIES} error={errors.industry} required />
      <SelectField label="Geo" value={form.geo} onChange={(v) => update('geo', v)} options={GEOS} error={errors.geo} required />
      <NumberField label="Budget ($)" value={form.budget} onChange={(v) => update('budget', v)} error={errors.budget} required />
      <NumberField label="Avg Order Value ($)" value={form.averageOrderValue} onChange={(v) => update('averageOrderValue', v)} error={errors.averageOrderValue} required />
      <NumberField label="Duration (days)" value={form.durationDays} onChange={(v) => update('durationDays', v)} />
    </div>
  );
}

function StepAudience({ form, update, errors }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <NumberField label="Audience Size" value={form.audienceSize} onChange={(v) => update('audienceSize', v)} error={errors.audienceSize} required />
      <SelectField label="Competition Level" value={form.competition} onChange={(v) => update('competition', v)} options={COMPETITIONS} />
    </div>
  );
}

function StepCreative({ form, updateNested, update }) {
  return (
    <div className="space-y-5">
      <SelectField label="Ad Format" value={form.format} onChange={(v) => update('format', v)} options={FORMATS} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SliderField label="Hook strength" value={form.creative.hook} onChange={(v) => updateNested('creative', 'hook', v)} />
        <SliderField label="Visual quality" value={form.creative.visual} onChange={(v) => updateNested('creative', 'visual', v)} />
        <SliderField label="Offer clarity" value={form.creative.offerClarity} onChange={(v) => updateNested('creative', 'offerClarity', v)} />
        <SliderField label="CTA clarity" value={form.creative.ctaClarity} onChange={(v) => updateNested('creative', 'ctaClarity', v)} />
      </div>
    </div>
  );
}

function StepLandingPage({ form, updateNested }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SliderField label="Page speed" value={form.landingPage.speed} onChange={(v) => updateNested('landingPage', 'speed', v)} />
      <SliderField label="Mobile friendliness" value={form.landingPage.mobileFriendliness} onChange={(v) => updateNested('landingPage', 'mobileFriendliness', v)} />
      <SliderField label="Message match" value={form.landingPage.messageMatch} onChange={(v) => updateNested('landingPage', 'messageMatch', v)} />
      <SliderField label="Trust signals" value={form.landingPage.trustSignals} onChange={(v) => updateNested('landingPage', 'trustSignals', v)} />
      <SliderField label="Friction (lower is better)" value={form.landingPage.friction} onChange={(v) => updateNested('landingPage', 'friction', v)} tone="negative" />
    </div>
  );
}

function StepPlacements({ form, setForm, errors }) {
  function addPlacement() {
    const used = new Set(form.placements.map((p) => p.placement));
    const next = PLACEMENTS.find((p) => !used.has(p));
    if (!next) return;
    setForm((f) => ({ ...f, placements: [...f.placements, { placement: next, weight: 50 }] }));
  }

  function removePlacement(idx) {
    setForm((f) => ({
      ...f,
      placements: f.placements.filter((_, i) => i !== idx),
    }));
  }

  function updatePlacement(idx, key, val) {
    setForm((f) => ({
      ...f,
      placements: f.placements.map((p, i) => (i === idx ? { ...p, [key]: val } : p)),
    }));
  }

  return (
    <div className="space-y-4">
      {form.placements.map((p, i) => (
        <div key={i} className="flex items-end gap-3">
          <label className="flex-1 block">
            <span className="mb-2 block text-sm font-medium text-neutral-700">Placement</span>
            <select
              value={p.placement}
              onChange={(e) => updatePlacement(i, 'placement', e.target.value)}
              className="w-full"
            >
              {PLACEMENTS.map((pl) => (
                <option key={pl} value={pl}>{pl.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>
          <label className="w-24 block">
            <span className="mb-2 block text-sm font-medium text-neutral-700">Weight</span>
            <input
              type="number"
              min="1"
              value={p.weight}
              onChange={(e) => updatePlacement(i, 'weight', e.target.value)}
              className="w-full"
            />
          </label>
          {form.placements.length > 1 && (
            <button
              type="button"
              onClick={() => removePlacement(i)}
              className="mb-0.5 rounded-lg px-2.5 py-2.5 text-xs text-error-600 hover:bg-error-50"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {form.placements.length < PLACEMENTS.length && (
        <button type="button" onClick={addPlacement} className="text-sm font-medium text-primary-600 hover:text-primary-700">
          + Add placement
        </button>
      )}
      {errors.placements && <p className="text-sm text-error-600">{errors.placements}</p>}
    </div>
  );
}

// ─── Shared Field Components ────────────────────────────────────────────────

function Field({ label, value, onChange, error, required }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-700">
        {label}{required && <span className="text-neutral-400"> *</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
      />
      {error && <span className="text-xs text-error-600">{error}</span>}
    </label>
  );
}

function NumberField({ label, value, onChange, error, required }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-700">
        {label}{required && <span className="text-neutral-400"> *</span>}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full"
      />
      {error && <span className="text-xs text-error-600">{error}</span>}
    </label>
  );
}

function SelectField({ label, value, onChange, options, error, required }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-700">
        {label}{required && <span className="text-neutral-400"> *</span>}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full">
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
        ))}
      </select>
      {error && <span className="text-xs text-error-600">{error}</span>}
    </label>
  );
}

function SliderField({ label, value, onChange, tone = 'positive' }) {
  const num = Number(value) || 0;
  const color = tone === 'negative'
    ? num > 60 ? 'text-error-600' : num > 30 ? 'text-warning-600' : 'text-success-600'
    : num >= 70 ? 'text-success-600' : num >= 40 ? 'text-warning-600' : 'text-error-600';

  return (
    <label className="block">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-neutral-700">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${color}`}>{num}</span>
      </div>
      <input
        type="range"
        min="1"
        max="100"
        value={num}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
      />
    </label>
  );
}
