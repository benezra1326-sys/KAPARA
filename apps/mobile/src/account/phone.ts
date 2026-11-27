import { getLocales } from 'expo-localization';

/**
 * Phone numbers for sign-in by SMS, in international form (E.164: +33612345678).
 * Open worldwide: any country code is accepted; the device's region only
 * pre-fills the country code, which the member can change.
 */
const DIAL: Record<string, string> = {
  FR: '33', BE: '32', CH: '41', LU: '352', MC: '377', IL: '972', US: '1', CA: '1', GB: '44', IE: '353', DE: '49', IT: '39', ES: '34',
  PT: '351', NL: '31', AT: '43', SE: '46', NO: '47', DK: '45', FI: '358', PL: '48', CZ: '420', HU: '36', RO: '40', GR: '30', TR: '90',
  RU: '7', UA: '380', MA: '212', TN: '216', DZ: '213', ZA: '27', AE: '971', AU: '61', NZ: '64', BR: '55', AR: '54', MX: '52', CL: '56',
  CO: '57', PA: '507', UY: '598', VE: '58', IN: '91', SG: '65', HK: '852', JP: '81', CN: '86', TH: '66',
};

/** "+33" from the device's region, "+33" by default. */
export function defaultDialCode(): string {
  const region = getLocales()[0]?.regionCode?.toUpperCase();
  return `+${(region && DIAL[region]) || '33'}`;
}

/**
 * Country code + number as typed → "+33612345678", or null when it cannot be
 * a phone number. A number already starting with + or 00 keeps its own
 * country code; a leading national 0 is dropped (06… → +336…).
 */
export function toE164(dial: string, number: string): string | null {
  const raw = number.trim();
  let digits: string;
  if (/^(\+|00)/.test(raw)) digits = raw.replace(/^00/, '').replace(/\D/g, '');
  else {
    const cc = dial.replace(/\D/g, '');
    if (!cc) return null;
    digits = cc + raw.replace(/\D/g, '').replace(/^0+/, '');
  }
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
}

/** "+33612345678" → "+33 6 12 34 56 78"-ish, for showing the number back. */
export function prettyPhone(e164: string): string {
  return e164.replace(/^(\+\d{1,3})(\d)(\d{2})(\d{2})(\d{2})(\d{2,})$/, '$1 $2 $3 $4 $5 $6');
}
