import React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronDown, ChevronUp, ArrowDownToLine } from "lucide-react";
import DiffText from "./DiffText";
import { useEditor } from "@/contexts/EditorContext";
import { diffWords } from "diff";

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
  lineNumbers?: Record<string, { from: number; to: number }> | null;
}

interface TranslationResultsProps {
  translationResults: TranslationResult[];
  copiedItems: Set<string>;
  expandedItems: Set<number>;
  onCopyResult: (text: string, resultId: string) => void;
  onToggleItemExpansion: (index: number) => void;
  onInsertResult: (result: TranslationResult) => void;
}

const TRUNCATE_LENGTH = 150;

const TranslationResults: React.FC<TranslationResultsProps> = ({
  translationResults,
  copiedItems,
  expandedItems,
  onCopyResult,
  onToggleItemExpansion,
  onInsertResult,
}) => {

  const { scrollToLineNumber } = useEditor();
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

  const formatLineNumbers = (result: TranslationResult): string => {
    if (!result.lineNumbers) return "";
    
    const lineRanges = Object.entries(result.lineNumbers);
    if (lineRanges.length === 0) return "";
    
    // Use the first line range from this specific result
    const [lineKey, range] = lineRanges[0];
    const lineNumber = parseInt(lineKey);
    return `Line: ${lineNumber}(${range.from}-${range.to})`;
  };

  const countChanges = (oldText: string, newText: string): { additions: number; deletions: number } => {
    const differences = diffWords(oldText, newText);
    let additions = 0;
    let deletions = 0;
    
    differences.forEach(part => {
      if (part.added) {
        additions++;
      } else if (part.removed) {
        deletions++;
      }
    });
    
    return { additions, deletions };
  };


  return (
    <div className="space-y-4">
      {translationResults.map((result, index) => (
        <div key={result.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {new Date(result.timestamp).toLocaleTimeString()}
            </span>
            <div className="flex items-center gap-2">
              {/* Line Numbers Display */}
              {formatLineNumbers(result) && (
                <span 
                  className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200 hover:text-blue-600 transition-colors"
                  onClick={() => {
                    if (!result.lineNumbers) return;
                    const lineRanges = Object.entries(result.lineNumbers);
                    if (lineRanges.length > 0) {
                      const [lineKey] = lineRanges[0];
                      const lineNumber = parseInt(lineKey);
                      scrollToLineNumber(lineNumber); 
                    }
                  }}
                  title="Click to scroll to this line in the editor"
                >
                  {formatLineNumbers(result)}
                </span>
              )}
              <Button
                onClick={() => onInsertResult(result)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-blue-200 transition-colors"
                title="Insert translation at line position"
                disabled={!result.lineNumbers || Object.keys(result.lineNumbers).length === 0}
              >
                <ArrowDownToLine className="w-3 h-3 text-blue-600" />
              </Button>
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
              <div className="text-xs text-gray-500 mb-1 font-medium flex items-center justify-between">
                <span>Source:</span>
                {shouldShowExpandButton(result.originalText) && (
                  <Button
                    onClick={() => onToggleItemExpansion(index)}
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                  >
                    {expandedItems.has(index) ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>
              <div className="text-sm text-gray-600 leading-relaxed">
                {expandedItems.has(index)
                  ? result.originalText
                  : truncateText(result.originalText)}
              </div>
            </div>

            {/* Translation Text */}
            <div className="border-l-4 border-blue-300 pl-3">
              <div className="text-xs text-gray-500 mb-1 font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Translation:</span>
                  {result.isUpdated && result.previousTranslatedText && (() => {
                    const changes = countChanges(result.previousTranslatedText, result.translatedText);
                    return (
                      <div className="flex items-center gap-1">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Updated
                        </span>
                        {changes.additions > 0 && (
                          <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-medium">
                            +{changes.additions}
                          </span>
                        )}
                        {changes.deletions > 0 && (
                          <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-medium">
                            -{changes.deletions}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {(() => {
                  const textToCheck = result.isUpdated && result.previousTranslatedText
                    ? Math.max(result.previousTranslatedText.length, result.translatedText.length) > TRUNCATE_LENGTH
                    : shouldShowExpandButton(result.translatedText);
                  
                  return textToCheck && (
                    <Button
                      onClick={() => onToggleItemExpansion(index)}
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                    >
                      {expandedItems.has(index) ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </Button>
                  );
                })()}
              </div>

              {/* Show translation with diff highlighting if updated, otherwise show regular translation */}
              <div className="text-sm leading-relaxed text-gray-800">
                {result.isUpdated && result.previousTranslatedText ? (
                  // Show diff highlighting for updated translations
                  <DiffText
                    oldText={expandedItems.has(index) 
                      ? result.previousTranslatedText 
                      : truncateText(result.previousTranslatedText)}
                    newText={expandedItems.has(index) 
                      ? result.translatedText 
                      : truncateText(result.translatedText)}
                    truncated={!expandedItems.has(index) && 
                      (result.previousTranslatedText.length > TRUNCATE_LENGTH || 
                       result.translatedText.length > TRUNCATE_LENGTH)}
                  />
                ) : (
                  // Show regular translation for non-updated results
                  <div className="whitespace-pre-wrap font-sans">
                    {expandedItems.has(index)
                      ? result.translatedText
                      : truncateText(result.translatedText)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TranslationResults;
