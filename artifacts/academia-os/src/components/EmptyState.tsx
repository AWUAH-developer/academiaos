import { Inbox } from 'lucide-react';

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <Inbox className="mx-auto text-slate-400" size={34} />
      <h3 className="mt-3 font-extrabold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}
