import React, { useState } from 'react';
import * as authService from '../services/authService';

export default function AuthModal({ visible, onClose }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!visible) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signup') {
        await authService.signup({ name, email, password });
      } else {
        await authService.login({ email, password });
      }
      onClose();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="history-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h3>{mode === 'signup' ? 'Sign up' : 'Login'}</h3>
          <button className="btn small" onClick={onClose}>Close</button>
        </div>
        <div className="history-body">
          <form onSubmit={submit} style={{ display: 'grid', gap: '0.5rem' }}>
            {mode === 'signup' && (
              <>
                <label>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </>
            )}

            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />

            <label>Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" />

            {error && <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="btn primary" disabled={loading}>{loading ? 'Please wait...' : (mode === 'signup' ? 'Sign up' : 'Login')}</button>
              <button type="button" className="btn" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Switch to Login' : 'Switch to Sign up'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
