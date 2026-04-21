export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <p className="mt-4 text-center text-sm text-slate-500">{footer}</p>}
      </div>
    </div>
  );
}

export function Field({ label, type = 'text', value, onChange, autoComplete, required = true }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10"
      />
    </label>
  );
}

export function PrimaryButton({ children, disabled, type = 'submit' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
