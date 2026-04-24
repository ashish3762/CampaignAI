import { Logo } from '../components/Logo';

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-50 to-primary-50 px-4 py-8 flex flex-col justify-center">
      <div className="grid place-items-center min-h-screen">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="h-12 w-12 rounded-full bg-primary-500 flex items-center justify-center">
                <img
                  src="/logo.svg"
                  alt="CampaignAI"
                  className="h-8 w-8"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-neutral-900">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-neutral-600">{subtitle}</p>
            )}
          </div>

          {/* Card */}
          <div className="card">
            <div className="mt-6">{children}</div>
          </div>

          {/* Footer */}
          {footer && (
            <p className="mt-6 text-center text-sm text-neutral-600">
              {footer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, type = 'text', value, onChange, autoComplete, required = true, placeholder = '' }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-700">{label}</span>
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 shadow-sm-modern outline-none transition placeholder:text-neutral-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />
    </label>
  );
}

export function PrimaryButton({ children, disabled, type = 'submit' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm-modern transition hover:bg-primary-600 active:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary-500"
    >
      {children}
    </button>
  );
}
