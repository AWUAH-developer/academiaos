import React, { useCallback, useEffect, useState } from 'react';
import { db as localDb, type LocalStaff } from '../api/client';

function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function StaffScreen() {
  const [staff, setStaff] = useState<LocalStaff[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (query?: string) => {
    setLoading(true);
    setFailed(false);

    try {
      const response = await localDb.getStaff({ search: query });

      if (response.ok) {
        setStaff(response.staff);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
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
        <div className="empty">
          <span className="spin">⟳</span> Loading...
        </div>
      ) : failed ? (
        <div className="empty">
          <span style={{ fontSize: 32 }}>⚠️</span>
          <p>Staff records could not be loaded from the local database.</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="empty">
          <span style={{ fontSize: 32 }}>👥</span>
          <p>No staff found. Run a full initial sync to download staff records.</p>
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
              {staff.map((member) => (
                <tr key={member.id}>
                  <td style={{ fontWeight: 600 }}>{member.name}</td>

                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {member.username}
                  </td>

                  <td>{formatRole(member.role)}</td>

                  <td>
                    <span
                      className={`pill ${
                        member.status === 'ACTIVE' ? 'pill-green' : 'pill-slate'
                      }`}
                    >
                      {member.status}
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
          marginTop: 16,
          fontSize: 12,
        }}
      >
        Staff creation and role changes must be completed through the web portal.
      </p>
    </div>
  );
}
