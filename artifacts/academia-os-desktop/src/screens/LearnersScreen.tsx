import React, { useEffect, useState, useCallback } from 'react';
import { db as localDb, type LocalLearner } from '../api/client';
import { formatClassDisplay } from '../utils/classDisplay';

export default function LearnersScreen() {
  const [learners, setLearners] = useState<LocalLearner[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    const res = await localDb.getLearners({ search: q });
    if (res.ok) setLearners(res.learners);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    load(e.target.value || undefined);
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1>Learners</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Local cache · {learners.length} records</p>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          className="input"
          placeholder="Search by name or admission number…"
          value={search}
          onChange={handleSearch}
          style={{ maxWidth: 340 }}
        />
      </div>

      {loading ? (
        <div className="empty"><span className="spin">⟳</span> Loading…</div>
      ) : learners.length === 0 ? (
        <div className="empty">
          <span style={{ fontSize: 32 }}>👩‍🎓</span>
          <p>No learners found. Run a sync to download learner records.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Admission No.</th>
                <th>Class</th>
                <th>Gender</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.first_name} {l.last_name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{l.admission_no}</td>
                  <td>{formatClassDisplay(l.class_name, l.class_stream, l.class_id)}</td>
                  <td>{l.gender ?? '—'}</td>
                  <td>
                    <span className={`pill ${l.status === 'ACTIVE' ? 'pill-green' : 'pill-slate'}`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
