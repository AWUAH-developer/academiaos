const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s().-]{6,19}$/;

export function cleanText(value: FormDataEntryValue | null | undefined, maxLength = 200) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(CONTROL_CHARACTERS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function cleanMultilineText(value: FormDataEntryValue | null | undefined, maxLength = 4000) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(CONTROL_CHARACTERS, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, maxLength);
}

export function normalizeEmail(value: FormDataEntryValue | null | undefined) {
  return cleanText(value, 254).toLowerCase();
}

export function isValidEmail(value: string) {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

export function normalizePhone(value: FormDataEntryValue | null | undefined) {
  return cleanText(value, 24);
}

export function isValidPhone(value: string) {
  return PHONE_PATTERN.test(value);
}

export function cleanCode(value: FormDataEntryValue | null | undefined, maxLength = 24) {
  return cleanText(value, maxLength).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

export function cleanIdentifier(value: FormDataEntryValue | null | undefined, maxLength = 40) {
  return cleanText(value, maxLength).toUpperCase().replace(/[^A-Z0-9_\/-]/g, '');
}

export function safeInteger(value: FormDataEntryValue | null | undefined, minimum: number, maximum: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : null;
}

export function safeMoney(value: FormDataEntryValue | null | undefined, maximum = 10_000_000) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > maximum) return null;
  return Math.round(number * 100) / 100;
}
