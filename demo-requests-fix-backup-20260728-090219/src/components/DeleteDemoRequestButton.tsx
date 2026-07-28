'use client';

import { deleteDemoRequestAction } from '@/app/actions/demo-requests';

type DeleteDemoRequestButtonProps = {
  id: string;
};

export function DeleteDemoRequestButton({ id }: DeleteDemoRequestButtonProps) {
  return (
    <form
      action={deleteDemoRequestAction}
      onSubmit={(event) => {
        if (!window.confirm('Delete this request?')) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="btn-secondary py-2 text-sm text-rose-600 hover:border-rose-200 hover:bg-rose-50"
      >
        Delete
      </button>
    </form>
  );
}
