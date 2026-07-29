import Image from 'next/image';

type BrandProps = {
  compact?: boolean;
  showTagline?: boolean;
  /** 'light' = for dark backgrounds (cream Academia + yellow OS.)
   *  'dark'  = for light backgrounds (navy Academia + yellow OS.)
   *  Default is 'light' since Brand is primarily used on dark surfaces. */
  variant?: 'light' | 'dark';
};

export function Brand({ compact = false, showTagline = true, variant = 'light' }: BrandProps) {
  const academiaColor = variant === 'dark' ? '#171a3b' : '#fff8ea';
  const osColor = '#f4c542';

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
          <div
            className="text-xl font-black tracking-tight"
            aria-label="AcademiaOS."
          >
            <span style={{ color: academiaColor }}>Academia</span>
            <span style={{ color: osColor }}>OS.</span>
          </div>
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
