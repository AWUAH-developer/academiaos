import Image from 'next/image';
import { DevourLogo } from '@/components/DevourLogo';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 overflow-hidden rounded-2xl shadow-lg shadow-black/20">
        <Image
          src="/brand-logo.jpg"
          alt="AcademiaOS logo"
          width={44}
          height={44}
          unoptimized
          className="h-11 w-11 object-cover"
          priority
        />
      </div>

      {!compact && (
        <div className="min-w-0">
          <DevourLogo tone="light" className="text-xl" />
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
            School command centre
          </div>
        </div>
      )}
    </div>
  );
}
