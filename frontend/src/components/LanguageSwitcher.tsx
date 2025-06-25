import {
  useTranslate,
  useSetLanguage,
  useCurrentLanguage,
  Language,
} from "@/contexts/TolgeeContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { i18n_languages } from "@/utils/Constants";
import { useTolgee } from "@tolgee/react";

const LanguageSwitcher = () => {
  const { t } = useTranslate();
  const changeLanguage = useSetLanguage();
  const currentLanguage = useCurrentLanguage();
  const tolgee = useTolgee();
  const isLoading = tolgee.isLoading();
  const setLang = async (lng: Language) => {
    changeLanguage(lng);
  };

  const selectedLanguage =
    i18n_languages.find((lang) => lang.code === currentLanguage) ||
    i18n_languages[0];

  return (
    <div className="flex items-center gap-2">
      <p className="text-sm text-gray-500">{t("common.language")}</p>
      <Select
        value={currentLanguage}
        onValueChange={setLang}
        disabled={isLoading}
      >
        <SelectTrigger className="flex-1 bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">
          <div className="flex items-center space-x-2 gap-2">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
            ) : (
              <>
                <span className="text-lg">{selectedLanguage?.flag}</span>
                {selectedLanguage?.name}
              </>
            )}
          </div>
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-600">
          {i18n_languages.map((language) => (
            <SelectItem
              key={language.code}
              value={language.code}
              className="cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 focus:bg-blue-50 dark:focus:bg-gray-700 transition-colors duration-150"
            >
              <div className="flex items-center space-x-3 py-1">
                <span className="text-lg">{language?.flag}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {language.name}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSwitcher;
