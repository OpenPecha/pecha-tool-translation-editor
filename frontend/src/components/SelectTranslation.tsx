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
    <div className=" mt-3 bg-gray-50 shadow-lg rounded-lg overflow-hidden">
      <h3 className="text-xl font-bold px-6 py-4 bg-gray-100 text-gray-800 border-b border-gray-200">
        Select a Translation
      </h3>
      <div className=" p-2">
        {translations.map((translation: Translation) => (
          <Button
            key={translation.id}
            onClick={() => setSelectedTranslationId(translation.id)}
            type="button"
            className="cursor-pointer"
            aria-label={`Select translation ${translation.identifier}`}
          >
            {translation.identifier}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default SelectTranslation;
