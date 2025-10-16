import type Quill from "quill";
import type { GlossaryItem } from "@/api/glossary";

/**
 * Utility functions for pairing text between main and translation editors
 */

/**
 * Extracts and pairs text content from two editors for glossary extraction
 */
export const extractTextPairs = (
  mainQuill: Quill | null,
  translationQuill: Quill | null
): GlossaryItem[] => {
  if (!mainQuill || !translationQuill) {
    return [];
  }

  const mainText = mainQuill.getText();
  const translationText = translationQuill.getText();

  if (!mainText.trim() || !translationText.trim()) {
    return [];
  }

  // Split by paragraphs (double newlines) or single newlines if no paragraphs
  const mainParagraphs = splitIntoParagraphs(mainText);
  const translationParagraphs = splitIntoParagraphs(translationText);

  // If paragraph counts match, pair them directly
  if (mainParagraphs.length === translationParagraphs.length) {
    return mainParagraphs.map((originalText, index) => ({
      original_text: originalText.trim(),
      translated_text: translationParagraphs[index].trim(),
      metadata: {
        pairing_method: "paragraph",
        pair_index: index,
        timestamp: Date.now(),
      },
    })).filter(item => item.original_text && item.translated_text);
  }

  // If paragraph counts don't match, try sentence-based pairing
  const mainSentences = splitIntoSentences(mainText);
  const translationSentences = splitIntoSentences(translationText);

  if (mainSentences.length === translationSentences.length) {
    return mainSentences.map((originalText, index) => ({
      original_text: originalText.trim(),
      translated_text: translationSentences[index].trim(),
      metadata: {
        pairing_method: "sentence",
        pair_index: index,
        timestamp: Date.now(),
      },
    })).filter(item => item.original_text && item.translated_text);
  }

  // Fallback: treat entire content as single pair
  return [{
    original_text: mainText.trim(),
    translated_text: translationText.trim(),
    metadata: {
      pairing_method: "full_text",
      pair_index: 0,
      timestamp: Date.now(),
    },
  }];
};

/**
 * Split text into paragraphs
 */
const splitIntoParagraphs = (text: string): string[] => {
  // Split by double newlines first, then single newlines if no double newlines found
  const doubleSplit = text.split(/\n\s*\n/);
  if (doubleSplit.length > 1) {
    return doubleSplit.filter(p => p.trim());
  }
  
  // Fallback to single newlines
  return text.split('\n').filter(p => p.trim());
};

/**
 * Split text into sentences
 */
const splitIntoSentences = (text: string): string[] => {
  // Simple sentence splitting - can be improved with more sophisticated logic
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
};

/**
 * Get content summary for display
 */
export const getContentSummary = (
  mainQuill: Quill | null,
  translationQuill: Quill | null
): {
  mainWordCount: number;
  translationWordCount: number;
  pairsCount: number;
  isEmpty: boolean;
} => {
  if (!mainQuill || !translationQuill) {
    return {
      mainWordCount: 0,
      translationWordCount: 0,
      pairsCount: 0,
      isEmpty: true,
    };
  }

  const mainText = mainQuill.getText().trim();
  const translationText = translationQuill.getText().trim();

  if (!mainText || !translationText) {
    return {
      mainWordCount: mainText ? mainText.split(/\s+/).length : 0,
      translationWordCount: translationText ? translationText.split(/\s+/).length : 0,
      pairsCount: 0,
      isEmpty: true,
    };
  }

  const pairs = extractTextPairs(mainQuill, translationQuill);

  return {
    mainWordCount: mainText.split(/\s+/).length,
    translationWordCount: translationText.split(/\s+/).length,
    pairsCount: pairs.length,
    isEmpty: false,
  };
};
