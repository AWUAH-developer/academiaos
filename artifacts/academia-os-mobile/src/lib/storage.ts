import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'academiaos.mobile.access';
const REFRESH_KEY = 'academiaos.mobile.refresh';
const DEVICE_KEY = 'academiaos.mobile.device-id';

function webStore() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}
function webPersistentStore() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export async function getAccessToken() {
  return Platform.OS === 'web' ? webStore()?.getItem(ACCESS_KEY) ?? null : SecureStore.getItemAsync(ACCESS_KEY);
}
export async function getRefreshToken() {
  return Platform.OS === 'web' ? webStore()?.getItem(REFRESH_KEY) ?? null : SecureStore.getItemAsync(REFRESH_KEY);
}
export async function saveTokens(accessToken: string, refreshToken: string) {
  if (Platform.OS === 'web') {
    webStore()?.setItem(ACCESS_KEY, accessToken);
    webStore()?.setItem(REFRESH_KEY, refreshToken);
    return;
  }
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, accessToken, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
    SecureStore.setItemAsync(REFRESH_KEY, refreshToken, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY })
  ]);
}
export async function clearTokens() {
  if (Platform.OS === 'web') {
    webStore()?.removeItem(ACCESS_KEY);
    webStore()?.removeItem(REFRESH_KEY);
    return;
  }
  await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
}
export async function getStoredDeviceId() {
  return Platform.OS === 'web' ? webPersistentStore()?.getItem(DEVICE_KEY) ?? null : SecureStore.getItemAsync(DEVICE_KEY);
}
export async function saveDeviceId(value: string) {
  if (Platform.OS === 'web') webPersistentStore()?.setItem(DEVICE_KEY, value);
  else await SecureStore.setItemAsync(DEVICE_KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
