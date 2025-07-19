export const LARGEDOCUMENT_SIZE = 900000; //sync with backend utils.js largeContentCharacterLength

// File upload size limits (in bytes)
export const MAX_FILE_SIZE_BYTES = 1000000; // 1MB = 1,000,000 bytes
export const MAX_FILE_SIZE_DISPLAY = "1MB"; // Human-readable display

/**
 * Formats file size in bytes to human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB", "500 KB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";

  const k = 1000; // Use decimal (SI) units for consistency with MAX_FILE_SIZE_BYTES
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

type LanguageType = {
  code: string;
  name: string;
  flag?: string;
};

export const languages: LanguageType[] = [
  {
    code: "bo",
    name: "Tibetan",
    flag: "🏔️",
  },
  {
    code: "en",
    name: "English",
    flag: "🇺🇸",
  },
  {
    code: "hi",
    name: "Hindi",
    flag: "🇮🇳",
  },
  {
    code: "it",
    name: "Italian",
    flag: "🇮🇹",
  },
  {
    code: "lzh",
    name: "Literal Chinese",
    flag: "🇨🇳",
  },
  {
    code: "ru",
    name: "Russian",
    flag: "🇷🇺",
  },
  {
    code: "sa",
    name: "Sanskrit",
    flag: "🇮🇳",
  },
  {
    code: "zh",
    name: "Chinese",
    flag: "🇨🇳",
  },
];

export const i18n_languages: LanguageType[] = [
  {
    code: "bo",
    name: "བོད་ཡིག",
    flag: "🏔️",
  },
  {
    code: "en",
    name: "English",
    flag: "🇺🇸",
  },
  {
    code: "zh",
    name: "中文",
    flag: "🇨🇳",
  },
];
