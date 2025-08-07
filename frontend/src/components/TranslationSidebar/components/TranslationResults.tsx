import React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

interface TranslationResult {
  id: string;
  originalText: string;
  translatedText: string;
  timestamp: string;
  metadata?: {
    batch_id?: string;
    model_used?: string;
    text_type?: string;
  };
  previousTranslatedText?: string;
  isUpdated?: boolean;
}

interface TranslationResultsProps {
  translationResults: TranslationResult[];
  copiedItems: Set<string>;
  expandedItems: Set<number>;
  onCopyResult: (text: string, resultId: string) => void;
  onToggleItemExpansion: (index: number) => void;
}

const TRUNCATE_LENGTH = 150;

const TranslationResults: React.FC<TranslationResultsProps> = ({
  translationResults,
  copiedItems,
  expandedItems,
  onCopyResult,
  onToggleItemExpansion,
}) => {
  const truncateText = (
    text: string,
    maxLength: number = TRUNCATE_LENGTH
  ): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const shouldShowExpandButton = (text: string): boolean => {
    return text.length > TRUNCATE_LENGTH;
  };

  return (
    <div className="space-y-4">
      {translationResults.map((result, index) => (
        <div key={result.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {new Date(result.timestamp).toLocaleTimeString()}
            </span>
            <div className="flex gap-1">
              <Button
                onClick={() => onCopyResult(result.translatedText, result.id)}
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 hover:bg-gray-200 transition-colors ${
                  copiedItems.has(result.id)
                    ? "bg-green-100 text-green-600"
                    : ""
                }`}
                title={copiedItems.has(result.id) ? "Copied!" : "Copy"}
              >
                {copiedItems.has(result.id) ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {/* Source Text */}
            <div className="border-l-4 border-gray-300 pl-3">
              <div className="text-xs text-gray-500 mb-1 font-medium flex items-center gap-2">
                Source:
              </div>
              <div className="text-sm text-gray-600 leading-relaxed">
                {expandedItems.has(index)
                  ? result.originalText
                  : truncateText(result.originalText)}
              </div>
              {shouldShowExpandButton(result.originalText) && (
                <Button
                  onClick={() => onToggleItemExpansion(index)}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 mt-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  {expandedItems.has(index) ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Show more
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Translation Text */}
            <div className="border-l-4 border-blue-300 pl-3">
              <div className="text-xs text-gray-500 mb-1 font-medium flex items-center gap-2">
                Translation:
                {result.isUpdated && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Updated
                  </span>
                )}
              </div>

              {/* Show old translation (strikethrough) if updated */}
              {result.isUpdated && result.previousTranslatedText && (
                <div className="text-sm text-gray-500 leading-relaxed mb-2">
                  <div className="whitespace-pre-wrap font-sans line-through opacity-75">
                    {expandedItems.has(index)
                      ? result.previousTranslatedText
                      : truncateText(result.previousTranslatedText)}
                  </div>
                </div>
              )}

              {/* Show new translation (green if updated) */}
              <div
                className={`text-sm leading-relaxed ${
                  result.isUpdated
                    ? "text-green-800 bg-green-50 p-2 rounded"
                    : "text-gray-800"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">
                  {expandedItems.has(index)
                    ? result.translatedText
                    : truncateText(result.translatedText)}
                </div>
              </div>

              {shouldShowExpandButton(result.translatedText) && (
                <Button
                  onClick={() => onToggleItemExpansion(index)}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 mt-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  {expandedItems.has(index) ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Show more
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TranslationResults;
