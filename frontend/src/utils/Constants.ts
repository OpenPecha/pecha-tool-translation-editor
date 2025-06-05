export const LARGEDOCUMENT_SIZE = 900000; //sync with backend utils.js largeContentCharacterLength

type LanguageType = {
  code: string;
  name: string;
};

export const languages: LanguageType[] = [
  {
    code: "bo",
    name: "Tibetan",
  },
  {
    code: "en",
    name: "English",
  },
  {
    code: "hi",
    name: "Hindi",
  },
  {
    code: "it",
    name: "Italian",
  },
  {
    code: "lzh",
    name: "Literal Chinese",
  },
  {
    code: "ru",
    name: "Russian",
  },
  {
    code: "sa",
    name: "Sanskrit",
  },
  {
    code: "zh",
    name: "Chinese",
  },
];
