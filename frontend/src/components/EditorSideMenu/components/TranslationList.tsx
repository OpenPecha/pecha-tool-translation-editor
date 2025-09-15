import React from "react";
import { Translation } from "../../DocumentWrapper";
import TranslationItem from "./TranslationItem";
import { useTranslate } from "@tolgee/react";

interface TranslationListProps {
  translations: Translation[];
}

const TranslationList: React.FC<TranslationListProps> = ({
  translations,
}) => {
  const { t } = useTranslate();
  if (translations.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">{t("translation.noTranslationsAvailable")}</p>
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
