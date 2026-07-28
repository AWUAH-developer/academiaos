'use client';

import { useMemo, useState } from 'react';

type Props = {
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
};

function toDisplay(value: string | null | undefined) {
  const raw = String(value || '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return /^\d{2}\/\d{2}\/\d{4}$/.test(raw) ? raw : '';
}

function toIso(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return '';
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function GhanaDateInput({
  name,
  defaultValue,
  required = false,
  className = 'input',
  placeholder = 'DD/MM/YYYY',
  ariaLabel = 'Date in day month year format'
}: Props) {
  const [display, setDisplay] = useState(() => toDisplay(defaultValue));
  const iso = useMemo(() => toIso(display), [display]);

  return (
    <>
      <input
        className={className}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        pattern="[0-3][0-9]/[0-1][0-9]/[0-9]{4}"
        value={display}
        onChange={(event) => setDisplay(event.target.value)}
        required={required}
        aria-label={ariaLabel}
        autoComplete="off"
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}
