/**
 * BarcodeScanner — reusable scanner component for AcademiaOS Desktop.
 *
 * Supports two modes:
 *  - keyboard-wedge: captures rapid keystroke sequences from USB/Bluetooth scanners
 *  - camera: uses the browser's native BarcodeDetector (Chromium/Electron)
 *  - both: keyboard-wedge active always, camera shown alongside
 *
 * onScan is called with the raw code string; the caller is responsible for
 * network lookups and state transitions.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export type ScannerStatus =
  | 'ready'
  | 'reading'
  | 'processing'
  | 'found-learner'
  | 'found-staff'
  | 'not-found'
  | 'duplicate'
  | 'invalid'
  | 'error'
  | 'camera-unavailable'
  | 'permission-denied';

export interface BarcodeScannerProps {
  /** Called with the decoded code string (trimmed, validated). */
  onScan: (code: string) => void | Promise<void>;
  /** Input modes. Default: 'keyboard'. */
  mode?: 'keyboard' | 'camera' | 'both';
  /** When true, scanner ignores scans (still shows UI). */
  disabled?: boolean;
  /** Current status to display in the status badge. */
  status?: ScannerStatus;
  /** Status message override (overrides default label for the status). */
  statusMessage?: string;
  /** Min characters for a valid barcode. Default: 4 */
  minLength?: number;
  /** Max characters for a valid barcode. Default: 128 */
  maxLength?: number;
  /**
   * Max ms between keystrokes to count as a scanner (not human typing).
   * Default: 80ms. Increase to 120ms for slow scanners.
   */
  wedgeIntervalMs?: number;
  /**
   * Minimum sequence duration to reject single-key accidental presses.
   * The buffer must be completed within this many ms. Default: 500ms.
   */
  wedgeMaxDurationMs?: number;
  /**
   * Duplicate protection window in ms. Same code is ignored if repeated
   * within this interval. Default: 3000ms.
   */
  dupProtectionMs?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_MIN = 4;
const DEFAULT_MAX = 128;
const DEFAULT_WEDGE_MS = 80;
const DEFAULT_WEDGE_MAX_MS = 500;
const DEFAULT_DUP_MS = 3_000;

// ── Status display ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ScannerStatus, string> = {
  'ready':             '● Scanner ready',
  'reading':           '⟳ Reading card…',
  'processing':        '⟳ Processing…',
  'found-learner':     '✓ Learner found',
  'found-staff':       '✓ Staff found',
  'not-found':         '✗ Card not recognised',
  'duplicate':         '⚠ Already recorded',
  'invalid':           '✗ Invalid card',
  'error':             '✗ Connection error',
  'camera-unavailable':'⚠ No camera available',
  'permission-denied': '⚠ Camera permission denied',
};

const STATUS_COLOR: Record<ScannerStatus, { bg: string; color: string }> = {
  'ready':             { bg: '#f0f9f4', color: '#15803d' },
  'reading':           { bg: '#dbeafe', color: '#1e40af' },
  'processing':        { bg: '#dbeafe', color: '#1e40af' },
  'found-learner':     { bg: '#dcfce7', color: '#15803d' },
  'found-staff':       { bg: '#dcfce7', color: '#15803d' },
  'not-found':         { bg: '#fee2e2', color: '#991b1b' },
  'duplicate':         { bg: '#fef3c7', color: '#92400e' },
  'invalid':           { bg: '#fee2e2', color: '#991b1b' },
  'error':             { bg: '#fee2e2', color: '#991b1b' },
  'camera-unavailable':{ bg: '#f1f5f9', color: '#475569' },
  'permission-denied': { bg: '#fef3c7', color: '#92400e' },
};

// ── Camera helpers ────────────────────────────────────────────────────────────

/**
 * BarcodeDetector is available in Chromium-based browsers (and Electron).
 * We declare a minimal interface here so TypeScript is happy even when the
 * ambient lib type is absent.
 */
interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
}
interface BarcodeDetectorConstructor {
  new(opts?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?(): Promise<string[]>;
}

function getCameraDetector(): BarcodeDetectorConstructor | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BD = (window as any).BarcodeDetector as BarcodeDetectorConstructor | undefined;
  return BD ?? null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BarcodeScanner({
  onScan,
  mode = 'keyboard',
  disabled = false,
  status = 'ready',
  statusMessage,
  minLength = DEFAULT_MIN,
  maxLength = DEFAULT_MAX,
  wedgeIntervalMs = DEFAULT_WEDGE_MS,
  wedgeMaxDurationMs = DEFAULT_WEDGE_MAX_MS,
  dupProtectionMs = DEFAULT_DUP_MS,
}: BarcodeScannerProps) {
  // ── Keyboard-wedge state ──────────────────────────────────────────────────
  const wedgeInputRef = useRef<HTMLInputElement>(null);
  const bufferRef     = useRef('');
  const lastKeyRef    = useRef(0);
  const startTimeRef  = useRef(0);
  const lastCodeRef   = useRef('');
  const lastCodeTime  = useRef(0);

  // ── Manual entry state ────────────────────────────────────────────────────
  const [manualValue, setManualValue] = useState('');
  const [showManual, setShowManual]   = useState(false);

  // ── Camera state ──────────────────────────────────────────────────────────
  const videoRef           = useRef<HTMLVideoElement>(null);
  const canvasRef          = useRef<HTMLCanvasElement>(null);
  const streamRef          = useRef<MediaStream | null>(null);
  const detectLoopRef      = useRef<number | null>(null);
  const [cameras, setCameras]         = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null);

  const showCamera = mode === 'camera' || mode === 'both';
  const showWedge  = mode === 'keyboard' || mode === 'both';

  // ── Restore focus to wedge input ──────────────────────────────────────────
  const restoreFocus = useCallback(() => {
    if (showWedge && wedgeInputRef.current) {
      window.setTimeout(() => wedgeInputRef.current?.focus(), 100);
    }
  }, [showWedge]);

  // ── Duplicate protection ──────────────────────────────────────────────────
  const isDuplicate = useCallback((code: string) => {
    const now = Date.now();
    if (code === lastCodeRef.current && now - lastCodeTime.current < dupProtectionMs) {
      return true;
    }
    lastCodeRef.current = code;
    lastCodeTime.current = now;
    return false;
  }, [dupProtectionMs]);

  // ── Fire scan ─────────────────────────────────────────────────────────────
  const fireScan = useCallback((raw: string) => {
    const code = raw.trim();
    if (disabled) return;
    if (code.length < minLength || code.length > maxLength) return;
    if (isDuplicate(code)) return;
    void onScan(code);
  }, [disabled, minLength, maxLength, isDuplicate, onScan]);

  // ── Keyboard-wedge handler ────────────────────────────────────────────────
  const handleWedgeKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();

    if (e.key === 'Enter') {
      e.preventDefault();
      const buf = bufferRef.current;
      const elapsed = now - startTimeRef.current;

      // Accept if: buffer is long enough, total time is under max duration,
      // OR the last inter-key interval was fast (scanner confirmed).
      if (
        buf.length >= minLength &&
        (elapsed <= wedgeMaxDurationMs || (now - lastKeyRef.current) <= wedgeIntervalMs)
      ) {
        fireScan(buf);
      }
      bufferRef.current = '';
      startTimeRef.current = 0;
      return;
    }

