import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  sync as syncApi,
  type SyncCursor,
} from '../api/client';

export type SyncStatus = {
  online: boolean;
  lastSyncedAt: string | null;
  pendingOps: number;
  conflictCount: number;
  cursors: SyncCursor[];
  syncing: boolean;
};

const SYNC_INTERVAL_MS = 5 * 60_000;

export function useSyncStore() {
  const [status, setStatus] = useState<SyncStatus>({
    online: navigator.onLine,
    lastSyncedAt: null,
    pendingOps: 0,
    conflictCount: 0,
    cursors: [],
    syncing: false,
  });

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const setOnline = () =>
      setStatus((current) => ({
        ...current,
        online: true,
      }));

    const setOffline = () =>
      setStatus((current) => ({
        ...current,
        online: false,
      }));

    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);

    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    const result = await syncApi.status();

    if (result.ok) {
      setStatus((current) => ({
        ...current,
        pendingOps: result.pendingOps,
        conflictCount: result.conflictCount,
        cursors: result.cursors,
        lastSyncedAt:
          result.cursors[0]?.last_synced ??
          current.lastSyncedAt,
      }));
    }
  }, []);

  const runInitialSync = useCallback(async () => {
    setStatus((current) => ({
      ...current,
      syncing: true,
    }));

    try {
      const result = await syncApi.initial();
      await refreshStatus();
      return result;
    } finally {
      setStatus((current) => ({
        ...current,
        syncing: false,
      }));
    }
  }, [refreshStatus]);

  const runSync = useCallback(async () => {
    setStatus((current) => ({
      ...current,
      syncing: true,
    }));

    try {
      await syncApi.uploadOutbox();

      const statusResult = await syncApi.status();
      const cursors = statusResult.ok
        ? statusResult.cursors
        : [];

      const learnerCursor = cursors.find(
        (cursor) => cursor.entity_type === 'learners',
      )?.last_synced;

      const classesReady = cursors.some(
        (cursor) => cursor.entity_type === 'classes',
      );

      const staffReady = cursors.some(
        (cursor) => cursor.entity_type === 'staff',
      );

      if (
        !learnerCursor ||
        !classesReady ||
        !staffReady
      ) {
        await syncApi.initial();
      } else {
        await syncApi.incremental(learnerCursor);
      }

      await refreshStatus();
    } finally {
      setStatus((current) => ({
        ...current,
        syncing: false,
      }));
    }
  }, [refreshStatus]);

  useEffect(() => {
    void refreshStatus();

    timerRef.current = setInterval(() => {
      if (navigator.onLine) {
        void runSync();
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [runSync, refreshStatus]);

  return {
    status,
    runSync,
    runInitialSync,
    refreshStatus,
  };
}
