import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import sw from './locales/sw.json';
import lg from './locales/lg.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',    nativeName: 'English',    flag: 'GB', dir: 'ltr' },
  { code: 'sw', name: 'Swahili',    nativeName: 'Kiswahili',  flag: 'TZ', dir: 'ltr' },
  { code: 'lg', name: 'Luganda',    nativeName: 'Luganda',    flag: 'UG', dir: 'ltr' },
  { code: 'fr', name: 'French',     nativeName: 'Français',   flag: 'FR', dir: 'ltr' },
  { code: 'ar', name: 'Arabic',     nativeName: 'العربية',    flag: 'SA', dir: 'rtl' },
  { code: 'zh', name: 'Chinese',    nativeName: '中文',        flag: 'CN', dir: 'ltr' },
  { code: 'es', name: 'Spanish',    nativeName: 'Español',    flag: 'ES', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português',  flag: 'BR', dir: 'ltr' },
];

const instance = i18n.use(initReactI18next);

// LanguageDetector is browser-only — guard against SSR
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const LanguageDetector = require('i18next-browser-languagedetector').default;
  instance.use(LanguageDetector);
}

instance.init({
  resources: {
    en: { translation: en },
    sw: { translation: sw },
    lg: { translation: lg },
    fr: { translation: fr },
    ar: { translation: ar },
    zh: { translation: zh },
    es: { translation: es },
    pt: { translation: pt },
  },
  fallbackLng: 'en',
  // On SSR default to English; on client browser detection sets the language
  lng: typeof window === 'undefined' ? 'en' : undefined,
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
    lookupLocalStorage: 'i18n_lng',
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
