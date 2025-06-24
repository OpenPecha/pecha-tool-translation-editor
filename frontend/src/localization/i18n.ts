import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "./data/en.json";
import boTranslations from "./data/bo.json";
import zhTranslations from "./data/zh.json";

i18n.use(initReactI18next).init({
  debug: true,
  fallbackLng: "en",
  lng: "en", // default language
  resources: {
    en: {
      translation: enTranslations,
    },
    bo: {
      translation: boTranslations,
    },
    zh: {
      translation: zhTranslations,
    },
  },
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18n;
