import { LockKeyhole } from 'lucide-react';
import { changePasswordAction } from '@/app/actions/auth';
import { Brand } from '@/components/Brand';
import { requireUser } from '@/lib/auth';

export const metadata = { title: 'Change password' };
export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser({ allowPasswordChange: true }); const params = await searchParams;
  return <main className="flex min-h-screen items-center justify-center px-5 py-10"><div className="w-full max-w-lg"><div className="mb-7 inline-flex rounded-2xl bg-[#2f1d14] p-4"><Brand/></div><div className="paper-card p-6 sm:p-8"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-chalk-100 text-chalk-800"><LockKeyhole/></div><div><p className="eyebrow">Account security</p><h1 className="text-2xl font-black">Change your password</h1></div></div><p className="mt-4 text-sm leading-6 text-slate-600">Signed in as <b>{user.username}</b>. Use 12 to 128 characters with upper case, lower case and a number.</p>{params.error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">{params.error}</div>}<form action={changePasswordAction} className="mt-6 space-y-4"><div><label className="label">Current password</label><input className="input" name="currentPassword" type="password" autoComplete="current-password" required/></div><div><label className="label">New password</label><input className="input" name="newPassword" type="password" autoComplete="new-password" required/></div><div><label className="label">Confirm new password</label><input className="input" name="confirmPassword" type="password" autoComplete="new-password" required/></div><button className="btn-primary w-full">Save new password</button></form></div></div></main>;
}
