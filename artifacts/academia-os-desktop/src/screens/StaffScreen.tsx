import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  db as localDb,
  type LocalStaff,
} from '../api/client';
import type { useSyncStore } from '../store/sync';

interface Props {
  syncStore: ReturnType<typeof useSyncStore>;
}

function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

export default function StaffScreen({
  syncStore,
}: Props) {
  const [staff, setStaff] = useState<LocalStaff[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [syncError, setSyncError] = useState('');

  const wasSyncingRef = useRef(
    syncStore.status.syncing,
  );

  const load = useCallback(
    async (query?: string): Promise<number> => {
      setLoading(true);
      setFailed(false);

      try {
        const response = await localDb.getStaff({
          search: query,
        });

        if (response.ok) {
          setStaff(response.staff);
          return response.staff.length;
        }

        setFailed(true);
        return 0;
      } catch {
        setFailed(true);
        return 0;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const wasSyncing = wasSyncingRef.current;
    wasSyncingRef.current =
      syncStore.status.syncing;

    if (
      wasSyncing &&
      !syncStore.status.syncing
    ) {
      void load(search || undefined);
    }
  }, [
    syncStore.status.syncing,
    load,
    search,
  ]);

  async function handleFullSync() {
    setSyncError('');

    try {
      const result =
        await syncStore.runInitialSync();

      if (!result.ok) {
        setSyncError(
          result.error?.message ??
            'Staff sync failed. Check the connection and try again.',
        );
        return;
      }

      const count = await load(
        search || undefined,
      );

      if (count === 0) {
        setSyncError(
          'Sync completed, but no active staff records were returned for this school.',
        );
      }
    } catch {
      setSyncError(
        'Staff sync failed. Check the connection and try again.',
      );
    }
  }

  function handleSearch(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const value = event.target.value;
    setSearch(value);
    void load(value || undefined);
  }

  const busy =
    loading || syncStore.status.syncing;

  return (
    <div style={{ maxWidth: 960 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h1>Staff</h1>

          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            Local cache · {staff.length} records
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !syncStore.status.online}
          onClick={() => {
            void handleFullSync();
          }}
        >
          {syncStore.status.syncing
            ? 'Syncing…'
            : 'Sync staff'}
        </button>
      </div>

      {!syncStore.status.online && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            border: '1px solid #fde68a',
            borderRadius: 8,
            color: '#92400e',
            background: '#fef3c7',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Connect to the internet to download staff records.
        </div>
      )}

      {syncError && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#991b1b',
            background: '#fef2f2',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {syncError}
        </div>
      )}

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
          <span className="spin">⟳</span>{' '}
          Loading...
        </div>
      ) : failed ? (
        <div className="empty">
          <span style={{ fontSize: 32 }}>⚠️</span>

          <p>
            Staff records could not be loaded from
            the local database.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => {
              void load(search || undefined);
            }}
          >
            Retry
          </button>
        </div>
      ) : staff.length === 0 ? (
        <div className="empty">
          <span style={{ fontSize: 32 }}>👥</span>

          <p>
            No cached staff records are available.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            disabled={
              busy || !syncStore.status.online
            }
            onClick={() => {
              void handleFullSync();
            }}
          >
            {syncStore.status.syncing
              ? 'Syncing…'
              : 'Download staff'}
          </button>
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
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
                    <td style={{ fontWeight: 600 }}>
                      {member.name}
                    </td>

                    <td
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                    >
                      {member.username}
                    </td>

                    <td>
                      {formatRole(member.role)}
                    </td>

                    <td>
                      <span
                        className={`pill ${
                          member.status === 'ACTIVE'
                            ? 'pill-green'
                            : 'pill-slate'
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
        </div>
      )}

      <p
        style={{
          color: 'var(--text-muted)',
          marginTop: 16,
          fontSize: 12,
        }}
      >
        Staff creation and role changes must be
        completed through the web portal.
      </p>
    </div>
  );
}
