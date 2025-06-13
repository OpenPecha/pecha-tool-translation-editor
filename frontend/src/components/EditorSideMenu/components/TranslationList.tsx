import React from "react";
import { Translation } from "../../DocumentWrapper";
import TranslationItem from "./TranslationItem";

interface TranslationStatusData {
  id: string;
  translationStatus: string;
  translationProgress?: number;
}

interface TranslationListProps {
  translations: Array<
    Translation & {
      translationStatus?: string;
      translationProgress?: number;
    }
  >;
  translationStatusData?: TranslationStatusData[];
  setSelectedTranslationId: (id: string) => void;
}

const TranslationList: React.FC<TranslationListProps> = ({
  translations,
  translationStatusData,
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
          translationStatusData={translationStatusData}
          setSelectedTranslationId={setSelectedTranslationId}
        />
      ))}
    </>
  );
};

export default TranslationList;
