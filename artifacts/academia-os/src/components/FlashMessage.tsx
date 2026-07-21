import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function FlashMessage({ success, error }: { success?: string; error?: string }) {
  const message = success || error;
  if (!message) return null;

  return (
    <div className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
      success
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-rose-200 bg-rose-50 text-rose-800'
    }`}>
      {success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{message}</span>
    </div>
  );
}
