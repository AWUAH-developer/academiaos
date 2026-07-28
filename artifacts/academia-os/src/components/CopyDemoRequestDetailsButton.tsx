'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

type CopyDemoRequestDetailsButtonProps = {
  schoolName: string;
  contactName: string;
  email: string;
  phone: string;
  learnerCount?: number | null;
  staffCount?: number | null;
};

export function CopyDemoRequestDetailsButton({
  schoolName,
  contactName,
  email,
  phone,
  learnerCount,
  staffCount,
}: CopyDemoRequestDetailsButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyDetails() {
    const details = [
      `School: ${schoolName}`,
      `Contact: ${contactName}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Learners: ${learnerCount ?? 'Not provided'}`,
      `Staff: ${staffCount ?? 'Not provided'}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy these demo-request details:', details);
    }
  }

  return (
    <button type="button" onClick={copyDetails} className="btn-secondary py-2 text-sm whitespace-nowrap">
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? 'Copied' : 'Copy details'}
    </button>
  );
}
