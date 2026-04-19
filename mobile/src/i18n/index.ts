import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import ar from './locales/ar.json';
import en from './locales/en.json';

const SUPPORTED = ['ar', 'en'] as const;
export type Locale = (typeof SUPPORTED)[number];

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'ar';
const initial: Locale = SUPPORTED.includes(deviceLocale as Locale)
  ? (deviceLocale as Locale)
  : 'ar';

export async function applyRtl(locale: Locale) {
  const shouldBeRtl = locale === 'ar';
  if (I18nManager.isRTL !== shouldBeRtl) {
    I18nManager.allowRTL(shouldBeRtl);
    I18nManager.forceRTL(shouldBeRtl);
  }
}

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: initial,
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

applyRtl(initial);

export default i18n;
