import React, { useRef, useState } from 'react';
import {
  db as localDb,
  type LocalLearner,
} from '../api/client';
import { useAuth } from '../store/auth';

function localDateIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
}

export default function SmartIdScreen() {
  const { authState } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] =
    useState<LocalLearner | null | 'not-found'>(null);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [message, setMessage] = useState('');

  async function scan(event?: React.FormEvent) {
    event?.preventDefault();

    const value = query.trim();
    if (!value) {
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    setMessage('');

    const response = await localDb.getLearners({ search: value });

    setLoading(false);

    if (response.ok && response.learners.length > 0) {
      setResult(response.learners[0]);
    } else {
      setResult('not-found');
    }

    inputRef.current?.focus();
  }

  async function markPresent() {
    if (!result || result === 'not-found') return;
    if (authState.status !== 'authenticated') return;
    if (!authState.user.school) return;

    setMarking(true);
    setMessage('');

    const response = await localDb.saveAttendance({
      learnerId: result.id,
      date: localDateIso(),
      status: 'PRESENT',
      schoolId: authState.user.school.id,
      userId: authState.user.id,
      deviceId: authState.session.deviceId,
    });

    setMarking(false);

    setMessage(
      response.ok
        ? `${result.first_name} ${result.last_name} marked PRESENT today.`
        : 'Attendance could not be saved.',
    );

    inputRef.current?.focus();
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1>Smart ID and Barcode Attendance</h1>

      <p
        style={{
          color: 'var(--text-muted)',
          marginTop: 4,
          marginBottom: 20,
          fontSize: 13,
        }}
      >
        Scan a learner barcode or enter a badge code, admission number, or name.
        The scanner works like a keyboard and submits when it sends Enter.
      </p>

      <form
        onSubmit={scan}
        className="card"
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          padding: 16,
        }}
      >
        <input
          ref={inputRef}
          className="input"
          placeholder="Scan barcode or enter badge code..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setResult(null);
            setMessage('');
          }}
          autoComplete="off"
          autoFocus
          style={{ flex: 1 }}
        />

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ minWidth: 150 }}
        >
          {loading ? 'Searching...' : 'Scan / Look up'}
        </button>
      </form>

      {result === 'not-found' && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 32 }}>🔍</div>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            No learner found for "{query}"
          </p>
        </div>
      )}

      {result && result !== 'not-found' && (
        <div
          className="card"
          style={{
            borderLeft: '4px solid var(--chalk)',
            padding: 20,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 20 }}>
            {result.first_name} {result.last_name}
          </div>

          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              marginTop: 5,
            }}
          >
            Admission: {result.admission_no}
            {' · '}
            Class: {result.class_name ?? 'Not assigned'}
            {result.class_stream ? ` ${result.class_stream}` : ''}
          </div>

          <div style={{ marginTop: 10 }}>
            <span
              className={`pill ${
                result.status === 'ACTIVE' ? 'pill-green' : 'pill-red'
              }`}
            >
              {result.status}
            </span>

            {result.badge_code && (
              <span
                style={{
                  marginLeft: 10,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                }}
              >
                Badge: {result.badge_code}
              </span>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={markPresent}
            disabled={marking}
            style={{ marginTop: 18, minWidth: 190 }}
          >
            {marking ? 'Saving...' : 'Mark Present Today'}
          </button>

          {message && (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                fontWeight: 700,
                color: message.includes('marked PRESENT')
                  ? '#166534'
                  : '#991b1b',
              }}
            >
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
