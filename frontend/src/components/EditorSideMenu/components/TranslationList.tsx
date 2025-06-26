import React from "react";
import { Translation } from "../../DocumentWrapper";
import TranslationItem from "./TranslationItem";

interface TranslationListProps {
  translations: Array<
    Translation & {
      translationStatus?: string;
      translationProgress?: number;
    }
  >;
  setSelectedTranslationId: (id: string) => void;
}

const TranslationList: React.FC<TranslationListProps> = ({
  translations,
  setSelectedTranslationId,
}) => {
  if (translations.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No translations available</p>
    );
  }

  return (
    <>
      {translations.map((translation) => (
        <TranslationItem
          key={translation.id}
          translation={translation}
          setSelectedTranslationId={setSelectedTranslationId}
        />
      ))}
    </>
  );
};

export default TranslationList;
