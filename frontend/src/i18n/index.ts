import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./en/translation.json";
import bo from "./bo/translation.json";
import zh from "./zh/translation.json";

const resources = {
  en: { translation: en },
  bo: { translation: bo },
  zh: { translation: zh },
};

// Available languages configuration
export const AVAILABLE_LANGUAGES = ["en", "bo", "zh"] as const;
export type Language = (typeof AVAILABLE_LANGUAGES)[number];
export const LANGUAGE_STORAGE_KEY = "selected_language";

// Get stored language from localStorage
const getStoredLanguage = (): Language => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && AVAILABLE_LANGUAGES.includes(stored as Language)) {
      return stored as Language;
    }
  } catch (error) {
    console.warn("Failed to get stored language:", error);
  }
  return "en";
};

// Set stored language in localStorage
export const setStoredLanguage = (language: Language): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn("Failed to store language:", error);
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    lng: getStoredLanguage(),
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export default i18n;
