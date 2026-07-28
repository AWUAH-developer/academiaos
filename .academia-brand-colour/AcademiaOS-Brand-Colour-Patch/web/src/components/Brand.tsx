import Image from 'next/image';
import { DevourLogo } from '@/components/DevourLogo';

type BrandProps = {
  compact?: boolean;
  animated?: boolean;
  showTagline?: boolean;
};

export function Brand({ compact = false, animated = false, showTagline = true }: BrandProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 overflow-hidden rounded-2xl shadow-lg shadow-black/20">
        <Image
          src="/brand-logo.jpg"
          alt="AcademiaOS logo"
          width={44}
          height={44}
          unoptimized
          priority
          className="h-11 w-11 object-cover"
        />
      </div>

      {!compact && (
        <div className="min-w-0">
          {animated ? (
            <DevourLogo tone="light" className="text-xl" />
          ) : (
            <div className="text-xl font-black tracking-tight" aria-label="AcademiaOS">
              <span className="text-[#fff8ea]">Academia</span><span className="text-[#f4c542]">OS</span>
            </div>
          )}
          {showTagline && (
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
              School command centre
            </div>
          )}
        </div>
      )}
    </div>
  );
}
