import { useEffect, useState } from 'react';

const INDUSTRIES = [
  'E-commerce',
  'SaaS',
  'Education',
  'Finance',
  'Health',
  'Gaming',
  'Travel',
  'Other',
];
const PLATFORMS = ['Meta', 'Google', 'TikTok'];

const EMPTY = {
  spend: '',
  impressions: '',
  clicks: '',
  conversions: '',
  revenue: '',
  industry: '',
  platform: '',
};

const SAMPLE = {
  spend: '5000',
  impressions: '500000',
  clicks: '3500',
  conversions: '60',
  revenue: '9000',
  industry: 'E-commerce',
  platform: 'Meta',
};

export default function InputForm({ onSubmit, loading, error, mode = 'actual' }) {
  const [form, setForm] = useState(EMPTY);
  const isPlanned = mode === 'planned';

  // Mode is a semantic context switch (real numbers vs projections) — values
  // entered for one shouldn't carry into the other. Reset when mode flips.
  useEffect(() => {
    setForm(EMPTY);
  }, [mode]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    onSubmit({
      spend: Number(form.spend),
      impressions: Number(form.impressions),
      clicks: Number(form.clicks),
      conversions: Number(form.conversions),
      revenue: Number(form.revenue),
      industry: form.industry || undefined,
      platform: form.platform || undefined,
    });
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {isPlanned ? 'Planned campaign metrics' : 'Campaign metrics'}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {isPlanned
              ? 'Enter your expected campaign metrics to evaluate feasibility and risks.'
              : 'Required fields are marked. Industry and platform are optional.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm(SAMPLE)}
          className="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          Load sample
        </button>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField label="Spend ($)" value={form.spend} onChange={(v) => update('spend', v)} required />
        <NumberField label="Impressions" value={form.impressions} onChange={(v) => update('impressions', v)} required />
        <NumberField label="Clicks" value={form.clicks} onChange={(v) => update('clicks', v)} required />
        <NumberField label="Conversions" value={form.conversions} onChange={(v) => update('conversions', v)} required />
        <NumberField label="Revenue ($)" value={form.revenue} onChange={(v) => update('revenue', v)} required />
        <div className="hidden lg:block" />
        <SelectField label="Industry" value={form.industry} onChange={(v) => update('industry', v)} options={INDUSTRIES} />
        <SelectField label="Platform" value={form.platform} onChange={(v) => update('platform', v)} options={PLATFORMS} />

        <div className="sm:col-span-2 lg:col-span-3 mt-2 flex flex-col-reverse items-stretch gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-600 min-h-[1.25rem]">{error || ''}</p>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Analyzing…' : 'Analyze Performance'}
          </button>
        </div>
      </form>
    </section>
  );
}

function NumberField({ label, value, onChange, required }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-slate-400"> *</span>}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
