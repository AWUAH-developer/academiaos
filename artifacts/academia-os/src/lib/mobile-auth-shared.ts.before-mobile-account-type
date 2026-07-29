import { z } from 'zod';

export const MOBILE_ACCESS_PREFIX = 'amos_access';
export const MOBILE_REFRESH_PREFIX = 'amos_refresh';

export function parseMobileToken(token: string, expectedPrefix: 'access' | 'refresh') {
  const [prefix, sessionId, secret, extra] = token.split('.');
  const expected = expectedPrefix === 'access' ? MOBILE_ACCESS_PREFIX : MOBILE_REFRESH_PREFIX;
  if (extra || prefix !== expected || !/^[0-9a-f-]{36}$/i.test(sessionId || '') || !/^[A-Za-z0-9_-]{40,64}$/.test(secret || '')) return null;
  return { sessionId, token };
}

export const mobileLoginSchema = z.object({
  username: z.string().trim().min(2).max(100),
  password: z.string().min(6).max(200),
  deviceIdentifier: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
  deviceName: z.string().trim().max(120).optional(),
  platform: z.enum(['android', 'ios']),
  appVersion: z.string().trim().max(40).optional()
});

export const mobileRefreshSchema = z.object({ refreshToken: z.string().min(60).max(300) });
