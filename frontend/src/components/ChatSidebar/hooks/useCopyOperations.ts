import { useState } from "react";
import Quill from "quill";
import { TranslationResult } from "./useTranslationOperations";
import {
  overwriteAllTranslations,
  validateTranslationResults,
} from "@/services/editor";
import { useParams } from "react-router-dom";

interface UseCopyOperationsProps {
  quillEditors: Map<string, Quill>;
  documentId: string;
  scrollToLineNumber: (lineNumber: number, targetEditor: Quill) => boolean;
}

export const useCopyOperations = ({
  quillEditors,
  documentId,
  scrollToLineNumber,
}: UseCopyOperationsProps) => {
  const {id} = useParams()
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  // Helper function to show copy feedback
  const showCopyFeedback = (itemId: string) => {
    setCopiedItems((prev) => new Set(prev).add(itemId));
    setTimeout(() => {
      setCopiedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }, 2000);
  };

  const copyResult = (text: string, resultId: string) => {
    navigator.clipboard.writeText(text);
    showCopyFeedback(resultId);
  };

  const copyAllResults = (currentResults: TranslationResult[]) => {
    const allTranslations = currentResults
      .map((result) => result.translatedText)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(allTranslations);
    showCopyFeedback("copy-all");
  };

  const appendAllResults = (translationResults: TranslationResult[]) => {
    const allTranslations = translationResults
      .map((result) => result.translatedText)
      .join("\n\n");
    const targetEditor = quillEditors.get(documentId);
    if (targetEditor) {
      // Get the current content and check if it has meaningful content
      const currentText = targetEditor.getText();
      const trimmedText = currentText.trim();
      const hasContent = trimmedText.length > 0;

      if (hasContent) {
        // If there's existing content, append with proper spacing
        const contentToInsert = currentText + allTranslations;
        targetEditor.setText(contentToInsert, "user");
      } else {
        // If editor is empty (or only whitespace), replace entirely
        targetEditor.setText(allTranslations, "user");
      }

      // Focus the editor and position cursor at the end
      targetEditor.focus();
      const finalLength = targetEditor.getLength();
      targetEditor.setSelection(finalLength - 1, 0);
    } else {
      // Fallback: copy to clipboard if no editor found
      navigator.clipboard.writeText(allTranslations);
      showCopyFeedback("append-fallback");
      alert(
        "No editor found for this document. Text copied to clipboard instead."
      );
    }
  };

  // Helper function to highlight line with retry mechanism for newly created line numbers
  const highlightLineWithRetry = (
    lineNumber: number,
    targetEditor: Quill,
    maxRetries: number = 5
  ) => {
    const attemptHighlight = (attempt: number) => {
      // Target the specific translation editor where the content was inserted
      const success = scrollToLineNumber(lineNumber, targetEditor);

      if (!success && attempt < maxRetries) {
        // If highlighting failed and we have retries left, try again after a delay
        const delay = Math.min(100 * Math.pow(1.5, attempt), 500); // Exponential backoff, max 500ms

        setTimeout(() => {
          attemptHighlight(attempt + 1);
        }, delay);
      } else if (!success) {
        console.warn(
          `❌ Failed to highlight line ${lineNumber} in translation editor after ${maxRetries} attempts`
        );
      }
    };

    // Use requestAnimationFrame to ensure DOM has been painted after the overwrite
    requestAnimationFrame(() => {
      attemptHighlight(0);
    });
  };

  const overwriteAllResults = (
    currentResults: TranslationResult[],
    translationResults: TranslationResult[]
  ) => {
    const targetEditor = quillEditors.get(documentId);
    const sourceEditor = quillEditors.get(id??"");
    if (!sourceEditor) {
      alert("No source editor found for this document. Please try again after running translation on selected lines.");
      return;
    }

    if (!targetEditor) {
      // Fallback: copy to clipboard if no editor found
      const allTranslations = currentResults
        .map((result) => result.translatedText)
        .join("\n\n");
      navigator.clipboard.writeText(allTranslations);
      showCopyFeedback("overwrite-feedback");
      alert(
        "No editor found for this document. Text copied to clipboard instead."
      );
      return;
    }

    // Validate translation results have line number mappings
    if (!validateTranslationResults(translationResults)) {
      showCopyFeedback("overwrite-feedback");
      alert(
        "Cannot overwrite: No line number mapping found for translation results. Please try again after running translation on selected lines."
      );
      return;
    }

    // Use the utility function to perform the overwrite with emoji placeholders by default
    const result = overwriteAllTranslations(sourceEditor, targetEditor, currentResults, {
      placeholderType: "emoji",
    });

    if (result.success) {
      // Show success feedback
      showCopyFeedback("overwrite-feedback");

      // Wait for the overwrite operation to complete and DOM to update
      // before highlighting the first line that was overwritten
      const firstResult = translationResults.find(
        (result) =>
          result.lineNumbers && Object.keys(result.lineNumbers).length > 0
      );
      if (firstResult && firstResult.lineNumbers) {
        const lineRanges = Object.entries(firstResult.lineNumbers);
        if (lineRanges.length > 0) {
          const [lineKey] = lineRanges[0];
          const lineNumber = parseInt(lineKey);

          // Use robust highlighting with retry mechanism for newly created line numbers
          // Target the specific translation editor where the content was inserted
          highlightLineWithRetry(lineNumber, targetEditor);
        }
      }
    } else {
      // Show error
      alert(result.message);
    }
  };

  const insertSingleResult = (resultToInsert: TranslationResult) => {
    const targetEditor = quillEditors.get(documentId);
    if (!targetEditor) {
      // Fallback: copy to clipboard if no editor found
      navigator.clipboard.writeText(resultToInsert.translatedText);
      showCopyFeedback("insert-fallback");
      alert(
        "No editor found for this document. Text copied to clipboard instead."
      );
      return;
    }

    // Validate that this specific result has line number mappings
    if (
      !resultToInsert.lineNumbers ||
      Object.keys(resultToInsert.lineNumbers).length === 0
    ) {
      alert(
        "Cannot insert: No line number mapping found for this translation result. Please try again after running translation on selected lines."
      );
      return;
    }

    // Use the utility function to perform the overwrite for a single result
    const result = overwriteAllTranslations(sourceEditor, targetEditor, [resultToInsert], {
      placeholderType: "emoji",
    });

    if (result.success) {
      // Get the line number for highlighting
      const lineRanges = Object.entries(resultToInsert.lineNumbers || {});
      if (lineRanges.length > 0) {
        const [lineKey] = lineRanges[0];
        const lineNumber = parseInt(lineKey);

        // Use robust highlighting with retry mechanism for newly created line numbers
        // Target the specific translation editor where the content was inserted
        highlightLineWithRetry(lineNumber, targetEditor);
      }
    } else {
      // Show error
      alert(result.message);
    }
  };

  const resetCopyFeedback = () => {
    setCopiedItems(new Set());
  };

  return {
    copiedItems,
    copyResult,
    copyAllResults,
    appendAllResults,
    overwriteAllResults,
    insertSingleResult,
    resetCopyFeedback,
  };
};
