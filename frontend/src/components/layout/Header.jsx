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

export default function Header({ onLogout }) {
  const { isDark, toggle } = useTheme();

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
            onClick={() => window.location.href = import.meta.env.BASE_URL}
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
          
          {/* Sign Out button */}
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                marginRight: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Sign Out
            </button>
          )}

          {/* Theme toggle */}
          <ThemeToggle isDark={isDark} onToggle={toggle} />

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
