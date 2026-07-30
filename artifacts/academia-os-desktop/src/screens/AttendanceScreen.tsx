import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  db as localDb,
  type AttendanceStatus,
  type LocalLearner,
} from '../api/client';
import { useAuth } from '../store/auth';
import type { useSyncStore } from '../store/sync';

interface Props {
  syncStore: ReturnType<typeof useSyncStore>;
}

const STATUS_OPTS: AttendanceStatus[] = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
  'HALF_DAY',
];

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  PRESENT: 'pill-green',
  ABSENT: 'pill-red',
  LATE: 'pill-amber',
  EXCUSED: 'pill-blue',
  HALF_DAY: 'pill-slate',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendanceScreen({ syncStore }: Props) {
  const { authState } = useAuth();
  const [learners, setLearners] = useState<LocalLearner[]>([]);
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [scanCode, setScanCode] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [scanError, setScanError] = useState(false);
  const scanInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await localDb.getLearners();
    if (result.ok) setLearners(result.learners);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAttendance(
    learnerId: string,
    status: AttendanceStatus,
  ) {
    if (authState.status !== 'authenticated') return false;
    const { user } = authState;
    if (!user.school) return false;

    setSaving((value) => ({ ...value, [learnerId]: true }));
    setAttendance((value) => ({ ...value, [learnerId]: status }));

    const result = await localDb.saveAttendance({
      learnerId,
      date,
      status,
      schoolId: user.school.id,
      userId: user.id,
      deviceId: 'desktop',
    });

    setSaving((value) => ({ ...value, [learnerId]: false }));

    if (!result.ok) return false;

    setSaved((value) => ({ ...value, [learnerId]: true }));
    window.setTimeout(() => {
      setSaved((value) => ({ ...value, [learnerId]: false }));
    }, 2000);

    void syncStore.refreshStatus();
    return true;
  }

  async function scanBarcode(event: React.FormEvent) {
    event.preventDefault();
    const code = scanCode.trim().toLowerCase();

    if (!code) {
      scanInput.current?.focus();
      return;
    }

    const learner = learners.find((item) =>
      String(item.badge_code ?? '').trim().toLowerCase() === code ||
      String(item.admission_no ?? '').trim().toLowerCase() === code,
    );

    if (!learner) {
      setScanError(true);
      setScanMessage(`No learner found for barcode: ${scanCode.trim()}`);
      setScanCode('');
      scanInput.current?.focus();
      return;
    }

    const success = await markAttendance(learner.id, 'PRESENT');
    setScanError(!success);
    setScanMessage(
      success
        ? `${learner.first_name} ${learner.last_name} marked PRESENT`
        : `Could not save attendance for ${learner.first_name} ${learner.last_name}`,
    );
    setScanCode('');
    scanInput.current?.focus();
  }

  if (loading) {
    return (
      <div className="empty">
        <span className="spin">⟳</span> Loading…
      </div>
    );
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
          <h1>Attendance & Barcode Scanner</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Records save locally and sync when online · {learners.length} learners
          </p>
        </div>

        <input
          className="input"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          style={{ width: 'auto' }}
        />
      </div>

      {!syncStore.status.online && (
        <div
          style={{
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 12,
            fontWeight: 600,
            color: '#92400e',
          }}
        >
          ⚠ Offline. Attendance will sync automatically when connected.
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
          Barcode Attendance Scanner scanner · v1.0.10
        </div>

        <form
          onSubmit={scanBarcode}
          style={{ display: 'flex', gap: 10, alignItems: 'center' }}
        >
          <input
            ref={scanInput}
            className="input"
            value={scanCode}
            onChange={(event) => {
              setScanCode(event.target.value);
              setScanMessage('');
            }}
            placeholder="Scan learner barcode or enter admission number…"
            autoComplete="off"
            autoFocus
            style={{ flex: 1 }}
          />

          <button
            type="submit"
            style={{
              minWidth: 130,
              padding: '10px 14px',
              border: 0,
              borderRadius: 8,
              background: 'var(--chalk)',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Scan Barcode & Scan Barcode & Mark Present
          </button>
        </form>

        <div
          style={{
            marginTop: 8,
            minHeight: 18,
            color: scanError ? '#b91c1c' : 'var(--success)',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {scanMessage ||
            'USB barcode scanners work automatically. Scan and press Enter.'}
        </div>
      </div>

      {learners.length === 0 ? (
        <div className="empty">
          <p>No learner records. Run a sync first.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Learner</th>
                <th>Admission No.</th>
                <th>Status</th>
                <th>Mark</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((learner) => {
                const current = attendance[learner.id];

                return (
                  <tr key={learner.id}>
                    <td style={{ fontWeight: 600 }}>
                      {learner.first_name} {learner.last_name}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {learner.admission_no}
                    </td>
                    <td>
                      {current && (
                        <span className={`pill ${STATUS_COLOR[current]}`}>
                          {current}
                        </span>
                      )}
                      {saved[learner.id] && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            color: 'var(--success)',
                          }}
                        >
                          ✓ saved
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {STATUS_OPTS.map((status) => (
                          <button
                            key={status}
                            onClick={() => {
                              void markAttendance(learner.id, status);
                            }}
                            disabled={saving[learner.id]}
                            title={status.replace('_', ' ')}
                            style={{
                              padding: '3px 8px',
                              borderRadius: 4,
                              border: '1px solid var(--border)',
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: 'pointer',
                              background:
                                current === status
                                  ? 'var(--chalk)'
                                  : 'var(--surface)',
                              color:
                                current === status
                                  ? '#fff'
                                  : 'var(--text)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {status.charAt(0)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
