import { Download } from 'lucide-react';

export function ExportLink({ type, label = 'Export CSV' }: { type: string; label?: string }) {
  return <a className="btn-secondary whitespace-nowrap" href={`/api/export/${encodeURIComponent(type)}`}><Download size={17}/>{label}</a>;
}
