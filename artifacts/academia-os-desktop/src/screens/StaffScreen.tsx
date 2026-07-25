import React, { useCallback, useEffect, useState } from 'react';
import { db as localDb, type LocalStaff } from '../api/client';

export default function StaffScreen() {
  const [staff, setStaff] = useState<LocalStaff[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    const res = await localDb.getStaff({ search: q });
    if (res.ok) setStaff(res.staff);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearch(value);
    load(value || undefined);
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div>
          <h1>Staff</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Local cache · {staff.length} records
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          className="input"
          placeholder="Search by name, username or role..."
          value={search}
          onChange={handleSearch}
          style={{ maxWidth: 340 }}
        />
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : staff.length === 0 ? (
        <div className="empty">
          <span style={{ fontSize: 32 }}>👥</span>
          <p>No staff found. Run a Full Initial Sync to download staff records.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {s.username || '—'}
                  </td>
                  <td>{s.role ? s.role.replace(/_/g, ' ') : '—'}</td>
                  <td>
                    <span
                      className={
                        s.status === 'ACTIVE'
                          ? 'pill pill-green'
                          : 'pill pill-slate'
                      }
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p
        style={{
          color: 'var(--text-muted)',
          fontSize: 12,
          marginTop: 16,
        }}
      >
        Staff creation, role changes and account management remain server-controlled.
      </p>
    </div>
  );
}
