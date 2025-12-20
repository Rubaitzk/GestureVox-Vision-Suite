import React, { useState } from 'react';
import * as authService from '../services/authService';
import { User, Mail, Lock } from 'lucide-react';

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
    // Client-side validation
    const emailLower = (email || '').toLowerCase();
    if (!emailLower.endsWith('@gmail.com')) {
      setError('Email must be a @gmail.com address');
      setLoading(false);
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }
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
        <div className="history-header auth-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="auth-header-icon">
              {mode === 'signup' ? <User /> : <Lock />}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h3>
              <p className="auth-subtitle">{mode === 'signup' ? 'Sign up to save history & preferences' : 'Sign in to continue'}</p>
            </div>
          </div>
          <button className="btn small" onClick={onClose}>Close</button>
        </div>

        <div className="history-body auth-body">
          <form onSubmit={submit} className="auth-modal-content">
            {mode === 'signup' && (
              <div className="auth-field">
                <User className="auth-field-icon" />
                <input className="auth-input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}

            <div className="auth-field">
              <Mail className="auth-field-icon" />
              <input className="auth-input" placeholder="your.email@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
            </div>

            <div className="auth-field">
              <Lock className="auth-field-icon" />
              <input className="auth-input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required type="password" />
            </div>

            {error && <div className="muted error-text">{error}</div>}

            <div className="auth-actions">
              <button className="btn primary auth-submit" disabled={loading}>{loading ? 'Please wait...' : (mode === 'signup' ? 'Create account' : 'Sign in')}</button>
              <button type="button" className="btn" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Have an account? Login' : "Don't have an account? Sign up"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
