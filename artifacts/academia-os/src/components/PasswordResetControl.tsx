'use client';

import { useActionState } from 'react';
import { KeyRound } from 'lucide-react';
import { resetUserPasswordAction, type CredentialActionState } from '@/app/actions/users';

export function PasswordResetControl({ userId }: { userId: string }) {
  const initialState: CredentialActionState = { status: 'idle' };
  const [state, formAction, pending] = useActionState(resetUserPasswordAction, initialState);
  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="userId" value={userId}/>
        <button className="btn-secondary min-h-9 px-3 py-1.5 text-xs" disabled={pending}>
          <KeyRound size={14}/> {pending ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
      {state.status === 'success' && (
        <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-950">
          <p className="font-bold">@{state.username}</p>
          <p>Temporary password: <code className="font-black">{state.temporaryPassword}</code></p>
          <p className="mt-1">Expires in 24 hours and must be changed at first login.</p>
        </div>
      )}
      {state.status === 'error' && <p className="mt-1 text-xs font-bold text-rose-700">{state.message}</p>}
    </div>
  );
}
