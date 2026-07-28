import Link from 'next/link';
import { BookOpenCheck, CheckCircle2, LockKeyhole, Smartphone } from 'lucide-react';
import { loginAction } from '@/app/actions/auth';
import { Brand } from '@/components/Brand';
import type { AuthUser } from '@/lib/auth';

export function LoginScreen({
  error,
  showDemo,
  user
}: {
  error?: string;
  showDemo: boolean;
  user: AuthUser | null;
}) {
  return <main className="min-h-screen lg:grid lg:grid-cols-[1.05fr_.95fr]">
    <section className="wood-grain relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[42px] border-white/5"/>
      <Brand animated/>
      <div className="my-auto max-w-xl">
        <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-amber-300">Run the school from one desk</p>
        <h1 className="mt-5 text-5xl font-black leading-[1.03] tracking-tight">Clear records. Faster decisions. Proper control.</h1>
        <p className="mt-6 text-lg leading-8 text-white/72">AcademiaOS brings admissions, attendance, fees, results, proprietor approval, transport and communication into one secure system.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[[BookOpenCheck,'Academic approval'],[Smartphone,'Mobile ready'],[LockKeyhole,'Role security']].map(([Icon,label]) => {
            const ItemIcon = Icon as typeof BookOpenCheck;
            return <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 p-4"><ItemIcon className="text-amber-300" size={22}/><p className="mt-3 text-sm font-extrabold">{String(label)}</p></div>;
          })}
        </div>
      </div>
      <p className="text-xs text-white/45">Built for primary and secondary schools in Ghana.</p>
    </section>

    <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
      <div className="w-full max-w-md">
        <div className="mb-8 lg:hidden"><div className="inline-flex rounded-2xl bg-[#2f1d14] p-4"><Brand animated/></div></div>
        <p className="eyebrow">AcademiaOS account</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{user ? 'You are already signed in' : 'Sign in with username and password'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {user ? `Signed in as ${user.name} (${user.username}).` : 'Use the username and password assigned by your school administrator.'}
        </p>

        {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</div>}

        {user ? <div className="paper-card mt-6 space-y-4 p-6 sm:p-7">
          <Link className="btn-primary block w-full text-center" href={user.mustChangePassword ? '/account/change-password' : '/dashboard'}>
            Continue to AcademiaOS
          </Link>
          <p className="text-center text-xs leading-5 text-slate-500">The app no longer sends signed-out visitors through a separate Replit authentication page.</p>
        </div> : <form action={loginAction} className="paper-card mt-6 space-y-5 p-6 sm:p-7">
          <div><label className="label" htmlFor="username">Username</label><input className="input" id="username" name="username" autoComplete="username" required autoFocus/></div>
          <div><label className="label" htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" autoComplete="current-password" required/></div>
          <button className="btn-primary w-full">Sign in to AcademiaOS</button>
        </form>}

        {showDemo && !user && <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex gap-3"><CheckCircle2 className="mt-0.5 shrink-0" size={18}/><div>
            <p className="font-extrabold">Demo access</p>
            <p className="mt-1 leading-6">Username: <b>admin</b> or <b>proprietor</b><br/>Password: <b>ChangeMe123!</b></p>
            <p className="mt-2 text-xs leading-5">Demo access works only when <code>ACADEMIAOS_DEMO_MODE=true</code> was added to the published app secrets before publishing.</p>
          </div></div>
        </div>}
      </div>
    </section>
  </main>;
}
