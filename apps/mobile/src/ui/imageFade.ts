import { Platform } from 'react-native';

/**
 * Fade-in duration for expo-image. On the web, expo-image keeps an image at
 * opacity 0 until its load event; when that event is missed (image already
 * decoded from cache), the photo stays invisible for good — seen on the web
 * demo in Croisés. The web shows photos at once instead; native keeps the fade.
 */
export const imageFade = (ms: number): number | undefined => (Platform.OS === 'web' ? undefined : ms);
