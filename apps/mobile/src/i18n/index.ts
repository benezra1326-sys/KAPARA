import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager, Platform } from 'react-native';
import { DEFAULT_LOCALE, RTL_LOCALES, SUPPORTED_LOCALES, type LocaleCode } from '@kapara/config';
import fr from './fr';
import en from './en';
import he from './he';

const device = getLocales()[0]?.languageCode as LocaleCode | undefined;
/** Web: a shared link can pick the language (?lang=he), then the choice is kept on this browser. */
function webChoice(): LocaleCode | undefined {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return undefined;
  try {
    const q = new URLSearchParams(location.search).get('lang') as LocaleCode | null;
    if (q && SUPPORTED_LOCALES.includes(q)) { localStorage.setItem('motek.lang', q); return q; }
    const saved = localStorage.getItem('motek.lang') as LocaleCode | null;
    return saved && SUPPORTED_LOCALES.includes(saved) ? saved : undefined;
  } catch { return undefined; }
}
const chosen = webChoice();
const lng = chosen ?? (device && SUPPORTED_LOCALES.includes(device) ? device : DEFAULT_LOCALE);

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en }, he: { translation: he } },
  lng,
  fallbackLng: [DEFAULT_LOCALE, 'en'],
  interpolation: { escapeValue: false },
});

// French elision before a first name: « la photo d’Ilan », « de Noam ». Used as {{name, de}} in fr.ts.
const ELIDE = /^[aeiouyàâäéèêëîïôöùûü]/i;
i18n.services.formatter?.add('de', (value: string) => (ELIDE.test(value) ? `d’${value}` : `de ${value}`));

I18nManager.allowRTL(true);
export const isRTL = RTL_LOCALES.includes(lng);
/** Hebrew swaps Fraunces/Inter for Frank Ruhl Libre/Heebo (see Text). */
export const isHebrew = lng === 'he';
// Web: the page itself reads right to left in Hebrew (text, rows, scroll bars).
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.lang = lng;
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
}
export default i18n;

/** Option labels are grouped by answer type; both kashrut fields share one list. */
const OPTION_GROUP: Record<string, string> = { kashrutHome: 'kashrut', kashrutOutside: 'kashrut' };

/** i18n key of a Jewish-life answer, e.g. t(jewishLifeOptionKey('kashrutHome', 'not_kosher')). */
export const jewishLifeOptionKey = (field: string, value: string) => `jewishLife.options.${OPTION_GROUP[field] ?? field}.${value}`;
