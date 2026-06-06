import { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (id === 'Macrodashboard' && password === 'MD@54321') {
      onLogin();
    } else {
      setError('Invalid ID or Password');
    }
  };

  return (
    <div className="auth-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div className="auth-blob-1"></div>
      <div className="auth-blob-2"></div>
      <div className="auth-blob-3"></div>

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px', padding: '20px' }}>
        <div className="auth-card" style={{ maxWidth: '100%', padding: '48px 40px', background: '#1c152c', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)', border: '1px solid rgba(255,255,255,0.12)' }}>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', background: 'rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>M</span>
            </div>
            <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Macro Dashboard</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Welcome back</p>
          </div>

          {error && <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <input
                type="text"
                className={`input-field ${error ? 'error' : ''}`}
                placeholder="ID (Macrodashboard)"
                value={id}
                onChange={(e) => setId(e.target.value)}
                style={{ height: '48px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
            <div>
              <input
                type="password"
                className={`input-field ${error ? 'error' : ''}`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ height: '48px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ height: '48px', marginTop: '8px', background: '#fff', color: '#000', fontWeight: '600' }}>
              Sign In →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
