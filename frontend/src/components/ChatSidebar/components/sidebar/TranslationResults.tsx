import type React from "react";
import { useTranslation } from "../../contexts/TranslationContext";
import TranslationItem, { type TranslationResult } from "./TranslationItem";

interface TranslationResultsProps {
  results?: TranslationResult[];
  isStandardized?: boolean;
}

const TranslationResults: React.FC<TranslationResultsProps> = ({
  results,
  isStandardized = false,
}) => {
  const { translationResults: defaultTranslationResults } = useTranslation();

  const translationResults = results || defaultTranslationResults;

  return (
    <div className="space-y-4">
      {translationResults.map((result, index) => (
        <TranslationItem
          key={result.id}
          result={result}
          index={index}
          isStandardized={isStandardized}
        />
      ))}
    </div>
  );
};

export default TranslationResults;
