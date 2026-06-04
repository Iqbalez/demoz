import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import am from './locales/am.json';

const resources = {
  en: { translation: en },
  am: { translation: am },
};

// Use device language or default to English
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
const defaultLang = ['en', 'am'].includes(deviceLanguage) ? deviceLanguage : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
