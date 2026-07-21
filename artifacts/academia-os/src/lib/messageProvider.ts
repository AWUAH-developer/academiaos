type ExternalMessage = { channel: string; recipient: string; subject?: string | null; body: string };
type DeliveryResult = { providerId?: string; cost?: number };

async function twilioSms(message: ExternalMessage): Promise<DeliveryResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID; const authToken = process.env.TWILIO_AUTH_TOKEN; const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) throw new Error('Twilio credentials are incomplete.');
  const body = new URLSearchParams({ To: message.recipient, From: from, Body: message.body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!response.ok) throw new Error(`Twilio returned ${response.status}: ${await response.text()}`);
  const data = await response.json() as { sid?: string; price?: string };
  return { providerId: data.sid, cost: data.price ? Math.abs(Number(data.price)) : undefined };
}

async function whatsappCloud(message: ExternalMessage): Promise<DeliveryResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID; const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) throw new Error('WhatsApp Cloud credentials are incomplete.');
  const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: message.recipient, type: 'text', text: { body: message.body } }) });
  if (!response.ok) throw new Error(`WhatsApp returned ${response.status}: ${await response.text()}`);
  const data = await response.json() as { messages?: Array<{ id?: string }> };
  return { providerId: data.messages?.[0]?.id };
}

async function genericWebhook(message: ExternalMessage): Promise<DeliveryResult> {
  const url = process.env.MESSAGE_WEBHOOK_URL; const apiKey = process.env.MESSAGE_WEBHOOK_KEY;
  if (!url) throw new Error('MESSAGE_WEBHOOK_URL is not configured.');
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) }, body: JSON.stringify(message) });
  if (!response.ok) throw new Error(`Message webhook returned ${response.status}: ${await response.text()}`);
  const data = await response.json().catch(() => ({})) as { id?: string; cost?: number };
  return { providerId: data.id, cost: data.cost };
}

export async function dispatchExternalMessage(message: ExternalMessage): Promise<DeliveryResult> {
  if (message.channel === 'SMS' && process.env.SMS_PROVIDER === 'TWILIO') return twilioSms(message);
  if (message.channel === 'WHATSAPP' && process.env.WHATSAPP_PROVIDER === 'META_CLOUD') return whatsappCloud(message);
  if (['SMS','WHATSAPP','EMAIL'].includes(message.channel)) return genericWebhook(message);
  throw new Error(`Unsupported external channel: ${message.channel}`);
}
