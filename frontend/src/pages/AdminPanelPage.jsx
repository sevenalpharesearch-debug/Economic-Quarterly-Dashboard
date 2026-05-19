import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../api/axios';

export default function AdminPanelPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/users');
      setUsers(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdating(userId);
      await api.put(`/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '24px 0' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: 'var(--c-text-1)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 8 }}>
            Admin Panel
          </h1>
          <p style={{ fontSize: 14, color: 'var(--c-text-3)' }}>
            Manage user roles and permissions across the platform.
          </p>
        </div>

        {error && (
          <div style={{ 
            padding: '12px 16px', borderRadius: 12, marginBottom: 20, fontSize: 13, color: '#f87171',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' 
          }}>
            {error}
          </div>
        )}

        <div className="admin-table-container" style={{
          background: 'var(--c-hero-bg)',
          border: '1px solid var(--c-hero-border)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)'
        }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--c-divider)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Name</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Role</th>
                <th style={{ padding: '16px 24px', fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--c-text-3)' }}>
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--c-text-3)' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="admin-tr" style={{ borderBottom: '1px solid var(--c-divider)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="admin-td-name" style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--c-text-1)', fontSize: 14 }}>{user.name}</div>
                    </td>
                    <td className="admin-td-email" style={{ padding: '16px 24px', color: 'var(--c-text-3)', fontSize: 13, wordBreak: 'break-all' }}>
                      {user.email}
                    </td>
                    <td className="admin-td-role" style={{ padding: '16px 24px' }}>
                      <div className="mobile-label">Current Role:</div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 10, fontWeight: 700, color: user.role === 'admin' ? '#818cf8' : '#94a3b8',
                        background: user.role === 'admin' ? 'rgba(99,102,241,0.12)' : 'rgba(148,163,184,0.12)',
                        padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em',
                        border: `1px solid ${user.role === 'admin' ? 'rgba(99,102,241,0.2)' : 'rgba(148,163,184,0.2)'}`
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: user.role === 'admin' ? '#818cf8' : '#94a3b8' }} />
                        {user.role}
                      </span>
                    </td>
                    <td className="admin-td-action" style={{ padding: '16px 24px' }}>
                      <div className="mobile-label">Action:</div>
                      <div className="admin-select-wrapper">
                        <select
                          value={user.role}
                          disabled={updating === user._id}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          className="admin-select"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <div className="admin-select-icon">
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .admin-select-wrapper {
          position: relative;
          display: inline-block;
        }
        .admin-select {
          appearance: none;
          background: var(--c-surface-2);
          border: 1px solid var(--c-border);
          border-radius: 8px;
          padding: 7px 32px 7px 12px;
          color: var(--c-text-1);
          font-size: 13px;
          font-weight: 500;
          outline: none;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s ease;
          min-width: 100px;
        }
        .admin-select:hover:not(:disabled) {
          border-color: var(--c-info);
          background: var(--c-surface-hover);
        }
        .admin-select:focus {
          border-color: var(--c-info);
          box-shadow: 0 0 0 2px rgba(129,140,248,0.15);
        }
        .admin-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .admin-select-icon {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: var(--c-text-4);
        }
        .mobile-label {
          display: none;
          font-size: 10px;
          font-weight: 700;
          color: var(--c-text-4);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        @media (max-width: 640px) {
          .admin-table thead {
            display: none;
          }
          .admin-tr {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            padding: 20px 16px !important;
            gap: 12px !important;
          }
          .admin-td-name {
            grid-column: span 2 !important;
            padding: 0 !important;
            border: none !important;
          }
          .admin-td-email {
            grid-column: span 2 !important;
            padding: 0 !important;
            border: none !important;
            margin-bottom: 8px;
          }
          .admin-td-role {
            grid-column: 1 !important;
            padding: 0 !important;
            border: none !important;
            display: block !important;
          }
          .admin-td-action {
            grid-column: 2 !important;
            padding: 0 !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-end !important;
          }
          .mobile-label {
            display: block;
          }
          .admin-select-wrapper {
            width: auto !important;
          }
          .admin-select {
            width: 104px !important;
            min-width: 96px !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
