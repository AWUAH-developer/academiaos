/**
 * AttendanceScreen — learner and staff attendance with barcode scanning.
 *
 * Learner tab: BarcodeScanner validates school/active status/card, then records
 * attendance via scanner:recordLearnerAttendance IPC (which saves locally and
 * queues for sync). Duplicate arrival protection is enforced server-side.
 *
 * Staff tab: visible only to SECURITY role or configured attendance officer.
 * Calls scanner:recordStaffAttendance. No self-scan permitted.
 */
import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  db as localDb,
  scanner as scannerApi,
  type AttendanceStatus,
  type LocalLearner,
  type LearnerSummary,
  type StaffSummary,
} from '../api/client';
import BarcodeScanner, { type ScannerStatus } from '../components/BarcodeScanner';
import { useAuth } from '../store/auth';
import type { useSyncStore } from '../store/sync';
import { formatClassDisplay } from '../utils/classDisplay';

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
  PRESENT:  'pill-green',
  ABSENT:   'pill-red',
  LATE:     'pill-amber',
  EXCUSED:  'pill-blue',
  HALF_DAY: 'pill-slate',
};

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/** Roles allowed to record staff attendance */
const STAFF_ATTENDANCE_ROLES = new Set([
  'SECURITY',
  'SECURITY_OFFICER',
  'ATTENDANCE_OFFICER',
  'HEADTEACHER',
  'SCHOOL_ADMIN',
  'SUPER_ADMIN',
]);

type Tab = 'learner' | 'staff';

// ── Learner scan result display ───────────────────────────────────────────────
interface ScanResult {
  learner: LearnerSummary;
  status: 'saved' | 'duplicate' | 'error';
  message: string;
  time: string;
}

