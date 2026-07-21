import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  note,
  icon: Icon
}: {
  label: string;
  value: string | number;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <div className="paper-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">{note}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-chalk-50 text-chalk-700">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}
