import { GraduationCap } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400 text-slate-950 shadow-lg shadow-black/15">
        <GraduationCap size={25} strokeWidth={2.4} />
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
