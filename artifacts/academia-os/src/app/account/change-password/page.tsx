import Link from 'next/link';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { changePasswordAction } from '@/app/actions/auth';
import { Brand } from '@/components/Brand';
import { requireUser } from '@/lib/auth';

export const metadata = { title: 'Set private password' };

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser({ allowPasswordChange: true });
  const params = await searchParams;

  if (!user.mustChangePassword) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-lg">
          <div className="mb-7 inline-flex rounded-2xl bg-[#2f1d14] p-4">
            <Brand />
          </div>

          <div className="paper-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
                <ShieldCheck />
              </div>

              <div>
                <p className="eyebrow">Account security</p>
                <h1 className="text-2xl font-black">Password change locked</h1>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              You have already created your private password. You cannot change
              it again without a reset from the AcademiaOS Super Admin.
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              A Super Admin reset creates a new temporary password and permits
              one new private-password change.
            </p>

            <Link href="/dashboard" className="btn-primary mt-6 w-full">
              Return to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-7 inline-flex rounded-2xl bg-[#2f1d14] p-4">
          <Brand />
        </div>

        <div className="paper-card p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-chalk-100 text-chalk-800">
              <LockKeyhole />
            </div>

            <div>
              <p className="eyebrow">First-login security</p>
              <h1 className="text-2xl font-black">
                Create your private password
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            Signed in as <b>{user.username}</b>. Enter the system-generated
            temporary password, then create your private password.
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            The temporary password remains valid until this change is completed
            or until it expires. After saving, it stops working immediately.
          </div>

          {params.error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">
              {params.error}
            </div>
          )}

          <form action={changePasswordAction} className="mt-6 space-y-4">
            <div>
              <label className="label">System-generated temporary password</label>
              <input
                className="input"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            <div>
              <label className="label">New private password</label>
              <input
                className="input"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label className="label">Confirm private password</label>
              <input
                className="input"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Use 8 to 128 characters with an uppercase letter, lowercase
              letter and number.
            </p>

            <button className="btn-primary w-full">
              Save private password
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
