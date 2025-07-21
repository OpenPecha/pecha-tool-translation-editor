import { Label } from "@/components/ui/label";
import { memo, useCallback } from "react";
import { languages } from "@/utils/Constants";
import { useTranslate } from "@tolgee/react";
import { ChevronDown } from "lucide-react";

function SelectLanguage({
  selectedLanguage,
  setSelectedLanguage,
}: {
  readonly selectedLanguage: string;
  readonly setSelectedLanguage: (language: string) => void;
}) {
  const { t } = useTranslate();
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedLanguage(e.target.value);
    },
    [setSelectedLanguage]
  );

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700">
        {t("common.language")}
      </Label>
      <div className="relative">
        <select
          className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          onChange={handleChange}
          value={selectedLanguage}
        >
          {languages.length > 0 && (
            <>
              <option value="" disabled className="text-gray-500">
                Select a language
              </option>
              {languages.map((language) => (
                <option
                  key={language.code}
                  value={language.code}
                  className="text-gray-900"
                >
                  {language.name}
                </option>
              ))}
            </>
          )}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

export default memo(SelectLanguage);
