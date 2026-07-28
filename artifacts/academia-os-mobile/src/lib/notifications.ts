import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { updateDevice } from '@/api/client';
import { deviceIdentity } from './device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true })
});

export async function registerForPushNotifications() {
  if (Platform.OS === 'web' || !Device.isDevice) return { enabled: false, reason: 'Physical device required' };
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('academiaos', {
      name: 'AcademiaOS alerts', importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250], lightColor: '#0B6E4F'
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') {
    await updateDevice({ notificationsEnabled: false, pushToken: null }).catch(() => undefined);
    return { enabled: false, reason: 'Permission denied' };
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId || projectId === 'REPLACE_WITH_EAS_PROJECT_ID') return { enabled: false, reason: 'EAS project ID missing' };
  const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const identity = await deviceIdentity();
  await updateDevice({ deviceName: identity.deviceName, appVersion: identity.appVersion, pushToken, notificationsEnabled: true });
  return { enabled: true, pushToken };
}
