import { Label } from "@/components/ui/label";
import { memo, useCallback } from "react";
import { languages } from "@/utils/Constants";
import { useTranslate } from "@tolgee/react";

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
    <div className="flex gap-2 flex-col mb-2">
      <Label>{t("common.language")}:</Label>
      <select
        className=" p-2 border rounded"
        onChange={handleChange}
        value={selectedLanguage}
      >
        {languages.length > 0 && (
          <>
            <option value="" disabled>
              Select a language
            </option>
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.name}
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
}

export default memo(SelectLanguage);
