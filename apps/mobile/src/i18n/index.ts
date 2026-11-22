import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';
import { DEFAULT_LOCALE, RTL_LOCALES, SUPPORTED_LOCALES, type LocaleCode } from '@kapara/config';
import fr from './fr';
import en from './en';
import he from './he';

const device = getLocales()[0]?.languageCode as LocaleCode | undefined;
const lng = device && SUPPORTED_LOCALES.includes(device) ? device : DEFAULT_LOCALE;

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en }, he: { translation: he } },
  lng,
  fallbackLng: [DEFAULT_LOCALE, 'en'],
  interpolation: { escapeValue: false },
});

I18nManager.allowRTL(true);
export const isRTL = RTL_LOCALES.includes(lng);
export default i18n;
