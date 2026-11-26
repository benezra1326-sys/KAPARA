import { Platform } from 'react-native';

/**
 * react-native-web colours the thumb of a switched-on Switch with its own
 * default teal (#009688) unless `activeThumbColor` is set; native uses
 * `thumbColor`. Spread this on every Switch so the thumb keeps the brand colour.
 */
export const switchThumb = (color: string): object =>
  Platform.OS === 'web' ? { activeThumbColor: color, thumbColor: color } : { thumbColor: color };
