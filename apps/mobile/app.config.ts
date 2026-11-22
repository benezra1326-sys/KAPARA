import type { ExpoConfig } from 'expo/config';
// Brand is centralised: rename the app in packages/config/src/brand.json.
import brand from '../../packages/config/src/brand.json';

const config: ExpoConfig = {
  name: brand.name,
  slug: brand.slug,
  scheme: brand.scheme,
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: brand.bundleId,
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: `${brand.name} utilise une position approximative uniquement si vous activez « Croisés ».`,
      NSCameraUsageDescription: `${brand.name} n’active la caméra que lorsque vous l’acceptez pendant un appel vidéo.`,
      NSMicrophoneUsageDescription: `${brand.name} utilise le micro pendant les appels que vous acceptez.`,
    },
  },
  android: {
    package: brand.bundleId,
    permissions: ['ACCESS_COARSE_LOCATION', 'CAMERA', 'RECORD_AUDIO'],
  },
  plugins: [
    'expo-router', 'expo-font', 'expo-localization', 'expo-secure-store',
    // Live calls (LiveKit / WebRTC): native modules, so a development build is required (not Expo Go).
    ['@livekit/react-native-expo-plugin', { android: { audioType: 'communication' } }],
    '@config-plugins/react-native-webrtc',
  ],
  experiments: { typedRoutes: true },
  extra: { apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000' },
};

export default config;
