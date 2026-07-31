/**
 * SmartIdScreen — scan a learner or staff card to view their ID record.
 *
 * Uses BarcodeScanner for USB/Bluetooth wedge and camera input.
 * Card lookup resolves via the production API (main process IPC) with a
 * local-cache fallback when offline.
 */
import React, { useState } from 'react';
import BarcodeScanner, { type ScannerStatus } from '../components/BarcodeScanner';
import { scanner as scannerApi, media, type CardRecord } from '../api/client';
import { useAuth } from '../store/auth';

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

function localDateIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

type PhotoState = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; dataUrl: string } | { status: 'error' };

export default function SmartIdScreen() {
  const { authState } = useAuth();

  const [scanStatus, setScanStatus] = useState<ScannerStatus>('ready');
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);
  const [record, setRecord] = useState<CardRecord | null>(null);
  const [photo, setPhoto] = useState<PhotoState>({ status: 'idle' });

  async function loadPhoto(rawUrl: unknown) {
    const url = typeof rawUrl === 'string' ? rawUrl : '';
    if (!url) { setPhoto({ status: 'error' }); return; }
    setPhoto({ status: 'loading' });
    const res = await media.loadImage(url);
    if (res.ok) {
      setPhoto({ status: 'ready', dataUrl: res.dataUrl });
    } else {
      setPhoto({ status: 'error' });
    }
  }

  async function handleScan(token: string) {
    setScanStatus('reading');
    setStatusMessage('Looking up card…');
    setRecord(null);
    setPhoto({ status: 'idle' });

    const res = await scannerApi.lookupCard(token);

    if (!res.ok) {
      const code = res.error?.code ?? '';
      if (code === 'NOT_FOUND') {
        setScanStatus('not-found');
        setStatusMessage('Card not recognised. It may belong to a different school or not yet exist in this system.');
      } else if (code === 'CARD_INACTIVE') {
        setScanStatus('invalid');
        setStatusMessage('This card has been deactivated.');
      } else if (code === 'WRONG_SCHOOL') {
        setScanStatus('invalid');
        setStatusMessage('This card belongs to a different school.');
      } else if (code === 'INVALID_TOKEN') {
        setScanStatus('invalid');
        setStatusMessage('Invalid barcode. Please scan a valid AcademiaOS ID card.');
      } else {
        setScanStatus('error');
        setStatusMessage('Could not reach the server. Check your connection and try again.');
      }
      return;
    }

    const rec = res.record;
    setRecord(rec);
    setScanStatus(rec.kind === 'LEARNER' ? 'found-learner' : 'found-staff');
    setStatusMessage(undefined);

    // Load photo in background
    const photoUrl = rec.kind === 'LEARNER' ? rec.photo_url : rec.photo_url;
    void loadPhoto(photoUrl);
  }

  const isAuthenticated = authState.status === 'authenticated';

  return (
    <div style={{ maxWidth: 760 }}>
      <h1>Smart ID Scanner</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 4, marginBottom: 20, fontSize: 13 }}>
        Scan a learner or staff ID card to view their record.
        USB/Bluetooth scanners work automatically — just scan and the card is looked up instantly.
      </p>

      {!isAuthenticated && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#991b1b', fontWeight: 600 }}>
          You must be signed in to look up cards.
        </div>
      )}

      <div className="card" style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Scanner
        </div>
        <BarcodeScanner
          mode="both"
          onScan={handleScan}
          disabled={!isAuthenticated}
          status={scanStatus}
          statusMessage={statusMessage}
          minLength={4}
          maxLength={128}
        />
      </div>

      {/* Result card */}
      {record && (
        <div
          className="card"
          style={{
            borderLeft: `4px solid ${record.kind === 'LEARNER' ? 'var(--chalk)' : 'var(--gold)'}`,
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Photo */}
            <div
              style={{
                width: 72,
                height: 72,
                flexShrink: 0,
                borderRadius: 8,
                background: '#f1f5f9',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
              }}
            >
              {photo.status === 'ready' ? (
                <img
                  src={photo.dataUrl}
                  alt="Photo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : photo.status === 'loading' ? (
                <span className="spin" style={{ fontSize: 16 }}>⟳</span>
              ) : (
                record.kind === 'LEARNER' ? '👤' : '👤'
              )}
            </div>

            {/* Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {record.kind === 'LEARNER' ? (
                <>
                  <div style={{ fontWeight: 900, fontSize: 20, lineHeight: 1.2 }}>
                    {String(record.first_name ?? '')} {String(record.last_name ?? '')}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
                    Admission No: <strong style={{ fontFamily: 'monospace' }}>{String(record.admission_no ?? '—')}</strong>
                    {!!record.class_name && (
                      <> · Class: <strong>{String(record.class_name)}{record.class_stream ? ` ${String(record.class_stream)}` : ''}</strong></>
                    )}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`pill ${String(record.status) === 'ACTIVE' ? 'pill-green' : 'pill-red'}`}>
                      {String(record.status ?? 'UNKNOWN')}
                    </span>
                    <span className={`pill ${record.card_valid ? 'pill-green' : 'pill-red'}`}>
                      {record.card_valid ? 'Card Valid' : 'Card Invalid'}
                    </span>
                    <span className="pill pill-blue">Learner</span>
                    {record.source === 'local' && (
                      <span className="pill pill-slate">Local cache</span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 900, fontSize: 20, lineHeight: 1.2 }}>
                    {String(record.name ?? '')}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
                    Staff No: <strong style={{ fontFamily: 'monospace' }}>{String(record.staff_no ?? '—')}</strong>
                    {' · '}
                    Role: <strong>{formatRole(String(record.role ?? ''))}</strong>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`pill ${String(record.status) === 'ACTIVE' ? 'pill-green' : 'pill-red'}`}>
                      {String(record.status ?? 'UNKNOWN')}
                    </span>
                    <span className={`pill ${record.card_valid ? 'pill-green' : 'pill-red'}`}>
                      {record.card_valid ? 'Card Valid' : 'Card Invalid'}
                    </span>
                    <span className="pill pill-amber">Staff</span>
                    {record.source === 'local' && (
                      <span className="pill pill-slate">Local cache</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            Scanned at {new Date().toLocaleTimeString()} · {localDateIso()}
          </div>
        </div>
      )}
    </div>
  );
}
