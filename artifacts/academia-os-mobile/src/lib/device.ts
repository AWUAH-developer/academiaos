import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { getStoredDeviceId, saveDeviceId } from './storage';

function randomId() {
  const random = Math.random().toString(36).slice(2);
  return `academiaos-${Platform.OS}-${Date.now().toString(36)}-${random}`;
}

export async function deviceIdentity() {
  let deviceIdentifier: string | null = null;
  try {
    if (Platform.OS === 'android') deviceIdentifier = Application.getAndroidId();
    if (Platform.OS === 'ios') deviceIdentifier = await Application.getIosIdForVendorAsync();
  } catch {
    deviceIdentifier = null;
  }
  if (!deviceIdentifier) deviceIdentifier = await getStoredDeviceId();
  if (!deviceIdentifier) {
    deviceIdentifier = randomId();
    await saveDeviceId(deviceIdentifier);
  }
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'web' ? 'web' : 'android';
  const appVersion = Application.nativeApplicationVersion || Constants.expoConfig?.version || '1.0.0';
  const deviceName = Device.modelName || (Platform.OS === 'web' ? 'Web browser' : `${Platform.OS} device`);
  return { deviceIdentifier, deviceName, platform, appVersion } as const;
}
