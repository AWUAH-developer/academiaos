import crypto from 'crypto';

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function usernameBaseFromName(name: string) {
  const parts = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return 'staff';
  const first = parts[0];
  const last = parts.length > 1 ? parts.at(-1) : '';
  return [first, last].filter(Boolean).join('.').slice(0, 28) || 'staff';
}

export function generateTemporaryPassword(length = 6) {
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += PASSWORD_ALPHABET[crypto.randomInt(0, PASSWORD_ALPHABET.length)];
  }
  return value;
}
