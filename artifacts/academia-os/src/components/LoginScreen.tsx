import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { loginAction } from '@/app/actions/auth';
import { DevourLogo } from '@/components/DevourLogo';
import type { AuthUser } from '@/lib/auth';

export function LoginScreen({
  error,
  showDemo,
  user,
}: {
  error?: string;
  showDemo: boolean;
  user: AuthUser | null;
}) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6efe5] text-[#071027]">
      <div
        className="min-h-screen"
        style={{
          background:
            'radial-gradient(circle at 14% 10%, #fffdf8 0%, #f8f1e7 44%, #f1e5d6 100%)',
        }}
      >
        <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14 lg:py-16">

          {/* Brown AcademiaOS banner */}
          <section className="inline-flex max-w-full items-center gap-4 rounded-[28px] bg-[#351d15] px-5 py-5 shadow-[0_22px_50px_rgba(53,29,21,0.18)] sm:gap-6 sm:px-7 sm:py-6">
            <div className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-[20px] bg-white shadow-lg sm:h-[82px] sm:w-[82px]">
              <Image
                src="/icon.svg"
                alt="AcademiaOS"
                width={82}
                height={82}
                priority
                className="h-full w-full object-contain p-1"
              />
            </div>

            <div className="min-w-0">
              <DevourLogo
                tone="light"
                className="text-[clamp(1.8rem,5vw,3rem)] font-black"
              />

              <p className="mt-2 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.22em] text-[#f4c542] sm:text-sm sm:tracking-[0.28em]">
                School Command Centre
              </p>
            </div>
          </section>

          {/* Heading */}
          <section className="mt-14 sm:mt-16">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#1f5c46] sm:text-base">
              AcademiaOS Account
            </p>

            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.06] tracking-[-0.045em] text-[#071027] sm:text-5xl lg:text-6xl">
              {user
                ? 'You are already signed in'
                : 'Sign in with username and password'}
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
              {user
                ? `Signed in as ${user.name} (${user.username}).`
                : 'Use the username and password assigned by your school administrator.'}
            </p>
          </section>

          {error && (
            <div className="mt-7 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-800">
              {error}
            </div>
          )}

          {/* Login card */}
          {user ? (
            <section className="mt-10 rounded-[28px] border border-white/80 bg-white/95 p-7 shadow-[0_24px_55px_rgba(92,70,46,0.13)] sm:p-10">
              <Link
                href={
                  user.mustChangePassword
                    ? '/account/change-password'
                    : '/dashboard'
                }
                className="block w-full rounded-2xl bg-[#1f5c46] px-6 py-5 text-center text-lg font-black text-white shadow-[0_12px_24px_rgba(31,92,70,0.18)] transition hover:bg-[#194c3a]"
              >
                Continue to AcademiaOS
              </Link>

              <p className="mt-5 text-center text-sm leading-6 text-slate-500">
                Your secure AcademiaOS session is already active.
              </p>
            </section>
          ) : (
            <form
              action={loginAction}
              className="mt-10 space-y-7 rounded-[28px] border border-white/80 bg-white/95 p-7 shadow-[0_24px_55px_rgba(92,70,46,0.13)] sm:p-10"
            >
              <div>
                <label
                  htmlFor="username"
                  className="mb-3 block text-base font-black text-slate-700 sm:text-lg"
                >
                  Username
                </label>

                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  required
                  autoFocus
                  placeholder="Enter your username"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-lg text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#1f5c46] focus:ring-[7px] focus:ring-[#1f5c46]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-3 block text-base font-black text-slate-700 sm:text-lg"
                >
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-lg text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#1f5c46] focus:ring-[7px] focus:ring-[#1f5c46]/10"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#1f5c46] px-6 py-5 text-lg font-black text-white shadow-[0_12px_24px_rgba(31,92,70,0.18)] transition hover:bg-[#194c3a] focus:outline-none focus:ring-4 focus:ring-[#1f5c46]/20"
              >
                Sign in to AcademiaOS
              </button>
            </form>
          )}

          {showDemo && !user && (
            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
              <div className="flex gap-3">
                <CheckCircle2
                  className="mt-0.5 shrink-0 text-amber-600"
                  size={20}
                />

                <div>
                  <p className="font-black">Demo access</p>

                  <p className="mt-2 leading-6">
                    Username: <strong>admin</strong> or{' '}
                    <strong>proprietor</strong>
                    <br />
                    Password: <strong>ChangeMe123!</strong>
                  </p>
                </div>
              </div>
            </section>
          )}

          <footer className="mt-8 text-center text-xs text-[#8a8177]">
            AcademiaOS · School Command Centre
          </footer>
        </div>
      </div>
    </main>
  );
}
