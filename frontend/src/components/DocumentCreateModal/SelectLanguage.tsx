import { fetchLanguage } from "@/api/pecha";
import { Label } from "../ui/label";
import { useQuery } from "@tanstack/react-query";
import { memo, useCallback } from "react";

type LanguageType = {
  code: string;
  name: string;
};

function SelectLanguage({
  selectedLanguage,
  setSelectedLanguage,
}: {
  readonly selectedLanguage: string;
  readonly setSelectedLanguage: (language: string) => void;
}) {
  // const { data: languages = [], isLoading } = useQuery<LanguageType[]>({
  //   queryKey: ["languages"],
  //   queryFn: fetchLanguage,
  //   staleTime: 1000 * 60 * 60 * 24, // 1 day
  //   retry: 2,
  //   retryDelay: 1000,
  // });

  const languages = [
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

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedLanguage(e.target.value);
    },
    [setSelectedLanguage]
  );

  return (
    <div className="flex gap-2 flex-col mb-2">
      <Label>Language:</Label>
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
