import { describe, expect, it } from 'vitest';
import { generateTemporaryPassword, usernameBaseFromName } from '../src/lib/credentials';

describe('staff credentials', () => {
  it('creates a username base from the staff name', () => {
    expect(usernameBaseFromName('Ama Serwaa Mensah')).toBe('ama.mensah');
  });

  it('creates a six-character temporary password', () => {
    const password = generateTemporaryPassword(6);
    expect(password).toHaveLength(6);
    expect(password).toMatch(/^[A-Za-z0-9]+$/);
  });
});
