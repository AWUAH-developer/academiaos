import { DevourLogo } from '@/components/DevourLogo';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center">
      <div>
        <DevourLogo compact={compact} tone="light" className={compact ? 'text-2xl' : 'text-xl'} />
        {!compact && (
          <div className="mt-1 pl-7 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
            School command centre
          </div>
        )}
      </div>
    </div>
  );
}
