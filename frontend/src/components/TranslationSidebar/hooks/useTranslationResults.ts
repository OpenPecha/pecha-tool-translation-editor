import { useState } from "react";
import { TranslationResult } from "./useTranslationOperations";

export const useTranslationResults = () => {
  // State to track edited translations
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>("");
  const [expandedItems, setExpandedItems] = useState(new Set<number>());

  // Helper function to get current text (edited or original) for a translation result
  const getCurrentText = (result: TranslationResult): string => {
    return editedTexts[result.id] || result.translatedText;
  };

  // Helper function to get all current translation results with edited text applied
  const getCurrentTranslationResults = (translationResults: TranslationResult[]): TranslationResult[] => {
    return translationResults.map(result => ({
      ...result,
      translatedText: getCurrentText(result)
    }));
  };

  // Editing handler functions
  const startEditing = (result: TranslationResult) => {
    setEditingId(result.id);
    // Use existing edited text if available, otherwise use original
    const textToEdit = editedTexts[result.id] || result.translatedText;
    setEditedText(textToEdit);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedText("");
  };

  const saveEdit = () => {
    if (editingId) {
      // Save the edited text persistently
      setEditedTexts(prev => ({
        ...prev,
        [editingId]: editedText
      }));
    }
    setEditingId(null);
    setEditedText("");
  };

  const resetToOriginal = (result: TranslationResult) => {
    // Remove any edited text for this result
    setEditedTexts(prev => {
      const newTexts = { ...prev };
      delete newTexts[result.id];
      return newTexts;
    });
    // If currently editing this result, reset the edit text too
    if (editingId === result.id) {
      setEditedText(result.translatedText);
    }
  };

  const toggleItemExpansion = (index: number) => {
    const newExpandedItems = new Set(expandedItems);
    if (newExpandedItems.has(index)) {
      newExpandedItems.delete(index);
    } else {
      newExpandedItems.add(index);
    }
    setExpandedItems(newExpandedItems);
  };

  const resetEditingState = () => {
    setEditedTexts({});
    setEditingId(null);
    setEditedText("");
    setExpandedItems(new Set());
  };

  return {
    // State
    editedTexts,
    editingId,
    editedText,
    expandedItems,

    // Helper functions
    getCurrentText,
    getCurrentTranslationResults,

    // Actions
    startEditing,
    cancelEditing,
    saveEdit,
    resetToOriginal,
    toggleItemExpansion,
    resetEditingState,
    setEditedText,
  };
};
