export function money(value: string | number | null | undefined, currency = 'GHS') {
  const amount = Number(value || 0);
  try { return new Intl.NumberFormat('en-GH', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
}
export function shortDate(value: string | Date | null | undefined) {
  if (!value) return 'Not available';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
export function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) return 'Just now'; if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60); if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24); return `${days}d ago`;
}
export function learnerName(firstName?: string, lastName?: string) { return [firstName, lastName].filter(Boolean).join(' '); }
