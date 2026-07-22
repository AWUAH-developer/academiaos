import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_ACADEMIAOS_API_URL?.replace(/\/$/, '');
const ACCESS_KEY = 'academiaos.mobile.access';
const REFRESH_KEY = 'academiaos.mobile.refresh';

type Tokens = { accessToken: string; refreshToken: string };
type ApiErrorBody = { error?: { code?: string; message?: string } };

export class AcademiaApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function saveTokens(tokens: Tokens) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken)
  ]);
}

export async function clearMobileSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY)
  ]);
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({})) as ApiErrorBody & Record<string, unknown>;
  if (!response.ok) {
    throw new AcademiaApiError(response.status, body.error?.code || 'REQUEST_FAILED', body.error?.message || 'The request failed.');
  }
  return body;
}

async function refreshTokens() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!refreshToken) throw new AcademiaApiError(401, 'AUTH_REQUIRED', 'Sign in again.');
  const response = await fetch(`${requiredApiUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  const body = await parseResponse(response) as { data: { tokens: Tokens } };
  await saveTokens(body.data.tokens);
  return body.data.tokens.accessToken;
}

function requiredApiUrl() {
  if (!API_URL?.startsWith('https://')) throw new Error('EXPO_PUBLIC_ACADEMIAOS_API_URL must be an HTTPS URL.');
  return API_URL;
}

export async function login(input: {
  username: string;
  password: string;
  deviceIdentifier: string;
  deviceName?: string;
  platform: 'android' | 'ios';
  appVersion?: string;
}) {
  const response = await fetch(`${requiredApiUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  const body = await parseResponse(response) as { data: { tokens: Tokens; user: unknown } };
  await saveTokens(body.data.tokens);
  return body.data;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const accessToken = await SecureStore.getItemAsync(ACCESS_KEY);
  if (!accessToken) throw new AcademiaApiError(401, 'AUTH_REQUIRED', 'Sign in again.');
  const response = await fetch(`${requiredApiUrl()}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (response.status === 401 && retry) {
    try {
      await refreshTokens();
      return apiRequest<T>(path, init, false);
    } catch (error) {
      await clearMobileSession();
      throw error;
    }
  }
  return parseResponse(response) as Promise<T>;
}

export async function logout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' }, false);
  } finally {
    await clearMobileSession();
  }
}
