'use client';

import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type CameraBadgeScannerProps = {
  name: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  label?: string;
};

export function CameraBadgeScanner({
  name,
  placeholder = 'Scan or enter badge code',
  required = false,
  autoFocus = false,
  label = 'Badge code'
}: CameraBadgeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }

  useEffect(() => stopScanner, []);

  async function startScanner() {
    if (!videoRef.current) return;
    setError(null);
    setLastScan(null);
    setScanning(true);

    try {
      const reader = new BrowserMultiFormatReader(undefined, {
        delayBetweenScanAttempts: 250,
        delayBetweenScanSuccess: 750
      });
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        videoRef.current,
        (result) => {
          if (!result) return;
          const value = result.getText().trim();
          if (!value) return;
          if (inputRef.current) {
            inputRef.current.value = value;
            inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
            inputRef.current.focus();
          }
          setLastScan(value);
          stopScanner();
        }
      );
      controlsRef.current = controls;
    } catch (cause) {
      stopScanner();
      const message = cause instanceof Error ? cause.message : 'Camera access failed.';
      setError(message.includes('Permission') || message.includes('NotAllowed')
        ? 'Camera permission was denied. Allow camera access or enter the badge code manually.'
        : 'The camera could not start. Enter the badge code manually.');
    }
  }

  return (
    <div className="space-y-3">
      <label className="label" htmlFor={`${name}-badge-input`}>{label}</label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id={`${name}-badge-input`}
          className="input min-w-0 flex-1"
          name={name}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          autoComplete="off"
          inputMode="text"
        />
        <button
          type="button"
          onClick={scanning ? stopScanner : startScanner}
          className="btn-secondary shrink-0 px-3"
          aria-label={scanning ? 'Stop badge camera' : 'Open badge camera'}
        >
          {scanning ? <CameraOff size={18}/> : <Camera size={18}/>}
          <span className="hidden sm:inline">{scanning ? 'Stop' : 'Camera'}</span>
        </button>
      </div>
      <div className={scanning ? 'block' : 'hidden'}>
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-black">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline/>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-28 w-56 rounded-xl border-2 border-amber-300 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]"/>
          </div>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white">
            <ScanLine size={15}/> Hold the QR code inside the frame
          </div>
        </div>
      </div>
      {lastScan && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Scanned: {lastScan}</p>}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800" role="alert">{error}</p>}
      <p className="text-xs text-slate-500">Camera scanning requires HTTPS or localhost. Manual entry always remains available.</p>
    </div>
  );
}
