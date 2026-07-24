'use client';
import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export function QRCodeCanvas({ value, size = 80 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#1e293b', light: '#ffffff' },
    }).catch(() => {});
  }, [value, size]);
  return <canvas ref={ref} width={size} height={size} style={{ width: size, height: size }} />;
}
