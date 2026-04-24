import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { AuthLayout, Field, PrimaryButton } from '../auth/AuthLayout.jsx';

export default function Signup() {
  const { user, loading, signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const data = await signup(email, password);
      if (data?.session) {
        navigate('/', { replace: true });
      } else {
        // Email confirmations are enabled on the Supabase project; no session yet.
        setNotice('Account created. Check your email to confirm, then log in.');
      }
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Start analyzing your campaigns"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-error-600">{error}</p>}
        {notice && <p className="text-sm text-success-700">{notice}</p>}
        <PrimaryButton disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Account'}
        </PrimaryButton>
      </form>
    </AuthLayout>
  );
}
