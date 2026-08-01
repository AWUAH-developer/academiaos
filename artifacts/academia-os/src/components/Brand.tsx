import Image from 'next/image';
import { AcademiaOSAnimatedLogo } from '@/components/AcademiaOSAnimatedLogo';

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
    logoHeight: 36,
    logoMaxWidth: 94,
  },
  md: {
    icon: 'h-11 w-11 rounded-2xl',
    text: 'text-xl',
    tagline: 'text-[10px]',
    logoHeight: 44,
    logoMaxWidth: 114,
  },
  lg: {
    icon: 'h-14 w-14 rounded-2xl',
    text: 'text-2xl',
    tagline: 'text-[11px]',
    logoHeight: 56,
    logoMaxWidth: 146,
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
          <AcademiaOSAnimatedLogo
            maxWidth={selectedSize.logoMaxWidth}
            showTagline={false}
            onDark={variant === 'light'}
            style={{
              width: `${selectedSize.logoMaxWidth}px`,
              maxWidth: '100%',
              marginLeft: 0,
              marginRight: 0,
              transform: 'translateY(-4px)',
            }}
          />

          {showTagline && (
            <div
              className={`-mt-3 whitespace-nowrap text-center font-black uppercase tracking-[0.2em] ${selectedSize.tagline}`}
              style={{
                color:
                  variant === 'light'
                    ? '#f4c542'
                    : '#64748b',
              }}
            >
              School Command Centre
            </div>
          )}
        </div>
      )}
    </div>
  );
}
