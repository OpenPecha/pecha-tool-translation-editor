import React from "react";
import { Translation } from "../../DocumentWrapper";
import TranslationItem from "./TranslationItem";

interface TranslationListProps {
  translations: Translation[];
}

const TranslationList: React.FC<TranslationListProps> = ({
  translations,
}) => {
  if (translations.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">No translations available</p>
    );
  }

  return (
    <>
      {translations.map((translation) => (
        <TranslationItem
          key={translation.id}
          translation={translation}
        />
      ))}
    </>
  );
};

export default TranslationList;
