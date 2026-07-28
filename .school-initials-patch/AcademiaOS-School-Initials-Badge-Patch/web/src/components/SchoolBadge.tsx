import Image from 'next/image';
import { schoolInitials } from '@/lib/school-initials';

type SchoolBadgeProps = {
  name: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
};

export function SchoolBadge({ name, logoUrl, size = 56, className = '' }: SchoolBadgeProps) {
  const shared = `shrink-0 overflow-hidden border border-emerald-950/15 ${className}`;

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${name} logo`}
        width={size}
        height={size}
        unoptimized
        className={`${shared} bg-white object-contain p-1`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name} initials logo`}
      title={`${name} initials logo`}
      className={`${shared} grid place-items-center bg-[#1F5C46] font-black tracking-wide text-[#F4C542]`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.27)) }}
    >
      {schoolInitials(name)}
    </div>
  );
}
