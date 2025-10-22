import { useTranslate } from "@tolgee/react";
import { diffWords } from "diff";
import { Save, X } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/contexts/EditorContext";
import { useTranslation } from "../../contexts/TranslationContext";
import ActionMenu from "./ActionMenu";
import DiffText from "./DiffText";

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

const TRUNCATE_LENGTH = 150;

const TranslationResults: React.FC = () => {
  const {
    translationResults,
    copiedItems,
    expandedItems,
    editedTexts,
    editingId,
    editedText,
    copyResult: onCopyResult,
    toggleItemExpansion: onToggleItemExpansion,
    insertSingleResult: onInsertResult,
    startEditing: onStartEditing,
    cancelEditing: onCancelEditing,
    saveEdit: onSaveEdit,
    setEditedText: onEditTextChange,
    resetToOriginal: onResetToOriginal,
  } = useTranslation();

  const { scrollToLineNumber } = useEditor();
  const { t } = useTranslate();
  // Get the current text to use (edited or original)
  const getCurrentText = (result: TranslationResult): string => {
    // If currently editing this result, use the current edit text
    if (editingId === result.id) {
      return editedText;
    }
    const result_text = editedTexts[result.id] || result.translatedText;
    // Otherwise, use saved edited text if available, or original text
    return result_text;
  };

  const truncateText = (
    text: string,
    maxLength: number = TRUNCATE_LENGTH
  ): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const formatLineNumbers = (result: TranslationResult): string => {
    if (!result.lineNumbers) return "";

    const lineRanges = Object.entries(result.lineNumbers);
    if (lineRanges.length === 0) return "";

    // Use the first line range from this specific result
    const [lineKey, range] = lineRanges[0];
    const lineNumber = Number.parseInt(lineKey, 10);
    return `${t("translation.line")} ${lineNumber}(${range.from}-${range.to})`;
  };

  const countChanges = (
    oldText: string,
    newText: string
  ): { additions: number; deletions: number } => {
    const differences = diffWords(oldText, newText);
    let additions = 0;
    let deletions = 0;

    for (const part of differences) {
      if (part.added) {
        additions++;
      } else if (part.removed) {
        deletions++;
      }
    }

    return { additions, deletions };
  };

  return (
    <div className="space-y-4">
      {translationResults.map((result, index) => (
        <div
          key={result.id}
          className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-800 dark:text-neutral-100">
                {new Date(result.timestamp).toLocaleTimeString()}
              </span>
              {/* Line Numbers Display */}
              {formatLineNumbers(result) && (
                <button
                  type="button"
                  className="text-xs text-neutral-800 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded cursor-pointer hover:bg-gray-200 hover:text-secondary-600 transition-colors"
                  onClick={() => {
                    if (!result.lineNumbers) return;
                    const lineRanges = Object.entries(result.lineNumbers);
                    if (lineRanges.length > 0) {
                      const [lineKey] = lineRanges[0];
                      const lineNumber = Number.parseInt(lineKey, 10);
                      scrollToLineNumber(lineNumber);
                    }
                  }}
                  title="Click to scroll to this line in the editor"
                >
                  {formatLineNumbers(result)}
                </button>
              )}
            </div>

            <ActionMenu
              result={result}
              currentText={getCurrentText(result)}
              isCopied={copiedItems.has(result.id)}
              isEdited={!!editedTexts[result.id]}
              isExpanded={expandedItems.has(index)}
              canInsert={
                !!(
                  result.lineNumbers &&
                  Object.keys(result.lineNumbers).length > 0
                )
              }
              onCopy={() => onCopyResult(getCurrentText(result), result.id)}
              onInsert={() =>
                onInsertResult({
                  ...result,
                  translatedText: getCurrentText(result),
                })
              }
              onEdit={() => onStartEditing(result)}
              onReset={() => onResetToOriginal(result)}
              onToggleExpand={() => onToggleItemExpansion(index)}
              disabled={editingId !== null && editingId !== result.id}
            />
          </div>
          <div className="space-y-2">
            {/* Source Text */}
            <div className="border-l-4 border-gray-300 pl-3">
              <div className="text-xs text-neutral-700 dark:text-neutral-100 mb-1 font-medium">
                <span className="text-neutral-800 dark:text-neutral-300">
                  {t("translation.source")}
                </span>
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
                  <span className="text-neutral-800 dark:text-neutral-300">
                    {t("translation.translation")}:
                  </span>
                  {editedTexts[result.id] &&
                    (() => {
                      const changes = countChanges(
                        result.translatedText,
                        editedTexts[result.id]
                      );
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
                  {result.isUpdated &&
                    result.previousTranslatedText &&
                    (() => {
                      const changes = countChanges(
                        result.previousTranslatedText,
                        result.translatedText
                      );
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
                      if (
                        (e.key === "Enter" || e.key === " ") &&
                        (editingId === null || editingId === result.id)
                      ) {
                        e.preventDefault();
                        onStartEditing(result);
                      }
                    }}
                    role="button"
                    tabIndex={
                      editingId === null || editingId === result.id ? 0 : -1
                    }
                    className={`rounded p-1 -m-1 transition-colors ${
                      editingId === null || editingId === result.id
                        ? "cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        : "cursor-not-allowed opacity-50"
                    }`}
                    title={
                      editingId === null || editingId === result.id
                        ? t("translation.clickToEditTranslation")
                        : t("translation.anotherTranslationIsBeingEdited")
                    }
                  >
                    <DiffText
                      oldText={
                        expandedItems.has(index)
                          ? result.translatedText
                          : truncateText(result.translatedText)
                      }
                      newText={
                        expandedItems.has(index)
                          ? editedTexts[result.id]
                          : truncateText(editedTexts[result.id])
                      }
                      truncated={
                        !expandedItems.has(index) &&
                        (result.translatedText.length > TRUNCATE_LENGTH ||
                          editedTexts[result.id].length > TRUNCATE_LENGTH)
                      }
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
                      if (
                        (e.key === "Enter" || e.key === " ") &&
                        (editingId === null || editingId === result.id)
                      ) {
                        e.preventDefault();
                        onStartEditing(result);
                      }
                    }}
                    role="button"
                    tabIndex={
                      editingId === null || editingId === result.id ? 0 : -1
                    }
                    className={`rounded p-1 -m-1 transition-colors ${
                      editingId === null || editingId === result.id
                        ? "cursor-pointer hover:bg-gray-50"
                        : "cursor-not-allowed opacity-50"
                    }`}
                    title={
                      editingId === null || editingId === result.id
                        ? t("translation.clickToEditTranslation")
                        : t("translation.anotherTranslationIsBeingEdited")
                    }
                  >
                    <DiffText
                      oldText={
                        expandedItems.has(index)
                          ? result.previousTranslatedText
                          : truncateText(result.previousTranslatedText)
                      }
                      newText={
                        expandedItems.has(index)
                          ? getCurrentText(result)
                          : truncateText(getCurrentText(result))
                      }
                      truncated={
                        !expandedItems.has(index) &&
                        (result.previousTranslatedText.length >
                          TRUNCATE_LENGTH ||
                          getCurrentText(result).length > TRUNCATE_LENGTH)
                      }
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
                      if (
                        (e.key === "Enter" || e.key === " ") &&
                        (editingId === null || editingId === result.id)
                      ) {
                        e.preventDefault();
                        onStartEditing(result);
                      }
                    }}
                    role="button"
                    tabIndex={
                      editingId === null || editingId === result.id ? 0 : -1
                    }
                    className={`whitespace-pre-wrap font-sans rounded p-1 -m-1 transition-colors ${
                      editingId === null || editingId === result.id
                        ? "cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        : "cursor-not-allowed opacity-50"
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