// ── Staff scan result display ─────────────────────────────────────────────────
interface StaffScanResult {
  staff: StaffSummary;
  status: 'saved' | 'error';
  message: string;
  time: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AttendanceScreen({ syncStore }: Props) {
  const { authState } = useAuth();

  const [tab, setTab] = useState<Tab>('learner');
  const [learners, setLearners] = useState<LocalLearner[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState(todayIso());
  const [loading, setLoading] = useState(true);

  // Learner scanner state
  const [learnerScanStatus, setLearnerScanStatus] = useState<ScannerStatus>('ready');
  const [learnerScanMessage, setLearnerScanMessage] = useState<string | undefined>(undefined);
  const [lastLearnerResult, setLastLearnerResult] = useState<ScanResult | null>(null);

  // Staff scanner state
  const [staffScanStatus, setStaffScanStatus] = useState<ScannerStatus>('ready');
  const [staffScanMessage, setStaffScanMessage] = useState<string | undefined>(undefined);
  const [lastStaffResult, setLastStaffResult] = useState<StaffScanResult | null>(null);
  const [staffAttendanceType, setStaffAttendanceType] = useState<'ARRIVAL' | 'DEPARTURE'>('ARRIVAL');

  const isAuthenticated = authState.status === 'authenticated';
  const user = isAuthenticated ? authState.user : null;

  const isAuthorisedStaffOfficer =
    isAuthenticated &&
    user != null &&
    STAFF_ATTENDANCE_ROLES.has(user.role);

  // ── Load learners for manual table ────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const result = await localDb.getLearners();
    if (result.ok) setLearners(result.learners);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Manual table attendance ───────────────────────────────────────────────
  async function markAttendance(learnerId: string, status: AttendanceStatus) {
    if (!isAuthenticated || !user?.school) return false;

    setSaving((v) => ({ ...v, [learnerId]: true }));
    setAttendance((v) => ({ ...v, [learnerId]: status }));

    const result = await localDb.saveAttendance({
      learnerId, date, status,
      schoolId: user.school.id,
      userId:   user.id,
      deviceId: 'desktop',
    });

    setSaving((v) => ({ ...v, [learnerId]: false }));
    if (!result.ok) return false;

    setSaved((v) => ({ ...v, [learnerId]: true }));
    window.setTimeout(() => {
      setSaved((v) => ({ ...v, [learnerId]: false }));
    }, 2000);

    void syncStore.refreshStatus();
    return true;
  }

  // ── Learner barcode scan ──────────────────────────────────────────────────
  async function handleLearnerScan(token: string) {
    if (!isAuthenticated || !user?.school) return;

    setLearnerScanStatus('processing');
    setLearnerScanMessage('Validating card…');
    setLastLearnerResult(null);

    const res = await scannerApi.recordLearnerAttendance({
      cardToken: token,
      date,
    });

    const time = new Date().toLocaleTimeString();

    if (res.ok) {
      setLearnerScanStatus('found-learner');
      setLearnerScanMessage(undefined);
      const learnerData = res.learner!;
      const name = `${String(learnerData.first_name ?? '')} ${String(learnerData.last_name ?? '')}`.trim();
      setLastLearnerResult({
        learner: learnerData,
        status:  'saved',
        message: `${name} marked PRESENT`,
        time,
      });
      // Update the local table display too
      const learnerId = String(learnerData.id ?? '');
      if (learnerId) {
        setAttendance((v) => ({ ...v, [learnerId]: 'PRESENT' }));
        setSaved((v) => ({ ...v, [learnerId]: true }));
        window.setTimeout(() => setSaved((v) => ({ ...v, [learnerId]: false })), 2000);
      }
      void syncStore.refreshStatus();

      // Reset status after 3 s
      window.setTimeout(() => {
        setLearnerScanStatus('ready');
        setLearnerScanMessage(undefined);
      }, 3000);
    } else {
      const code = res.error?.code ?? '';
      let scanSt: ScannerStatus = 'error';
      if (code === 'ALREADY_RECORDED') scanSt = 'duplicate';
      else if (['INVALID_TOKEN', 'CARD_INACTIVE', 'WRONG_SCHOOL', 'NOT_LEARNER'].includes(code)) scanSt = 'invalid';
      else if (['LEARNER_NOT_FOUND'].includes(code)) scanSt = 'not-found';
      else if (['LEARNER_INACTIVE'].includes(code)) scanSt = 'invalid';

      const msg = res.error?.message ?? 'Could not record attendance.';
      setLearnerScanStatus(scanSt);
      setLearnerScanMessage(msg);

      // Show learner info even on duplicate
      const dupLearner = (res as { learner?: LearnerSummary }).learner;
      if (dupLearner) {
        setLastLearnerResult({ learner: dupLearner, status: 'duplicate', message: msg, time });
      }

      window.setTimeout(() => {
        setLearnerScanStatus('ready');
        setLearnerScanMessage(undefined);
      }, 4000);
    }
  }

  // ── Staff barcode scan ────────────────────────────────────────────────────
  async function handleStaffScan(token: string) {
    if (!isAuthenticated || !user?.school) return;
    if (!isAuthorisedStaffOfficer) return;

    setStaffScanStatus('processing');
    setStaffScanMessage('Validating staff card…');
    setLastStaffResult(null);

    const res = await scannerApi.recordStaffAttendance({
      cardToken: token,
      date,
      type:      staffAttendanceType,
    });

    const time = new Date().toLocaleTimeString();

    if (res.ok) {
      setStaffScanStatus('found-staff');
      setStaffScanMessage(undefined);
      const name = String(res.staff?.name ?? '');
      setLastStaffResult({
        staff:   res.staff!,
        status:  'saved',
        message: `${name} — ${staffAttendanceType} recorded`,
        time,
      });
      void syncStore.refreshStatus();
      window.setTimeout(() => {
        setStaffScanStatus('ready');
        setStaffScanMessage(undefined);
      }, 3000);
    } else {
      const code = res.error?.code ?? '';
      let scanSt: ScannerStatus = 'error';
      if (['INVALID_TOKEN', 'CARD_INACTIVE', 'WRONG_SCHOOL', 'NOT_STAFF'].includes(code)) scanSt = 'invalid';
      else if (code === 'STAFF_NOT_FOUND') scanSt = 'not-found';
      else if (code === 'STAFF_INACTIVE') scanSt = 'invalid';
      else if (code === 'NO_SELF_SCAN') { scanSt = 'invalid'; }

      const msg = res.error?.message ?? 'Could not record staff attendance.';
      setStaffScanStatus(scanSt);
      setStaffScanMessage(msg);
      window.setTimeout(() => {
        setStaffScanStatus('ready');
        setStaffScanMessage(undefined);
      }, 4000);
    }
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
      {/* Header */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   20,
        }}
      >
        <div>
          <h1>Attendance Scanner</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Records save locally and sync when online · {learners.length} learners
          </p>
        </div>

        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ width: 'auto' }}
        />
      </div>

