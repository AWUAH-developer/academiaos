import React, { useState } from 'react';
import { sync as syncApi } from '../api/client';
import type { useSyncStore } from '../store/sync';

interface Props { syncStore: ReturnType<typeof useSyncStore> }

export default function SyncScreen({ syncStore }: Props) {
  const { status, runSync, refreshStatus } = syncStore;
  const [initialising, setInitialising] = useState(false);
  const [initResult, setInitResult] = useState<string | null>(null);

  async function doInitialSync() {
    setInitialising(true);
    setInitResult(null);
    const res = await syncApi.initial();
    if (res.ok) {
      // res.data is InitialSyncData — { syncCursor, school, classes, ..., counts }
      // counts comes from the server's counts object and is Record<string, number>
      setInitResult(`✓ Downloaded ${res.data.counts.learners ?? 0} learners and reference data.`);
      await refreshStatus();
    } else {
      setInitResult(`✗ Sync failed. ${res.error?.message ?? ''}`);
    }
    setInitialising(false);
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ marginBottom: 4 }}>Offline &amp; Sync</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 13 }}>
        Manage local data and synchronise with the AcademiaOS server.
      </p>

      {/* Status cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Connection</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: status.online ? 'var(--success)' : 'var(--danger)' }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>{status.online ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Pending operations</div>
          <span style={{ fontWeight: 900, fontSize: 24, color: status.pendingOps > 0 ? 'var(--warning)' : 'var(--success)' }}>{status.pendingOps}</span>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Conflicts</div>
          <span style={{ fontWeight: 900, fontSize: 24, color: status.conflictCount > 0 ? 'var(--danger)' : 'var(--success)' }}>{status.conflictCount}</span>
        </div>
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Last synced</div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            {status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : 'Never'}
          </span>
        </div>
      </div>

      {/* Sync cursors */}
      {status.cursors.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 12 }}>Local cache</h2>
          <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Entity</th><th>Records</th><th>Last sync</th></tr></thead>
            <tbody>
              {status.cursors.map((c) => (
                <tr key={c.entity_type}>
                  <td style={{ textTransform: 'capitalize' }}>{c.entity_type}</td>
                  <td>{c.record_count}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.last_synced).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="card">
        <h2 style={{ marginBottom: 14 }}>Actions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary" onClick={runSync} disabled={status.syncing || !status.online}>
            {status.syncing ? '⟳ Syncing…' : '⟳ Run incremental sync'}
          </button>
          <button className="btn btn-secondary" onClick={doInitialSync} disabled={initialising || !status.online}>
            {initialising ? '⟳ Downloading…' : '↓ Full initial sync (re-download all data)'}
          </button>
        </div>
        {initResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--chalk-50)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'var(--chalk-dark)' }}>
            {initResult}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, padding: '12px 14px', background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
        <strong>Note:</strong> High-risk operations (final financial postings, approvals, result publication) require an active server connection and must be completed through the web interface.
      </div>
    </div>
  );
}
