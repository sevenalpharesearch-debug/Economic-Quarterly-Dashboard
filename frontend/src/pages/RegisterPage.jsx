import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Minimum 6 characters';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
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
      await register({ name: form.name, email: form.email, password: form.password });
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: '' }));
    if (serverError) setServerError('');
  };

  const pwdStrength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const pwdColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];
  const pwdLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  const LabelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
  };

  return (
    <div className="auth-page">
      <div className="auth-blob-1" />
      <div className="auth-blob-2" />
      <div className="auth-blob-3" />

      {/* ════════════ LEFT PANEL ════════════ */}
      <div className="auth-left">
        {/* Logo */}
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

        {/* Middle content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBlock: 40 }}>
          <h1 style={{ color: '#fff', fontSize: 34, fontWeight: 800, lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.4px' }}>
            Join the platform<br />trusted by financial<br />analysts.
          </h1>
          <p style={{ color: 'rgba(148,163,184,0.85)', fontSize: 14, lineHeight: 1.65, maxWidth: 340, marginBottom: 32 }}>
            Get instant access to macro economic dashboards, sector KPIs, and multi-industry trend analysis.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Multi-sector analytical dashboards',
              'Quarterly KPI tracking & comparison',
              'Interactive trend charts',
              'Secure multi-user workspace',
            ].map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <CheckIcon size={10} color="#818cf8" />
                </div>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#1e3a5f' }}>
          &copy; {new Date().getFullYear()} Analytix Intelligence Platform
        </div>
      </div>

      {/* ════════════ RIGHT PANEL ════════════ */}
      <div className="auth-right">
        <div className="fade-up" style={{ width: '100%', maxWidth: 420 }}>
          <div className="auth-card">
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 5, letterSpacing: '-0.3px' }}>
                Create account
              </h2>
              <p style={{ color: '#64748b', fontSize: 14 }}>Start your analytics journey today</p>
            </div>

            {serverError && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10, padding: '11px 14px', marginBottom: 18,
              }}>
                <svg style={{ width: 15, height: 15, color: '#f87171', flexShrink: 0, marginTop: 1 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span style={{ color: '#fca5a5', fontSize: 13 }}>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Name */}
              <div style={{ marginBottom: 14 }}>
                <label style={LabelStyle}>Full Name</label>
                <input type="text" value={form.name} onChange={set('name')} placeholder="John Smith"
                  autoComplete="name" className={`input-field${errors.name ? ' error' : ''}`} />
                {errors.name && <p style={{ marginTop: 5, fontSize: 12, color: '#f87171' }}>⚠ {errors.name}</p>}
              </div>

              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label style={LabelStyle}>Email Address</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="you@company.com"
                  autoComplete="email" className={`input-field${errors.email ? ' error' : ''}`} />
                {errors.email && <p style={{ marginTop: 5, fontSize: 12, color: '#f87171' }}>⚠ {errors.email}</p>}
              </div>

              {/* Password */}
              <div style={{ marginBottom: 14 }}>
                <label style={LabelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')}
                    placeholder="Min. 6 characters" autoComplete="new-password"
                    className={`input-field${errors.password ? ' error' : ''}`} style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex' }}>
                    {showPwd ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                  </button>
                </div>
                {/* Strength meter */}
                {form.password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1,2,3,4].map(n => (
                        <div key={n} className="strength-bar"
                          style={{ background: pwdStrength >= n ? pwdColors[pwdStrength] : 'rgba(255,255,255,0.08)' }} />
                      ))}
                    </div>
                    {pwdStrength > 0 && (
                      <p style={{ fontSize: 11, color: pwdColors[pwdStrength], fontWeight: 600 }}>
                        {pwdLabels[pwdStrength]} password
                      </p>
                    )}
                  </div>
                )}
                {errors.password && <p style={{ marginTop: 5, fontSize: 12, color: '#f87171' }}>⚠ {errors.password}</p>}
              </div>

              {/* Confirm */}
              <div style={{ marginBottom: 24 }}>
                <label style={LabelStyle}>Confirm Password</label>
                <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')}
                  placeholder="••••••••" autoComplete="new-password"
                  className={`input-field${errors.confirmPassword ? ' error' : ''}`} />
                {errors.confirmPassword && <p style={{ marginTop: 5, fontSize: 12, color: '#f87171' }}>⚠ {errors.confirmPassword}</p>}
              </div>

              <button type="submit" disabled={loading} className="btn-primary">
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <SpinnerIcon size={15} /> Creating account...
                    </span>
                  : 'Create Account'}
              </button>
            </form>

            <div style={{ marginTop: 22, paddingTop: 22, borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
              <p style={{ color: '#475569', fontSize: 14 }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
