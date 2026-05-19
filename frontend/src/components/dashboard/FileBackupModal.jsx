import { useEffect, useState } from 'react';
import { getDatasetStatus, restoreBackup, deleteBackup } from '../../api/dashboard';

function fmt(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function FileBackupModal({ onClose, onRestoreSuccess }) {
  const [loading, setLoading] = useState(true);
  const [defaultDataset, setDefaultDataset] = useState(null);
  const [tempDataset, setTempDataset] = useState(null);
  const [backups, setBackups] = useState([]);
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    getDatasetStatus()
      .then((data) => {
        setDefaultDataset(data.defaultDataset || null);
        setTempDataset(data.tempDataset || null);
        setBackups(data.backups || []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dataset history'))
      .finally(() => setLoading(false));
  }, []);

  const handleRestore = async (backupId) => {
    setRestoring(backupId);
    setError('');
    setSuccessMsg('');

    try {
      const result = await restoreBackup(backupId);
      setSuccessMsg(result.message);
      setDefaultDataset(result.defaultDataset);
      setTempDataset(null);
      setBackups(result.backups || []);
      setTimeout(() => onRestoreSuccess(result), 700);
    } catch (err) {
      setError(err.response?.data?.message || 'Restore failed');
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (backupId, originalName) => {
    if (!window.confirm(`Are you sure you want to delete this backup version?`)) {
      return;
    }

    setDeleting(backupId);
    setError('');
    setSuccessMsg('');

    try {
      const result = await deleteBackup(backupId);
      setSuccessMsg(result.message);
      setBackups(result.backups || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      <div
        className="fade-in-up"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 101,
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: 'min(580px, calc(100vh - 48px))',
          borderRadius: 20,
          background: 'var(--c-surface-2)',
          border: '1px solid var(--c-border)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--c-divider)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'rgba(251,191,36,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" fill="none" stroke="#fbbf24" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)' }}>Dataset History</div>
              <div style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 1 }}>Restore any previous default dataset</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7, border: 'none',
              background: 'var(--c-surface-hover)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--c-text-3)',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: 'var(--c-surface-hover)', border: '1px solid var(--c-error)',
              fontSize: 12, color: 'var(--c-error)', fontWeight: 600
            }}>{error}</div>
          )}

          {successMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              background: 'var(--c-surface-hover)', border: '1px solid var(--c-success)',
              fontSize: 12, color: 'var(--c-success)', fontWeight: 600
            }}>{successMsg}</div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((index) => (
                <div key={index} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
              ))}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Current Default
                </div>
                {defaultDataset ? (
                  <div style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: 'var(--c-surface-hover)',
                    border: '1px solid var(--c-success)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-success)' }}>{defaultDataset.originalName}</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 4 }}>
                      Saved {fmt(defaultDataset.setAsDefaultAt || defaultDataset.persistedAt || defaultDataset.uploadedAt)}
                      {defaultDataset.restoredAt ? ` · Restored ${fmt(defaultDataset.restoredAt)}` : ''}
                      {defaultDataset.size ? ` · ${fmtSize(defaultDataset.size)}` : ''}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--c-text-4)' }}>No default dataset is available.</div>
                )}
              </div>

              {tempDataset && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                    Pending Preview
                  </div>
                  <div style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: 'var(--c-surface-hover)',
                    border: '1px solid var(--c-info)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-info)' }}>{tempDataset.originalName}</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 4 }}>
                      Uploaded {fmt(tempDataset.uploadedAt)} · Waiting for Set as Default
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                  Backup Versions ({backups.length})
                </div>
                {backups.length === 0 ? (
                  <div style={{
                    padding: '24px 16px', borderRadius: 12, textAlign: 'center',
                    background: 'var(--c-surface-hover)', border: '1px dashed var(--c-border)',
                    fontSize: 13, color: 'var(--c-text-4)',
                  }}>
                    No saved backup dataset yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {backups.map((backup, index) => (
                      <div
                        key={backup.id || backup.filename || index}
                        style={{
                          padding: '12px 14px', borderRadius: 12,
                          background: 'var(--c-surface-hover)',
                          border: '1px solid var(--c-border)',
                          display: 'flex', alignItems: 'center', gap: 12,
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: 'rgba(99,102,241,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, color: '#818cf8',
                        }}>
                          v{backups.length - index}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {backup.originalName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 2 }}>
                            Backed up {fmt(backup.backedUpAt)}
                            {backup.uploadedAt ? ` · Original upload ${fmt(backup.uploadedAt)}` : ''}
                            {backup.size ? ` · ${fmtSize(backup.size)}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleRestore(backup.id || backup.filename)}
                            disabled={restoring === (backup.id || backup.filename) || deleting === (backup.id || backup.filename)}
                            style={{
                              padding: '6px 12px', borderRadius: 8, flexShrink: 0,
                              fontSize: 11, fontWeight: 700, border: '1px solid var(--c-info)',
                              background: 'var(--c-surface-hover)',
                              color: 'var(--c-info)',
                              cursor: (restoring === (backup.id || backup.filename) || deleting === (backup.id || backup.filename)) ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {restoring === (backup.id || backup.filename) ? 'Restoring…' : 'Restore'}
                          </button>
                          <button
                            onClick={() => handleDelete(backup.id || backup.filename, backup.originalName)}
                            disabled={restoring === (backup.id || backup.filename) || deleting === (backup.id || backup.filename)}
                            style={{
                              padding: '6px 12px', borderRadius: 8, flexShrink: 0,
                              fontSize: 11, fontWeight: 700, border: '1px solid var(--c-error)',
                              background: 'var(--c-surface-hover)',
                              color: 'var(--c-error)',
                              cursor: (restoring === (backup.id || backup.filename) || deleting === (backup.id || backup.filename)) ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {deleting === (backup.id || backup.filename) ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
