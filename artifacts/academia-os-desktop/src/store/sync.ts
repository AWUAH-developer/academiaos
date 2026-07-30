import { useState, useEffect, useCallback, useRef } from 'react';
import { sync as syncApi, type SyncCursor } from '../api/client';

export type SyncStatus = {
  online: boolean;
  lastSyncedAt: string | null;
  pendingOps: number;
  conflictCount: number;
  cursors: SyncCursor[];
  syncing: boolean;
};

const SYNC_INTERVAL_MS = 5 * 60_000; // 5 minutes

export function useSyncStore() {
  const [status, setStatus] = useState<SyncStatus>({
    online: navigator.onLine, lastSyncedAt: null,
    pendingOps: 0, conflictCount: 0, cursors: [], syncing: false,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track online/offline
  useEffect(() => {
    const setOnline  = () => setStatus((s) => ({ ...s, online: true }));
    const setOffline = () => setStatus((s) => ({ ...s, online: false }));
    window.addEventListener('online',  setOnline);
    window.addEventListener('offline', setOffline);
    return () => { window.removeEventListener('online', setOnline); window.removeEventListener('offline', setOffline); };
  }, []);

  const refreshStatus = useCallback(async () => {
    const res = await syncApi.status();
    if (res.ok) {
      setStatus((s) => ({
        ...s,
        pendingOps:    res.pendingOps,
        conflictCount: res.conflictCount,
        cursors:       res.cursors,
        lastSyncedAt:  res.cursors[0]?.last_synced ?? s.lastSyncedAt,
      }));
    }
  }, []);

  const runSync = useCallback(async () => {
    setStatus((s) => ({ ...s, syncing: true }));
    try {
      // Upload pending outbox first
      await syncApi.uploadOutbox();
      // Then pull incremental changes
      const statusRes = await syncApi.status();
      const cursors = statusRes.ok ? statusRes.cursors : [];
      const cursor = cursors.find(
        (c) => c.entity_type === 'learners',
      )?.last_synced;
      const classesReady = cursors.some(
        (c) => c.entity_type === 'classes',
      );

      if (!cursor || !classesReady) {
        await syncApi.initial();
      } else {
        await syncApi.incremental(cursor);
      }
      await refreshStatus();
    } finally {
      setStatus((s) => ({ ...s, syncing: false }));
    }
  }, [refreshStatus]);

  // Auto-sync on interval when online
  useEffect(() => {
    refreshStatus();
    timerRef.current = setInterval(() => {
      if (navigator.onLine) runSync();
    }, SYNC_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [runSync, refreshStatus]);

  return { status, runSync, refreshStatus };
}
