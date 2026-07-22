import { describe, expect, it } from 'vitest';
import { mobileLoginSchema, parseMobileToken } from '../src/lib/mobile-auth-shared';

describe('mobile API authentication primitives', () => {
  it('accepts a well-formed opaque access token', () => {
    const token = `amos_access.7b18d3a7-59ab-4fe6-95a8-96d4eb6a0bea.${'A'.repeat(43)}`;
    expect(parseMobileToken(token, 'access')).toEqual({
      sessionId: '7b18d3a7-59ab-4fe6-95a8-96d4eb6a0bea',
      token
    });
  });

  it('rejects refresh tokens in the access-token parser', () => {
    const token = `amos_refresh.7b18d3a7-59ab-4fe6-95a8-96d4eb6a0bea.${'A'.repeat(43)}`;
    expect(parseMobileToken(token, 'access')).toBeNull();
  });

  it('requires a platform and stable device identifier at login', () => {
    expect(mobileLoginSchema.safeParse({ username: 'teacher', password: 'secret1', deviceIdentifier: 'device-1234', platform: 'android' }).success).toBe(true);
    expect(mobileLoginSchema.safeParse({ username: 'teacher', password: 'secret1', deviceIdentifier: 'x', platform: 'web' }).success).toBe(false);
  });

  it('rejects device identifiers containing script markup', () => {
    expect(mobileLoginSchema.safeParse({ username: 'teacher', password: 'secret1', deviceIdentifier: '<script>alert(1)</script>', platform: 'ios' }).success).toBe(false);
  });
});