    // Non-Enter key
    if (e.key.length === 1) {
      // If gap since last key is too long → human typing; reset buffer
      if (bufferRef.current.length > 0 && (now - lastKeyRef.current) > wedgeIntervalMs * 1.5) {
        bufferRef.current = '';
        startTimeRef.current = now;
      }
      if (bufferRef.current.length === 0) {
        startTimeRef.current = now;
      }
      bufferRef.current += e.key;
    }
    lastKeyRef.current = now;
  }, [minLength, wedgeIntervalMs, wedgeMaxDurationMs, fireScan]);

  // ── Manual entry submit ───────────────────────────────────────────────────
  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualValue.trim();
    if (code) {
      fireScan(code);
      setManualValue('');
    }
  }

  // ── Camera: check support ─────────────────────────────────────────────────
  useEffect(() => {
    if (!showCamera) return;
    const supported = typeof getCameraDetector() !== null && !!navigator.mediaDevices?.getUserMedia;
    setCameraSupported(!!getCameraDetector() && !!navigator.mediaDevices?.getUserMedia);
    if (!supported) return;

    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setCameras(videoDevices);
        if (videoDevices[0]) setSelectedCamera(videoDevices[0].deviceId);
      })
      .catch(() => setCameraError('Could not list cameras.'));
  }, [showCamera]);

  // ── Camera: start/stop stream ─────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (detectLoopRef.current !== null) {
      cancelAnimationFrame(detectLoopRef.current);
      detectLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!showCamera) return;
    const BD = getCameraDetector();
    if (!BD) { setCameraError('BarcodeDetector API not available.'); return; }

    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCamera
          ? { deviceId: { exact: selectedCamera } }
          : { facingMode: 'environment' },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new BD({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });

      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0 && codes[0].rawValue) {
            fireScan(codes[0].rawValue);
            // Pause scanning briefly after a hit
            window.setTimeout(() => {
              if (streamRef.current) detectLoopRef.current = requestAnimationFrame(() => { void scan(); });
            }, 1500);
            return;
          }
        } catch {
          // detection frame error — keep going
        }
        detectLoopRef.current = requestAnimationFrame(() => { void scan(); });
      };

      setCameraActive(true);
      detectLoopRef.current = requestAnimationFrame(() => { void scan(); });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('denied')) {
        setCameraError('Camera permission denied. Please allow camera access and try again.');
      } else if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('notfound')) {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(`Camera unavailable: ${message}`);
      }
    }
  }, [showCamera, selectedCamera, fireScan]);

  // Stop camera on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Render ────────────────────────────────────────────────────────────────
  const st = STATUS_COLOR[status];
  const label = statusMessage ?? STATUS_LABEL[status];

  return (
    <div>
      {/* Status badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          borderRadius: 100,
          background: st.bg,
          color: st.color,
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 12,
          userSelect: 'none',
        }}
      >
        {label}
      </div>

      {/* Keyboard-wedge hidden capture input */}
      {showWedge && (
        <div style={{ position: 'relative', overflow: 'hidden', height: 0 }}>
          <input
            ref={wedgeInputRef}
            aria-label="Barcode scanner input"
            style={{
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none',
              width: 1,
              height: 1,
            }}
            value=""
            onChange={() => { /* controlled via keydown */ }}
            onKeyDown={handleWedgeKeyDown}
            onBlur={() => {
              // Restore focus after a very short delay so clicks on other
              // elements in the page still work.
              window.setTimeout(() => {
                if (document.activeElement !== wedgeInputRef.current &&
                    !document.activeElement?.closest('[data-scanner-interactive]')) {
                  wedgeInputRef.current?.focus();
                }
              }, 200);
            }}
            autoFocus={showWedge}
            tabIndex={-1}
            disabled={disabled}
            readOnly
          />
        </div>
      )}

      {/* Camera section */}
      {showCamera && (
        <div style={{ marginBottom: 16 }}>
          {cameraSupported === false ? (
            <div
              style={{
                padding: '12px 16px',
                background: '#f1f5f9',
                borderRadius: 8,
                fontSize: 13,
                color: '#475569',
              }}
            >
              Camera scanning is not available on this device. USB/Bluetooth scanners still work.
            </div>
          ) : (
            <>
              {/* Camera selector */}
              {cameras.length > 1 && (
                <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label className="label" style={{ marginBottom: 0 }}>Camera:</label>
                  <select
                    className="input"
                    style={{ width: 'auto', flex: 1, maxWidth: 300 }}
                    value={selectedCamera}
                    onChange={(e) => {
                      setSelectedCamera(e.target.value);
                      if (cameraActive) { stopCamera(); }
                    }}
                  >
                    {cameras.map((c) => (
                      <option key={c.deviceId} value={c.deviceId}>
                        {c.label || `Camera ${cameras.indexOf(c) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Video preview */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 420,
                  background: '#000',
                  borderRadius: 8,
                  overflow: 'hidden',
                  display: cameraActive ? 'block' : 'none',
                }}
              >
                <video
                  ref={videoRef}
                  style={{ width: '100%', display: 'block' }}
                  muted
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                  }}
                />
                {/* Scanning frame overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '60%',
                    paddingBottom: '60%',
                    border: '2px solid rgba(255,255,255,0.7)',
                    borderRadius: 8,
                    boxShadow: '0 0 0 2000px rgba(0,0,0,0.35)',
                    pointerEvents: 'none',
                  }}
                />
              </div>

              {cameraError && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#fee2e2',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#991b1b',
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  {cameraError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {!cameraActive ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-scanner-interactive="1"
                    onClick={() => { void startCamera(); }}
                    disabled={disabled}
                  >
                    📷 Start Camera
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-scanner-interactive="1"
                    onClick={stopCamera}
                  >
                    ■ Stop Camera
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Manual entry toggle + form */}
      <div style={{ marginTop: 4 }}>
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          data-scanner-interactive="1"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: 12,
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          {showManual ? 'Hide manual entry' : 'Enter code manually'}
        </button>

        {showManual && (
          <form
            onSubmit={handleManualSubmit}
            style={{ display: 'flex', gap: 8, marginTop: 8 }}
          >
            <input
              className="input"
              placeholder="Type or paste barcode / card token…"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              autoComplete="off"
              data-scanner-interactive="1"
              style={{ flex: 1, maxWidth: 340 }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={disabled || !manualValue.trim()}
              data-scanner-interactive="1"
            >
              Submit
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