      {/* Offline banner */}
      {!syncStore.status.online && (
        <div
          style={{
            background:   '#fef3c7',
            border:       '1px solid #fde68a',
            borderRadius: 8,
            padding:      '10px 14px',
            marginBottom: 16,
            fontSize:     12,
            fontWeight:   600,
            color:        '#92400e',
          }}
        >
          ⚠ Offline. Attendance will sync automatically when connected.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['learner', 'staff'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={tab === t ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ textTransform: 'capitalize' }}
          >
            {t === 'learner' ? '👩‍🎓 Learner Attendance' : '👥 Staff Attendance'}
          </button>
        ))}
      </div>

      {/* ── Learner tab ─────────────────────────────────────────────────────── */}
      {tab === 'learner' && (
        <>
          {/* Scanner card */}
          <div className="card" style={{ marginBottom: 16, padding: 20 }}>
            <div
              style={{
                fontSize:      13,
                fontWeight:    800,
                marginBottom:  12,
                color:         'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Barcode Scanner
            </div>

            <BarcodeScanner
              mode="both"
              onScan={handleLearnerScan}
              disabled={!isAuthenticated || !user?.school}
              status={learnerScanStatus}
              statusMessage={learnerScanMessage}
            />

            {/* Last scan result */}
            {lastLearnerResult && (
              <div
                style={{
                  marginTop:    16,
                  padding:      '12px 16px',
                  borderRadius: 8,
                  background:   lastLearnerResult.status === 'saved'
                    ? '#f0fdf4'
                    : lastLearnerResult.status === 'duplicate'
                    ? '#fefce8'
                    : '#fef2f2',
                  border: `1px solid ${
                    lastLearnerResult.status === 'saved'
                      ? '#bbf7d0'
                      : lastLearnerResult.status === 'duplicate'
                      ? '#fde68a'
                      : '#fecaca'
                  }`,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize:   13,
                    color:
                      lastLearnerResult.status === 'saved'   ? '#15803d' :
                      lastLearnerResult.status === 'duplicate' ? '#92400e' : '#991b1b',
                  }}
                >
                  {lastLearnerResult.message}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {String(lastLearnerResult.learner.admission_no ?? '')} ·{' '}
                  {formatClassDisplay(
                    lastLearnerResult.learner.class_name,
                    lastLearnerResult.learner.class_stream,
                  )} · {lastLearnerResult.time}
                </div>
              </div>
            )}
          </div>

          {/* Manual learner table */}
          {learners.length === 0 ? (
            <div className="empty">
              <p>No learner records. Run a sync first.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
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
                                  fontSize:   11,
                                  color:      'var(--success)',
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
                                  onClick={() => { void markAttendance(learner.id, status); }}
                                  disabled={saving[learner.id]}
                                  title={status.replace('_', ' ')}
                                  style={{
                                    padding:      '3px 8px',
                                    borderRadius: 4,
                                    border:       '1px solid var(--border)',
                                    fontSize:     10,
                                    fontWeight:   700,
                                    cursor:       'pointer',
                                    background:
                                      current === status ? 'var(--chalk)' : 'var(--surface)',
                                    color:
                                      current === status ? '#fff' : 'var(--text)',
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
            </div>
          )}
        </>
      )}

      {/* ── Staff tab ────────────────────────────────────────────────────────── */}
      {tab === 'staff' && (
        <div className="card" style={{ padding: 20 }}>
          <div
            style={{
              fontSize:      13,
              fontWeight:    800,
              marginBottom:  12,
              color:         'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Staff Attendance Scanner
          </div>

          {!isAuthorisedStaffOfficer ? (
            <div
              style={{
                padding:      '14px 18px',
                background:   '#f8fafc',
                border:       '1px solid var(--border)',
                borderRadius: 8,
                fontSize:     13,
                color:        'var(--text-muted)',
              }}
            >
              <strong>View-only mode.</strong> Recording staff attendance requires the Security or
              Attendance Officer role. Contact your administrator if you believe you should have
              access.
            </div>
          ) : (
            <>
              {/* Arrival / Departure toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {(['ARRIVAL', 'DEPARTURE'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setStaffAttendanceType(t)}
                    className={staffAttendanceType === t ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ fontSize: 12 }}
                  >
                    {t === 'ARRIVAL' ? '→ Arrival' : '← Departure'}
                  </button>
                ))}
              </div>

              <BarcodeScanner
                mode="both"
                onScan={handleStaffScan}
                disabled={!isAuthenticated || !user?.school}
                status={staffScanStatus}
                statusMessage={staffScanMessage}
              />

              {/* Last staff scan result */}
              {lastStaffResult && (
                <div
                  style={{
                    marginTop:    16,
                    padding:      '12px 16px',
                    borderRadius: 8,
                    background:   lastStaffResult.status === 'saved' ? '#f0fdf4' : '#fef2f2',
                    border:       `1px solid ${lastStaffResult.status === 'saved' ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize:   13,
                      color:      lastStaffResult.status === 'saved' ? '#15803d' : '#991b1b',
                    }}
                  >
                    {lastStaffResult.message}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {String(lastStaffResult.staff.username ?? '')} · {lastStaffResult.time}
                  </div>
                </div>
              )}

              <p
                style={{
                  marginTop:  16,
                  fontSize:   12,
                  color:      'var(--text-muted)',
                  fontStyle:  'italic',
                }}
              >
                Staff attendance is audited. You cannot scan your own card.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
