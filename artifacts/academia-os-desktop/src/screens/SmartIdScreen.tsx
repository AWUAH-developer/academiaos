import React, { useState } from 'react';
import { db as localDb, type LocalLearner } from '../api/client';

export default function SmartIdScreen() {
  const [query, setQuery]       = useState('');
  const [result, setResult]     = useState<LocalLearner | null | 'not-found'>(null);
  const [loading, setLoading]   = useState(false);

  async function scan() {
    if (!query.trim()) return;
    setLoading(true);
    const res = await localDb.getLearners({ search: query.trim() });
    setLoading(false);
    if (res.ok && res.learners.length > 0) {
      setResult(res.learners[0]);
    } else {
      setResult('not-found');
    }
  }

  return (
    <div style={{ maxWidth: 540 }}>
      <h1>Smart ID</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 4, marginBottom: 24, fontSize: 13 }}>
        Scan or enter a badge code or name to look up a learner — works offline.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          className="input"
          placeholder="Badge code or learner name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && scan()}
          autoFocus
        />
        <button className="btn btn-primary" onClick={scan} disabled={loading}>
          {loading ? '…' : 'Look up'}
        </button>
      </div>

      {result === 'not-found' && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 32 }}>🔍</div>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>No learner found for "{query}"</p>
        </div>
      )}

      {result && result !== 'not-found' && (
        <div className="card" style={{ borderLeft: '4px solid var(--chalk)' }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>{result.first_name} {result.last_name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Admission: {result.admission_no} · {result.gender ?? '—'}
          </div>
          <div style={{ marginTop: 10 }}>
            <span className={`pill ${result.status === 'ACTIVE' ? 'pill-green' : 'pill-red'}`}>{result.status}</span>
            {result.badge_code && (
              <span style={{ marginLeft: 10, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                Badge: {result.badge_code}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
