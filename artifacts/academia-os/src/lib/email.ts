export type DemoInvitationEmailInput = {
  requestId: string;
  schoolName: string;
  contactName: string;
  recipientEmail: string;
  username: string;
  temporaryPassword: string;
  expiresAt: Date;
  deliveryKey?: string;
};

export type EmailDeliveryResult =
  | { status: 'sent'; id: string }
  | { status: 'not_configured'; message: string }
  | { status: 'failed'; message: string };

function env(name: string) {
  return process.env[name]?.trim() || '';
}

export function emailDeliveryConfigured() {
  return Boolean(env('RESEND_API_KEY') && env('EMAIL_FROM'));
}

function publicAppUrl() {
  return (env('APP_URL') || env('NEXT_PUBLIC_APP_URL') || 'https://academiaos.cc').replace(/\/+$/, '');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function ghanaDateTime(value: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value);
}

function invitationText(input: DemoInvitationEmailInput, loginUrl: string) {
  return [
    `Hello ${input.contactName},`,
    '',
    `Your seven-day AcademiaOS demo access for ${input.schoolName} is ready.`,
    '',
    `Login: ${loginUrl}`,
    `Username: ${input.username}`,
    `Temporary password: ${input.temporaryPassword}`,
    `Expires: ${ghanaDateTime(input.expiresAt)} Ghana time`,
    '',
    'Keep these credentials private. Demo access ends automatically at the expiry time.',
    '',
    'AcademiaOS School Command Centre',
  ].join('\n');
}

function invitationHtml(input: DemoInvitationEmailInput, loginUrl: string) {
  const schoolName = escapeHtml(input.schoolName);
  const contactName = escapeHtml(input.contactName);
  const username = escapeHtml(input.username);
  const password = escapeHtml(input.temporaryPassword);
  const expiry = escapeHtml(ghanaDateTime(input.expiresAt));
  const safeLoginUrl = escapeHtml(loginUrl);

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f0e7;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:20px;padding:30px;box-shadow:0 12px 35px rgba(15,23,42,.08);">
        <div style="font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#1f5c46;">AcademiaOS</div>
        <h1 style="margin:10px 0 8px;font-size:28px;line-height:1.2;">Your 7-day demo is ready</h1>
        <p style="margin:0 0 22px;color:#475569;line-height:1.65;">Hello ${contactName}, your temporary AcademiaOS access for <strong>${schoolName}</strong> has been created.</p>

        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:16px;padding:20px;">
          <div style="margin-bottom:12px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#047857;">Private login details</div>
          <p style="margin:7px 0;"><strong>Username:</strong> ${username}</p>
          <p style="margin:7px 0;"><strong>Temporary password:</strong> ${password}</p>
          <p style="margin:7px 0;"><strong>Expires:</strong> ${expiry} Ghana time</p>
        </div>

        <div style="margin:24px 0;">
          <a href="${safeLoginUrl}" style="display:inline-block;background:#1f5c46;color:#ffffff;text-decoration:none;font-weight:800;border-radius:12px;padding:14px 22px;">Open AcademiaOS</a>
        </div>

        <p style="margin:0;color:#64748b;font-size:14px;line-height:1.65;">Keep these credentials private. Demo access ends automatically at the expiry time. This temporary demo does not create a paid production school.</p>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendDemoInvitationEmail(
  input: DemoInvitationEmailInput,
): Promise<EmailDeliveryResult> {
  const apiKey = env('RESEND_API_KEY');
  const from = env('EMAIL_FROM');

  if (!apiKey || !from) {
    return {
      status: 'not_configured',
      message: 'Add RESEND_API_KEY and EMAIL_FROM in Replit Secrets to enable email delivery.',
    };
  }

  const loginUrl = `${publicAppUrl()}/login`;
  const subject = `Your 7-day AcademiaOS demo access for ${input.schoolName}`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `academiaos-demo-${input.deliveryKey || input.requestId}`,
      },
      body: JSON.stringify({
        from,
        to: [input.recipientEmail],
        subject,
        text: invitationText(input, loginUrl),
        html: invitationHtml(input, loginUrl),
      }),
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!response.ok || !payload.id) {
      return {
        status: 'failed',
        message: payload.message || payload.name || `Email provider returned status ${response.status}.`,
      };
    }

    return { status: 'sent', id: payload.id };
  } catch (error) {
    console.error('sendDemoInvitationEmail failed', error);
    return {
      status: 'failed',
      message: 'The email service could not be reached. Copy and send the login details manually.',
    };
  }
}
