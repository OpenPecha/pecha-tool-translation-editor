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
      <p className="text-sm">{t("common.language")}</p>
      <Select
        value={currentLanguage}
        onValueChange={setLang}
        disabled={isLoading}
      >
        <SelectTrigger className="flex-1 bg-white border-2 border-neutral-200 rounded-lg shadow-sm hover:border-neutral-300 focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-all duration-200 dark:bg-neutral-800 dark:border-neutral-600 dark:text-white dark:hover:border-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed">
          <div className="flex items-center space-x-2 gap-2">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secondary-500"></div>
                <span className="text-sm">{t("common.loading")}</span>
              </div>
            ) : (
              <>
                <span className="text-lg">{selectedLanguage?.flag}</span>
                {selectedLanguage?.name}
              </>
            )}
          </div>
        </SelectTrigger>
        <SelectContent className="bg-white border border-neutral-200 rounded-lg shadow-xl dark:bg-neutral-800 dark:border-neutral-600">
          {i18n_languages.map((language) => (
            <SelectItem
              key={language.code}
              value={language.code}
              className="cursor-pointer hover:bg-secondary-50 dark:hover:bg-neutral-700 focus:bg-secondary-50 dark:focus:bg-neutral-700 transition-colors duration-150"
            >
              <div className="flex items-center space-x-3 py-1">
                <span className="text-lg">{language?.flag}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
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
