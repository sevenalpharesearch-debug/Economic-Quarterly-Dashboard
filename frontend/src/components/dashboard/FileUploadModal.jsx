import { useState, useRef, useCallback } from 'react';
import { uploadPreviewFile } from '../../api/dashboard';

export default function FileUploadModal({ onClose, onSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  const handleFile = (nextFile) => {
    if (!nextFile) return;
    const ext = nextFile.name.toLowerCase();
    if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls') && !ext.endsWith('.csv')) {
      setStatus('error');
      setMessage('Invalid file type. Please upload .xlsx, .xls, or .csv files only.');
      return;
    }
    setFile(nextFile);
    setStatus('idle');
    setMessage('');
  };

  const onDrop = useCallback((event) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files[0]);
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setMessage('');

    try {
      const form = new FormData();
      form.append('file', file);

      const result = await uploadPreviewFile(form);
      setStatus('success');
      setMessage('Preview loaded. Review the dashboard, then choose Set as Default if you want to keep it.');
      setTimeout(() => onSuccess(result), 700);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Upload failed. Please check the file format.');
    }
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setMessage('');
    if (inputRef.current) inputRef.current.value = '';
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
          width: 'min(520px, calc(100vw - 32px))',
          borderRadius: 20,
          background: 'var(--c-surface-2)',
          border: '1px solid var(--c-border)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--c-divider)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'rgba(99,102,241,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" fill="none" stroke="#818cf8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)' }}>Upload Data for Preview</div>
              <div style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 1 }}>The current default stays unchanged until you confirm.</div>
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

        <div style={{ padding: '20px 24px 24px' }}>
          <div
            onDrop={onDrop}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#6366f1' : file ? 'rgba(16,185,129,0.5)' : 'var(--c-border)'}`,
              borderRadius: 14,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: dragging
                ? 'rgba(99,102,241,0.06)'
                : file
                  ? 'rgba(16,185,129,0.05)'
                  : 'var(--c-surface-hover)',
              marginBottom: 16,
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={(event) => handleFile(event.target.files[0])}
            />

            {file ? (
              <>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, margin: '0 auto 12px',
                  background: 'var(--c-surface-hover)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="22" height="22" fill="none" stroke="var(--c-success)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-success)', marginBottom: 4 }}>{file.name}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-4)' }}>
                  {(file.size / 1024).toFixed(1)} KB · Click to change
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, margin: '0 auto 12px',
                  background: 'rgba(99,102,241,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="22" height="22" fill="none" stroke="#818cf8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-2)', marginBottom: 6 }}>
                  {dragging ? 'Drop your file here' : 'Drag & drop your data file here'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--c-text-4)' }}>
                  or click to browse · .xlsx, .xls, .csv · max 50MB
                </div>
              </>
            )}
          </div>

          <div style={{
            padding: '10px 14px', borderRadius: 10, marginBottom: 16,
            background: 'var(--c-surface-hover)', border: '1px solid var(--c-border)',
            fontSize: 11, color: 'var(--c-text-3)', lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--c-info)', fontWeight: 700 }}>Upload flow:</strong> the file is parsed and saved as a temporary preview.
            Nothing becomes the new default until you click <strong>Set as Default</strong> on the dashboard.
          </div>

          {message && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 14px', borderRadius: 10, marginBottom: 16,
              fontSize: 12, lineHeight: 1.5,
              background: 'var(--c-surface-hover)',
              border: `1px solid ${status === 'error' ? 'var(--c-error)' : 'var(--c-success)'}`,
              color: status === 'error' ? 'var(--c-error)' : 'var(--c-success)',
              fontWeight: 600,
            }}>
              <svg style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {status === 'error'
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                }
              </svg>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            {file && status !== 'success' && (
              <button
                onClick={reset}
                style={{
                  flex: '0 0 auto', padding: '10px 16px', borderRadius: 10,
                  fontSize: 13, fontWeight: 500,
                  background: 'var(--c-surface-hover)',
                  border: '1px solid var(--c-border)',
                  color: 'var(--c-text-3)', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Clear
              </button>
            )}
            <button
              onClick={handleUpload}
              disabled={!file || status === 'uploading' || status === 'success'}
              style={{
                flex: 1, padding: '10px 20px', borderRadius: 10,
                fontSize: 13, fontWeight: 600, border: 'none',
                cursor: !file || status === 'uploading' || status === 'success' ? 'not-allowed' : 'pointer',
                opacity: !file || status === 'success' ? 0.5 : 1,
                background: status === 'success' ? 'var(--c-surface-hover)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: status === 'success' ? 'var(--c-success)' : '#fff',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: !file || status === 'success' ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
              }}
            >
              {status === 'uploading' ? 'Processing...' : status === 'success' ? 'Preview Ready' : 'Upload for Preview'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
