import Image from 'next/image';

type BrandProps = {
  compact?: boolean;
  showTagline?: boolean;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizes = {
  sm: {
    icon: 'h-9 w-9 rounded-xl',
    text: 'text-lg',
    tagline: 'text-[8px]',
  },
  md: {
    icon: 'h-11 w-11 rounded-2xl',
    text: 'text-xl',
    tagline: 'text-[10px]',
  },
  lg: {
    icon: 'h-14 w-14 rounded-2xl',
    text: 'text-2xl',
    tagline: 'text-[11px]',
  },
};

export function Brand({
  compact = false,
  showTagline = true,
  variant = 'light',
  size = 'md',
  className = '',
}: BrandProps) {
  const selectedSize = sizes[size];
  const academiaColor = variant === 'dark' ? '#171a3b' : '#fff8ea';
  const taglineColor = variant === 'dark' ? '#64748b' : '#fde68a';

  return (
    <div className={`flex items-center ${compact ? '' : 'gap-3'} ${className}`.trim()}>
      <div
        className={`grid shrink-0 place-items-center overflow-hidden bg-white p-1 shadow-lg shadow-black/20 ${selectedSize.icon}`}
      >
        <Image
          src="/icon.svg"
          alt="AcademiaOS logo"
          width={56}
          height={56}
          priority
          className="h-full w-full object-contain"
        />
      </div>

      {!compact && (
        <div className="min-w-0">
          <div
            className={`${selectedSize.text} whitespace-nowrap font-black tracking-tight`}
            aria-label="AcademiaOS"
          >
            <span style={{ color: academiaColor }}>Academia</span>
            <span style={{ color: '#f4c542' }}>OS</span>
          </div>

          {showTagline && (
            <div
              className={`mt-1 whitespace-nowrap font-bold uppercase tracking-[0.2em] ${selectedSize.tagline}`}
              style={{ color: taglineColor }}
            >
              School command centre
            </div>
          )}
        </div>
      )}
    </div>
  );
}
