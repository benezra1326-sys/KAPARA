import { DEMO_IMAGE_SCHEME } from './people';
import { DEMO_IMAGES } from './images.generated';

/**
 * Resolves a photo URL to an image source. Demo photos use the private
 * `kapara-demo://` scheme (in the offline app and in the seeded database) and
 * are bundled with the app; every other URL is returned unchanged.
 *
 *   <Image source={photoSource(photo.url)} />
 */
export function photoSource(url: string): number | string {
  if (!url.startsWith(DEMO_IMAGE_SCHEME)) return url;
  return DEMO_IMAGES[url.slice(DEMO_IMAGE_SCHEME.length)] ?? url;
}

export const isDemoImage = (url: string) => url.startsWith(DEMO_IMAGE_SCHEME);
