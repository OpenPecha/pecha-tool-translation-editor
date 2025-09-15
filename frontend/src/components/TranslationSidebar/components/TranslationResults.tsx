import React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronDown, ChevronUp, Save, X, RotateCcw } from "lucide-react";
import { TbReplaceFilled } from "react-icons/tb";
import DiffText from "./DiffText";
import { useEditor } from "@/contexts/EditorContext";
import { diffWords } from "diff";
import { useTranslate } from "@tolgee/react";

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
  editedTexts: Record<string, string>;
  editingId: string | null;
  editedText: string;
  onCopyResult: (text: string, resultId: string) => void;
  onToggleItemExpansion: (index: number) => void;
  onInsertResult: (result: TranslationResult) => void;
  onStartEditing: (result: TranslationResult) => void;
  onCancelEditing: () => void;
  onSaveEdit: () => void;
  onEditTextChange: (text: string) => void;
  onResetToOriginal: (result: TranslationResult) => void;
}

const TRUNCATE_LENGTH = 150;

const TranslationResults: React.FC<TranslationResultsProps> = ({
  translationResults,
  copiedItems,
  expandedItems,
  editedTexts,
  editingId,
  editedText,
  onCopyResult,
  onToggleItemExpansion,
  onInsertResult,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
  onEditTextChange,
  onResetToOriginal,
}) => {

  const { scrollToLineNumber } = useEditor();
  const { t } = useTranslate();
  // Get the current text to use (edited or original)
  const getCurrentText = (result: TranslationResult): string => {
    // If currently editing this result, use the current edit text
    if (editingId === result.id) {
      return editedText;
    }
    // Otherwise, use saved edited text if available, or original text
    return editedTexts[result.id] || result.translatedText;
  };

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
    return `${t("translation.line")} ${lineNumber}(${range.from}-${range.to})`;
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
        <div key={result.id} className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-800 dark:text-neutral-100">
              {new Date(result.timestamp).toLocaleTimeString()}
            </span>
            <div className="flex items-center gap-2">
              {/* Line Numbers Display */}
              {formatLineNumbers(result) && (
                <span 
                  className="text-xs text-neutral-800 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded cursor-pointer hover:bg-gray-200 hover:text-secondary-600 transition-colors"
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
                onClick={() => onInsertResult({...result, translatedText: getCurrentText(result)})}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-secondary-200 transition-colors"
                title="Insert translation at line position"
                disabled={!result.lineNumbers || Object.keys(result.lineNumbers).length === 0}
              >
                <TbReplaceFilled className="w-3 h-3 " />
              </Button>
              <Button
                onClick={() => onCopyResult(getCurrentText(result), result.id)}
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

              {editedTexts[result.id] && (
                                  <Button
                    onClick={() => onResetToOriginal(result)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-200 transition-colors"
                    title="Reset to original translation"
                    disabled={editingId !== null && editingId !== result.id}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {/* Source Text */}
            <div className="border-l-4 border-gray-300 pl-3">
              <div className="text-xs text-neutral-700 dark:text-neutral-100 mb-1 font-medium flex items-center justify-between">
                <span className="text-neutral-800 dark:text-neutral-300">{t("translation.source")}</span>
                {shouldShowExpandButton(result.originalText) && (
                  <Button
                    onClick={() => onToggleItemExpansion(index)}
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-neutral-800 dark:text-neutral-100 hover:text-gray-600"
                  >
                    {expandedItems.has(index) ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>
              <div className="text-sm text-neutral-800 dark:text-neutral-100 leading-relaxed">
                {expandedItems.has(index)
                  ? result.originalText
                  : truncateText(result.originalText)}
              </div>
            </div>

            {/* Translation Text */}
            <div className="border-l-4 border-secondary-300 pl-3">
              <div className="text-xs text-neutral-700 dark:text-neutral-100 mb-1 font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-800 dark:text-neutral-300">{t("translation.translation")}:</span>
                  {editedTexts[result.id] && (() => {
                    const changes = countChanges(result.translatedText, editedTexts[result.id]);
                    return (
                      <div className="flex items-center gap-1">
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                          {t("translation.edited")}
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
                  {result.isUpdated && result.previousTranslatedText && (() => {
                    const changes = countChanges(result.previousTranslatedText, result.translatedText);
                    return (
                      <div className="flex items-center gap-1">
                        <span className="text-xs bg-secondary-100 text-secondary-700 px-2 py-0.5 rounded-full">
                          {t("translation.updated")}
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
                    ? Math.max(result.previousTranslatedText.length, getCurrentText(result).length) > TRUNCATE_LENGTH
                    : shouldShowExpandButton(getCurrentText(result));
                  
                  return textToCheck && (
                    <Button
                      onClick={() => onToggleItemExpansion(index)}
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-neutral-800 dark:text-neutral-100 hover:text-gray-600"
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

              {/* Show translation with diff highlighting if updated, otherwise show regular translation or edit mode */}
              <div className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-100">
                {editingId === result.id ? (
                  // Edit mode: Show textarea with save/cancel buttons
                  <div className="space-y-2">
                    <textarea
                      value={editedText}
                      onChange={(e) => onEditTextChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-sm resize-vertical min-h-[80px] font-sans"
                      placeholder={t("translation.editTranslation")}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={onSaveEdit}
                        variant="default"
                        size="sm"
                        className="h-6 text-xs bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {t("common.save")}
                      </Button>
                      <Button
                        onClick={onCancelEditing}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </div>
                ) : editedTexts[result.id] ? (
                  // Show diff highlighting for manually edited translations - clickable
                  <div 
                    onClick={() => {
                      if (editingId === null || editingId === result.id) {
                        onStartEditing(result);
                      }
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && (editingId === null || editingId === result.id)) {
                        e.preventDefault();
                        onStartEditing(result);
                      }
                    }}
                    role="button"
                    tabIndex={editingId === null || editingId === result.id ? 0 : -1}
                    className={`rounded p-1 -m-1 transition-colors ${
                      editingId === null || editingId === result.id 
                        ? 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800' 
                        : 'cursor-not-allowed opacity-50'
                    }`}
                    title={
                      editingId === null || editingId === result.id 
                        ? t("translation.clickToEditTranslation") 
                        : t("translation.anotherTranslationIsBeingEdited")
                    }
                  >
                    <DiffText
                      oldText={expandedItems.has(index) 
                        ? result.translatedText 
                        : truncateText(result.translatedText)}
                      newText={expandedItems.has(index) 
                        ? editedTexts[result.id] 
                        : truncateText(editedTexts[result.id])}
                      truncated={!expandedItems.has(index) && 
                        (result.translatedText.length > TRUNCATE_LENGTH || 
                         editedTexts[result.id].length > TRUNCATE_LENGTH)}
                    />
                  </div>
                ) : result.isUpdated && result.previousTranslatedText ? (
                  // Show diff highlighting for updated translations - clickable
                  <div 
                    onClick={() => {
                      if (editingId === null || editingId === result.id) {
                        onStartEditing(result);
                      }
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && (editingId === null || editingId === result.id)) {
                        e.preventDefault();
                        onStartEditing(result);
                      }
                    }}
                    role="button"
                    tabIndex={editingId === null || editingId === result.id ? 0 : -1}
                    className={`rounded p-1 -m-1 transition-colors ${
                      editingId === null || editingId === result.id 
                        ? 'cursor-pointer hover:bg-gray-50' 
                        : 'cursor-not-allowed opacity-50'
                    }`}
                    title={
                      editingId === null || editingId === result.id 
                        ? t("translation.clickToEditTranslation") 
                        : t("translation.anotherTranslationIsBeingEdited")
                    }
                  >
                    <DiffText
                      oldText={expandedItems.has(index) 
                        ? result.previousTranslatedText 
                        : truncateText(result.previousTranslatedText)}
                      newText={expandedItems.has(index) 
                        ? getCurrentText(result) 
                        : truncateText(getCurrentText(result))}
                      truncated={!expandedItems.has(index) && 
                        (result.previousTranslatedText.length > TRUNCATE_LENGTH || 
                         getCurrentText(result).length > TRUNCATE_LENGTH)}
                    />
                  </div>
                ) : (
                  // Show regular translation for non-updated results - clickable
                  <div 
                    onClick={() => {
                      if (editingId === null || editingId === result.id) {
                        onStartEditing(result);
                      }
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && (editingId === null || editingId === result.id)) {
                        e.preventDefault();
                        onStartEditing(result);
                      }
                    }}
                    role="button"
                    tabIndex={editingId === null || editingId === result.id ? 0 : -1}
                    className={`whitespace-pre-wrap font-sans rounded p-1 -m-1 transition-colors ${
                      editingId === null || editingId === result.id 
                        ? 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800' 
                        : 'cursor-not-allowed opacity-50'
                    }`}
                    title={
                      editingId === null || editingId === result.id 
                        ? t("translation.clickToEditTranslation") 
                        : t("translation.anotherTranslationIsBeingEdited")
                    }
                  >
                    {expandedItems.has(index)
                      ? getCurrentText(result)
                      : truncateText(getCurrentText(result))}
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
