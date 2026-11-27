import type { ExpoConfig } from 'expo/config';
// Brand is centralised: rename the app in packages/config/src/brand.json.
import brand from '../../packages/config/src/brand.json';
// The .ts extension is required: Expo loads this file without resolving other TypeScript modules.
// @ts-expect-error TS5097 (extension needed at runtime, see above)
import { checkAppEnv } from '../../packages/config/src/backend.ts';

// One explicit backend per build (demo | test | api). A production build that
// is not on the real API, or has no real https address, is refused here.
const env = checkAppEnv(process.env);
if (process.env.EAS_BUILD_PROFILE === 'production' && env.appEnv !== 'production') {
  env.errors.push('The EAS "production" profile must set EXPO_PUBLIC_APP_ENV=production.');
}
if (env.errors.length) {
  const msg = `ZIV configuration (${env.appEnv}, backend ${env.backend}):\n- ${env.errors.join('\n- ')}`;
  if (env.appEnv === 'production' || process.env.EAS_BUILD_PROFILE === 'production') throw new Error(msg);
  console.warn(msg);
}

const CAMERA = `${brand.name} n’utilise l’appareil photo que si vous prenez une photo de profil ou acceptez la vidéo pendant un appel.`;

const config: ExpoConfig = {
  name: brand.name,
  slug: brand.slug,
  scheme: brand.scheme,
  version: '0.1.0',
  orientation: 'portrait',
  // ZIV icon in garnet (assets/brand, generated from brand.json). Opaque 1024 px; iOS applies its own mask.
  icon: './assets/brand/icon-1024.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: brand.bundleId,
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: `${brand.name} utilise une position approximative uniquement si vous activez « Croisés ».`,
      NSCameraUsageDescription: CAMERA,
      NSMicrophoneUsageDescription: `${brand.name} utilise le micro pendant les appels que vous acceptez.`,
    },
  },
  android: {
    package: brand.bundleId,
    permissions: ['ACCESS_COARSE_LOCATION', 'CAMERA', 'RECORD_AUDIO'],
    // Croisés never needs precise or background location.
    blockedPermissions: ['android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_BACKGROUND_LOCATION'],
  },
  plugins: [
    'expo-router', 'expo-font', 'expo-localization', 'expo-secure-store',
    ['expo-location', {
      locationWhenInUsePermission: `${brand.name} utilise une position approximative uniquement si vous activez « Croisés ».`,
      isIosBackgroundLocationEnabled: false,
      isAndroidBackgroundLocationEnabled: false,
    }],
    // Live calls (LiveKit / WebRTC): native modules, so a development build is required (not Expo Go).
    ['@livekit/react-native-expo-plugin', { android: { audioType: 'communication' } }],
    '@config-plugins/react-native-webrtc',
    // Profile photos: system photo picker (no full library access), camera only when the member chooses it.
    ['expo-image-picker', {
      photosPermission: `${brand.name} n’accède qu’aux photos que vous choisissez pour votre profil.`,
      cameraPermission: CAMERA,
      microphonePermission: false,
    }],
  ],
  experiments: { typedRoutes: true },
  extra: { apiUrl: env.apiUrl, backend: env.backend, appEnv: env.appEnv },
};

export default config;
