'use client';

import { useMemo, useState } from 'react';
import { schoolInitials } from '@/lib/school-initials';

type SchoolInitialsInputProps = {
  nameInputName: string;
  defaultName?: string;
  nameLabel?: string;
  namePlaceholder?: string;
  nameRequired?: boolean;
  codeInputName?: string;
  defaultCode?: string;
  codeLabel?: string;
  codePlaceholder?: string;
  codeRequired?: boolean;
  codeMaxLength?: number;
  className?: string;
};

function generatedInitials(name: string) {
  return name.trim() ? schoolInitials(name) : '';
}

export function SchoolInitialsInput({
  nameInputName,
  defaultName = '',
  nameLabel = 'School name *',
  namePlaceholder = 'e.g. Paul Lawrence Academy',
  nameRequired = true,
  codeInputName,
  defaultCode = '',
  codeLabel = 'Short code',
  codePlaceholder = 'PLA',
  codeRequired = false,
  codeMaxLength = 10,
  className = '',
}: SchoolInitialsInputProps) {
  const initialGeneratedCode = generatedInitials(defaultName);
  const [schoolName, setSchoolName] = useState(defaultName);
  const [schoolCode, setSchoolCode] = useState(
    defaultCode.trim().toUpperCase() || initialGeneratedCode
  );
  const [codeWasEdited, setCodeWasEdited] = useState(
    Boolean(defaultCode.trim() && defaultCode.trim().toUpperCase() !== initialGeneratedCode)
  );

  const initials = useMemo(() => generatedInitials(schoolName), [schoolName]);

  function handleNameChange(nextName: string) {
    setSchoolName(nextName);
    const nextInitials = generatedInitials(nextName);

    if (!codeWasEdited || !schoolCode.trim()) {
      setSchoolCode(nextInitials);
    }
  }

  function handleCodeChange(nextCode: string) {
    setSchoolCode(
      nextCode
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, codeMaxLength)
    );
    setCodeWasEdited(true);
  }

  return (
    <div className={className}>
      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <label className="label">{nameLabel}</label>
          <input
            className="input w-full"
            name={nameInputName}
            value={schoolName}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder={namePlaceholder}
            required={nameRequired}
          />
        </div>

        <div className="shrink-0">
          <p className="mb-1 text-center text-[10px] font-black uppercase tracking-wide text-slate-500">
            Initials
          </p>
          <div
            aria-label={initials ? `${initials} school initials preview` : 'School initials preview'}
            className="grid h-11 min-w-14 place-items-center rounded-xl border border-emerald-950/15 bg-[#1F5C46] px-3 font-black tracking-wide text-[#F4C542]"
          >
            {initials || '—'}
          </div>
        </div>
      </div>

      <p className="mt-1 text-xs text-slate-500">
        The badge updates immediately while you type. A custom logo can replace it later.
      </p>

      {codeInputName ? (
        <div className="mt-3">
          <label className="label">
            {codeLabel}{' '}
            <span className="font-normal text-slate-400">
              (generated from the school initials)
            </span>
          </label>
          <input
            className="input uppercase"
            name={codeInputName}
            value={schoolCode}
            onChange={(event) => handleCodeChange(event.target.value)}
            placeholder={codePlaceholder}
            maxLength={codeMaxLength}
            required={codeRequired}
          />
        </div>
      ) : null}
    </div>
  );
}
