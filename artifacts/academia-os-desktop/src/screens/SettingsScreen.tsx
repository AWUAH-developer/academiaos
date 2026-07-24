import React from 'react';
import { useAuth } from '../store/auth';

export default function SettingsScreen() {
  const { authState, logout } = useAuth();
  if (authState.status !== 'authenticated') return null;
  const { user } = authState;

  return (
    <div style={{ maxWidth: 540 }}>
      <h1>Settings</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 4, marginBottom: 24, fontSize: 13 }}>
        Account and application settings.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 14 }}>Account</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <Row label="Name"     value={user.name} />
          <Row label="Username" value={user.username} />
          <Row label="Role"     value={user.role.replace(/_/g, ' ')} />
          <Row label="School"   value={user.school?.name ?? '—'} />
          <Row label="Email"    value={user.email ?? '—'} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 14 }}>Application</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <Row label="Version"  value={window.electronAPI?.getVersion?.() ?? '1.0.0'} />
          <Row label="Platform" value={window.electronAPI?.getPlatform?.() ?? process.platform} />
          <Row label="API"      value="https://academiaos.cc/api/desktop/v1" />
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 14, color: 'var(--danger)' }}>Session</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
          Signing out revokes this device's session on the server and clears all stored tokens.
          Local cached data remains encrypted on disk.
        </p>
        <button className="btn btn-danger" onClick={logout}>Sign out of AcademiaOS</button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: label === 'API' || label === 'Version' ? 'monospace' : undefined, fontSize: label === 'API' ? 11 : 13 }}>{value}</span>
    </div>
  );
}
