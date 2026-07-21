'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="paper-card max-w-lg p-8 text-center">
        <p className="eyebrow">System error</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">AcademiaOS could not load this page</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Check the database connection and try again. No record should be re-entered until the previous action is confirmed.</p>
        <button onClick={reset} className="btn-primary mt-6">Try again</button>
      </div>
    </main>
  );
}
