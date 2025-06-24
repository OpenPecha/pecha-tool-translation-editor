import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MdLanguage } from "react-icons/md";
import { i18n_languages } from "@/utils/Constants";
import { useEffect } from "react";
import useLocalStorage from "@/hooks/useLocalStorage";

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useLocalStorage(
    "language",
    "en"
  );

  const changeLanguage = (lng: string) => {
    setCurrentLanguage(lng);
    i18n.changeLanguage(lng);
  };

  const selectedLanguage =
    i18n_languages.find((lang) => lang.code === currentLanguage) ||
    i18n_languages[0];
  useEffect(() => {
    i18n.changeLanguage(currentLanguage);
  }, [currentLanguage]);
  return (
    <div className="flex items-center gap-2">
      <p className="text-sm text-gray-500">{t("common.language")}:</p>
      <Select value={currentLanguage} onValueChange={changeLanguage}>
        <SelectTrigger className=" flex-1 bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:border-gray-500">
          <div className="flex items-center space-x-2 gap-2">
            <span className="text-lg">{selectedLanguage?.flag}</span>
            {selectedLanguage?.name}
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
