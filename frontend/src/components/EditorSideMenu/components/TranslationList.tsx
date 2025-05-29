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
  onDeleteTranslation: (id: string, event: React.MouseEvent) => void;
  onEditTranslation: (id: string, name: string) => void;
  deletingTranslationId: string | null;
}

const TranslationList: React.FC<TranslationListProps> = ({
  translations,
  translationStatusData,
  setSelectedTranslationId,
  onDeleteTranslation,
  onEditTranslation,
  deletingTranslationId,
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
          onDelete={onDeleteTranslation}
          onEdit={onEditTranslation}
          isDeleting={deletingTranslationId === translation.id}
        />
      ))}
    </>
  );
};

export default TranslationList;
