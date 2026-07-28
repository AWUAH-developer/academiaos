'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

function ghanaDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function CopyDemoInvitationButton({
  schoolName,
  username,
  temporaryPassword,
  expiresAt,
}: {
  schoolName: string;
  username: string;
  temporaryPassword: string;
  expiresAt: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyInvitation() {
    const loginUrl = `${window.location.origin}/login`;
    const invitation = [
      `AcademiaOS 7-day demo access for ${schoolName}`,
      '',
      `Login: ${loginUrl}`,
      `Username: ${username}`,
      `Temporary password: ${temporaryPassword}`,
      `Expires: ${ghanaDateTime(expiresAt)} Ghana time`,
      '',
      'Keep these credentials private. Demo access ends automatically at the expiry time.',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(invitation);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={copyInvitation} className="btn-secondary inline-flex items-center gap-2">
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? 'Invitation copied' : 'Copy invitation details'}
    </button>
  );
}
