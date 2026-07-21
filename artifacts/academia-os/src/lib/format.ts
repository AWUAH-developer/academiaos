export function formatMoney(value: number | string | null | undefined, currency = 'GHS') {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(value || 0));
}
export function startOfToday() { const date = new Date(); date.setHours(0,0,0,0); return date; }
export function endOfToday() { const date = new Date(); date.setHours(23,59,59,999); return date; }
export function fullName(firstName: string, lastName: string) { return `${firstName} ${lastName}`.trim(); }
export function formatDate(value: Date | string | null | undefined) { return value ? new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium' }).format(new Date(value)) : 'Not set'; }
export function formatDateTime(value: Date | string | null | undefined) { return value ? new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not set'; }
