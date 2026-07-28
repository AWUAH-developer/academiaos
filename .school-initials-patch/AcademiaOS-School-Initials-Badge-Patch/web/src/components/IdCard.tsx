import Image from 'next/image';
import { QRCodeCanvas } from '@/components/QRCodeCanvas';
import { SchoolBadge } from '@/components/SchoolBadge';

type IdCardProps = {
  type: 'staff' | 'learner';
  name: string;
  subtitle: string;   // role label for staff, class name for learners
  idNumber: string;   // username for staff, admission no for learners
  qrValue: string;    // username for staff, badgeCode for learners
  photoUrl?: string | null;
  schoolName: string;
  schoolLogoUrl?: string | null;
};

export function IdCard({ type, name, subtitle, idNumber, qrValue, photoUrl, schoolName, schoolLogoUrl }: IdCardProps) {
  const accent = type === 'staff' ? 'bg-amber-700' : 'bg-emerald-800';
  const badge = type === 'staff' ? 'STAFF' : 'LEARNER';

  return (
    <div
      className="id-card relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      style={{ width: '340px', height: '214px', fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Top strip */}
      <div className={`${accent} flex items-center gap-2 px-4 py-2`}>
        <SchoolBadge name={schoolName} logoUrl={schoolLogoUrl} size={32} className="rounded-full"/>
        <p className="flex-1 truncate text-xs font-black text-white">{schoolName}</p>
        <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-black tracking-widest text-white">{badge}</span>
      </div>

      {/* Body */}
      <div className="flex flex-1 gap-3 p-4">
        {/* Photo */}
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <div className="flex h-[100px] w-[80px] items-center justify-center overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-100">
            {photoUrl
              ? <Image src={photoUrl} alt={name} width={80} height={100} unoptimized className="h-full w-full object-cover" />
              : <span className="text-3xl font-black text-slate-400">{name.trim()[0]?.toUpperCase()}</span>}
          </div>
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <p className="text-base font-black leading-tight text-slate-900 line-clamp-2">{name}</p>
            <p className="mt-0.5 text-xs font-bold text-slate-500">{subtitle}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              {type === 'staff' ? 'Username' : 'Admission No'}: <span className="font-bold text-slate-600">{idNumber}</span>
            </p>
          </div>

          {/* Bottom: QR */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Scan to verify</p>
              <p className="text-[9px] text-slate-400">{qrValue}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-0.5">
              <QRCodeCanvas value={qrValue} size={60} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={`${accent} h-1.5 w-full`} />
    </div>
  );
}
