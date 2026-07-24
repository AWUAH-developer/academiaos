import React from 'react';

interface Props {
  online: boolean; lastSynced: string | null; pendingOps: number;
  conflictCount: number; syncing: boolean; role: string; packageName: string;
  onSync(): void;
}

function fmt(iso: string | null) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function StatusBar({ online, lastSynced, pendingOps, conflictCount, syncing, onSync, role }: Props) {
  return (
    <div style={{
      height: 'var(--statusbar-h)', background: 'var(--chalk)', color: 'rgba(255,255,255,.85)',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 18,
      fontSize: 11, fontWeight: 500, userSelect: 'none',
    }}>
      {/* Online indicator */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: online ? '#4ade80' : '#f87171' }} />
        {online ? 'Online' : 'Offline'}
      </span>

      <span style={{ opacity: .35 }}>·</span>

      {/* Last sync */}
      <span>Synced {fmt(lastSynced)}</span>

      {/* Pending ops */}
      {pendingOps > 0 && (
        <>
          <span style={{ opacity: .35 }}>·</span>
          <span style={{ color: '#fde68a' }}>{pendingOps} pending</span>
        </>
      )}

      {/* Conflicts */}
      {conflictCount > 0 && (
        <>
          <span style={{ opacity: .35 }}>·</span>
          <span style={{ color: '#fca5a5' }}>{conflictCount} conflict{conflictCount !== 1 ? 's' : ''}</span>
        </>
      )}

      <span style={{ flex: 1 }} />

      {/* Role */}
      <span style={{ opacity: .55 }}>{role.replace('_', ' ')}</span>

      {/* Sync button */}
      <button
        onClick={onSync}
        disabled={syncing || !online}
        style={{
          background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff',
          padding: '2px 9px', borderRadius: 3, fontSize: 11, cursor: 'pointer',
          fontWeight: 600, opacity: (syncing || !online) ? .45 : 1,
        }}
      >
        {syncing ? '⟳ Syncing…' : '⟳ Sync'}
      </button>
    </div>
  );
}
