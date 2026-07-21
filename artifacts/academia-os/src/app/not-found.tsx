import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="paper-card max-w-lg p-8 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">The AcademiaOS page you requested does not exist or is not available to this account.</p>
        <Link href="/dashboard" className="btn-primary mt-6">Return to dashboard</Link>
      </div>
    </main>
  );
}
