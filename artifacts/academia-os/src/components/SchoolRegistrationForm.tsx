'use client';

import { useActionState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { createSchoolAction, type SchoolCreateState } from '@/app/actions/schools';

export function SchoolRegistrationForm() {
  const initialState: SchoolCreateState = { status: 'idle' };
  const [state, formAction, pending] = useActionState(createSchoolAction, initialState);

  return (
    <section className="paper-card h-fit p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-chalk-50 text-chalk-700"><Building2 size={20}/></div>
        <div><h2 className="font-black">Register a school</h2><p className="text-xs text-slate-500">Creates its first administrator and login credentials</p></div>
      </div>

      {state.status !== 'idle' && <div className={`mt-4 rounded-xl p-4 text-sm ${state.status === 'success' ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
        <p className="font-bold">{state.message}</p>
        {state.status === 'success' && <div className="mt-3 rounded-lg bg-white/80 p-3 font-mono"><p>Username: <b>{state.username}</b></p><p>Temporary password: <b>{state.temporaryPassword}</b></p><p className="mt-2 font-sans text-xs">Expires in 24 hours and must be changed at first login.</p></div>}
      </div>}

      <form action={formAction} className="mt-5 space-y-3">
        <label className="block text-xs font-bold text-slate-600">School logo</label>
        <input className="input" name="logo" type="file" accept="image/jpeg,image/png,image/webp" required/>
        <input className="input" name="name" placeholder="School name" required/>
        <input className="input" name="code" placeholder="Unique code, e.g. PLA" required/>
        <input className="input" name="address" placeholder="Address"/>
        <div className="grid grid-cols-2 gap-3"><input className="input" name="phone" type="tel" placeholder="School telephone"/><input className="input" name="email" type="email" placeholder="School email"/></div>
        <hr/>
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">First school administrator</p>
        <label className="block text-xs font-bold text-slate-600">Administrator photo</label>
        <input className="input" name="adminPhoto" type="file" accept="image/jpeg,image/png,image/webp" required/>
        <input className="input" name="adminName" placeholder="Administrator full name" required/>
        <input className="input" name="adminPhone" type="tel" placeholder="Administrator mobile number" required/>
        <input className="input" name="adminEmail" type="email" placeholder="Administrator email address" required/>
        <button className="btn-primary w-full" disabled={pending}><Plus size={17}/> {pending ? 'Creating school…' : 'Create school'}</button>
      </form>
    </section>
  );
}
