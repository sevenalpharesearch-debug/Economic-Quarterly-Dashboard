import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: 52,
        height: 28,
        borderRadius: 14,
        padding: 3,
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
        flexShrink: 0,
        background: isDark
          ? 'linear-gradient(135deg, #3730a3, #4f46e5)'
          : 'linear-gradient(135deg, #f59e0b, #fbbf24)',
        boxShadow: isDark
          ? '0 0 10px rgba(99,102,241,0.35)'
          : '0 0 10px rgba(251,191,36,0.4)',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Sun icon — visible in light mode */}
      <svg
        width="11" height="11" viewBox="0 0 24 24"
        fill="none" stroke="white" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        style={{
          position: 'absolute', left: 7,
          opacity: isDark ? 0 : 1,
          transition: 'opacity 0.25s ease',
          pointerEvents: 'none',
        }}
      >
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>

      {/* Moon icon — visible in dark mode */}
      <svg
        width="11" height="11" viewBox="0 0 24 24"
        fill="white"
        style={{
          position: 'absolute', right: 7,
          opacity: isDark ? 1 : 0,
          transition: 'opacity 0.25s ease',
          pointerEvents: 'none',
        }}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>

      {/* Sliding knob */}
      <span style={{
        display: 'block',
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: 'white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        transform: isDark ? 'translateX(24px)' : 'translateX(0px)',
        transition: 'transform 0.3s ease',
        flexShrink: 0,
      }} />
    </button>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'var(--c-header)',
        borderBottom: '1px solid var(--c-header-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div style={{
        maxWidth: 1440, margin: '0 auto', padding: '0 28px',
        height: 56, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', width: '100%',
      }}>

        {/* ── Left: Logo + wordmark ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div 
            onClick={() => window.location.href = '/dashboard'}
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            title="Go to Dashboard"
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}>
              <svg style={{ width: 16, height: 16, color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>

            <div>
              <span style={{ fontWeight: 700, color: 'var(--c-text-1)', fontSize: 14, letterSpacing: '-0.3px' }}>
                Analytix
              </span>
              <span style={{ color: 'var(--c-text-3)', fontSize: 13 }} className="hidden sm:inline">
                {' '}· Intelligence Platform
              </span>
            </div>
          </div>

          {/* Live dot */}
          <div style={{
            display: 'none', alignItems: 'center', gap: 6,
            marginLeft: 12, paddingLeft: 12,
            borderLeft: '1px solid var(--c-divider)',
          }} className="md:flex">
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#34d399',
              boxShadow: '0 0 6px #34d399',
              display: 'block',
              animation: 'pulse 2s infinite',
            }} />
            <span style={{ fontSize: 11, color: 'var(--c-text-3)', fontWeight: 500, letterSpacing: '0.04em' }}>
              Live
            </span>
          </div>
        </div>

        {/* ── Right: controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

          {/* Theme toggle */}
          <ThemeToggle isDark={isDark} onToggle={toggle} />

          {/* Admin Panel button */}
          {user?.role === 'admin' && (
            <button 
              onClick={() => navigate('/admin-panel')}
              className="header-icon-btn hidden sm:flex"
              title="Admin Panel"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}

          {/* User menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="header-user-btn"
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
              }}>
                {initials}
              </div>
              <div className="hidden sm:block" style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-1)', lineHeight: 1 }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--c-text-3)', marginTop: 2, lineHeight: 1, textTransform: 'capitalize' }}>
                  {user?.role}
                </div>
              </div>
              <svg
                width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style={{
                  color: 'var(--c-text-3)',
                  transition: 'transform 0.2s ease',
                  transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
                className="hidden sm:block"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setMenuOpen(false)} />
                <div
                  className="fade-in-up"
                  style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    width: 220, borderRadius: 14, zIndex: 40, overflow: 'hidden',
                    background: 'var(--c-popup-bg)',
                    border: '1px solid var(--c-popup-border)',
                    boxShadow: `0 20px 60px var(--c-popup-shadow)`,
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {/* User info */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--c-divider)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-1)' }}>{user?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--c-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                        {user?.email}
                      </div>
                    </div>
                  </div>

                  {/* Role badge */}
                  <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--c-divider)' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 11, fontWeight: 600, color: '#818cf8',
                      background: 'rgba(99,102,241,0.1)', padding: '4px 10px',
                      borderRadius: 999, textTransform: 'capitalize',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8' }} />
                      {user?.role}
                    </span>
                  </div>

                  {/* Sign out */}
                  <div style={{ padding: 6 }}>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', borderRadius: 8,
                        fontSize: 13, color: '#f87171',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </header>
  );
}
