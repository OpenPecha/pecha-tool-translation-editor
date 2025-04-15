import { fetchLanguage } from "@/api/pecha";
import { Label } from "../ui/label";
import { useQuery } from "@tanstack/react-query";

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
  const { data: languages = [] } = useQuery<LanguageType[]>({
    queryKey: ["languages"],
    queryFn: fetchLanguage,
  });

  return (
    <div className="flex gap-2 mb-4">
      <Label>Language of Text:</Label>
      {languages.length > 0 && (
        <select
          className=" p-2 border rounded"
          onChange={(e) => setSelectedLanguage(e.target.value)}
          value={selectedLanguage}
        >
          <option value="" disabled>
            Select a language
          </option>
          {languages.map((language, index) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default SelectLanguage;
