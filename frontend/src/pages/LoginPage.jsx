import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setServerError('');
    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: '' }));
    if (serverError) setServerError('');
  };

  return (
    <div className="auth-page">
      {/* Background decorative blobs */}
      <div className="auth-blob-1" />
      <div className="auth-blob-2" />
      <div className="auth-blob-3" />

      {/* ════════════ LEFT PANEL ════════════ */}
      <div className="auth-left">
        {/* Logo — top */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          }}>
            <BarChartIcon size={18} color="#fff" />
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>Analytix</span>
        </div>

        {/* Hero copy — middle */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBlock: 40 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 999, padding: '5px 12px', marginBottom: 24, width: 'fit-content',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8' }} />
            <span style={{ color: '#a5b4fc', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Intelligence Platform
            </span>
          </div>

          <h1 style={{ color: '#fff', fontSize: 40, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.5px' }}>
            Data-driven<br />decisions<br />start here.
          </h1>
          <p style={{ color: 'rgba(148,163,184,0.9)', fontSize: 15, lineHeight: 1.65, maxWidth: 360, marginBottom: 32 }}>
            Monitor macroeconomic signals, sector performance, and market dynamics — all in one unified analytical workspace.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['8 Industry Sectors', 'Real-time Analytics', 'KPI Monitoring', 'Trend Charts'].map((f) => (
              <span key={f} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 999, padding: '5px 12px', fontSize: 12, color: '#94a3b8', fontWeight: 500,
              }}>
                <CheckIcon size={11} color="#818cf8" />
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Metric cards — bottom */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'GDP Growth', value: '+3.2%', up: true },
            { label: 'Inflation', value: '3.8%', up: false },
            { label: 'S&P 500', value: '5,248', up: true },
          ].map((m) => (
            <div key={m.label} style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 14, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{m.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: m.up ? '#34d399' : '#f87171' }}>
                {m.up ? '↑ Trending up' : '↓ Watch closely'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════ RIGHT PANEL ════════════ */}
      <div className="auth-right">
        <div className="fade-up" style={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <div style={{ display: 'none' }} className="mobile-logo">
            {/* handled via CSS .auth-left display:none on mobile */}
          </div>

          {/* Card */}
          <div className="auth-card">
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.3px' }}>
                Welcome back
              </h2>
              <p style={{ color: '#64748b', fontSize: 14 }}>Sign in to your analytics workspace</p>
            </div>

            {/* Server error */}
            {serverError && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10, padding: '12px 14px', marginBottom: 20,
              }}>
                <svg style={{ width: 16, height: 16, color: '#f87171', flexShrink: 0, marginTop: 1 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span style={{ color: '#fca5a5', fontSize: 13 }}>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className={`input-field${errors.email ? ' error' : ''}`}
                />
                {errors.email && <p style={{ marginTop: 6, fontSize: 12, color: '#f87171' }}>⚠ {errors.email}</p>}
              </div>

              {/* Password */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`input-field${errors.password ? ' error' : ''}`}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#475569',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
                {errors.password && <p style={{ marginTop: 6, fontSize: 12, color: '#f87171' }}>⚠ {errors.password}</p>}
              </div>

              <button type="submit" disabled={loading} className="btn-primary">
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <SpinnerIcon size={16} /> Authenticating...
                    </span>
                  : 'Sign In'}
              </button>
            </form>

            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
              <p style={{ color: '#475569', fontSize: 14 }}>
                New to Analytix?{' '}
                <Link to="/register" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}
                  onMouseEnter={e => e.target.style.color = '#a5b4fc'}
                  onMouseLeave={e => e.target.style.color = '#818cf8'}>
                  Create account
                </Link>
              </p>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#1e293b', marginTop: 20 }}>
            &copy; {new Date().getFullYear()} Analytix · Enterprise Analytics Platform
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── SVG Icons ── */
const BarChartIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const CheckIcon = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} fill="none" stroke={color} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);
const EyeIcon = ({ size = 16 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const EyeOffIcon = ({ size = 16 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);
const SpinnerIcon = ({ size = 16 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
    <path fill="currentColor" style={{ opacity: 0.75 }} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);
