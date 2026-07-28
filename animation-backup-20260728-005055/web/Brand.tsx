import Image from 'next/image';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 overflow-hidden rounded-2xl shadow-lg shadow-black/20">
        <Image
          src="/brand-logo.jpg"
          alt="AcademiaOS"
          width={44}
          height={44}
          unoptimized
          className="h-11 w-11 object-cover"
        />
      </div>
      {!compact && (
        <div>
          <div className="text-xl font-black tracking-tight text-white">AcademiaOS</div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">School command centre</div>
        </div>
      )}
    </div>
  );
}
