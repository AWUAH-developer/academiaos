import React, { useState } from 'react';
import DevourLogo from '../components/DevourLogo';
import { useAuth } from '../store/auth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    const res = await login(username.trim().toLowerCase(), password);
    setLoading(false);
    if (!res.ok) setError(res.error ?? 'Sign-in failed. Check your credentials.');
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, var(--chalk-dark) 0%, var(--chalk) 100%)',
    }}>
      {/* Card */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px', width: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,.25)',
      }}>
        {/* Permanent logo icon. Only the word animates on the sign-in screen. */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/brand-logo.jpg" alt="AcademiaOS logo" style={{ width: 58, height: 58, borderRadius: 16, objectFit: 'cover', marginBottom: 12 }}/>
          <DevourLogo/>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            School Command Centre
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Username</label>
            <input
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6,
              padding: '9px 12px', fontSize: 12, color: '#991b1b', fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4, justifyContent: 'center', padding: '10px' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 11, color: 'var(--text-faint)', textAlign: 'center' }}>
          Use your AcademiaOS school account credentials.
        </p>
      </div>

      <p style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
        v{window.electronAPI?.getVersion?.() ?? '1.0.0'} · Windows
      </p>
    </div>
  );
}
