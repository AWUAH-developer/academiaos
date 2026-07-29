import type { ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext) => ({
  ...config,
  name: 'AcademiaOS',
  slug: 'academiaos-mobile',
  version: '1.0.6',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'academiaos',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#071A33'
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.academiaos.mobile',
    infoPlist: {
      NSFaceIDUsageDescription: 'Allow AcademiaOS to unlock your signed-in account securely.',
      NSCameraUsageDescription: 'Allow AcademiaOS to scan learner QR badges and capture authorised profile photos.',
      NSPhotoLibraryUsageDescription: 'Allow AcademiaOS to choose authorised school and profile images.'
    }
  },
  android: {
    package: 'com.academiaos.mobile',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#071A33'
    },
    permissions: ['CAMERA', 'POST_NOTIFICATIONS'],
    predictiveBackGestureEnabled: false
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png'
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#0B6E4F',
        defaultChannel: 'academiaos'
      }
    ],
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          minSdkVersion: 24
        },
        ios: {
          deploymentTarget: '16.4'
        }
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'REPLACE_WITH_EAS_PROJECT_ID'
    }
  }
});
