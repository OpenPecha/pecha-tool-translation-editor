import { GrDocument } from "react-icons/gr";
import { Translation } from "./DocumentWrapper";
import { Button } from "./ui/button";

function SelectTranslation({
  translations,
  setSelectedTranslationId,
}: {
  readonly translations: Translation[];
  readonly setSelectedTranslationId: (id: string) => void;
}) {
  return (
    <div className=" mt-3   rounded-lg overflow-hidden">
      <div className="flex flex-col gap-2 p-2">
        {translations.map((translation: Translation, index: number) => (
          <div
            key={translation.id}
            onClick={() => setSelectedTranslationId(translation.id)}
            className="cursor-pointer capitalize flex items-center gap-2"
          >
            <GrDocument />
            {translation.identifier}({translation.language})
          </div>
        ))}
      </div>
    </div>
  );
}

export default SelectTranslation;
