import { useCallback, useRef, useState } from "react";
import type { GlossaryItem } from "@/api/glossary";
import type { TranslationConfig } from ".";
import {
  useCopyOperations,
  useGlossaryOperations,
  useStandardizationOperations,
  useTextSelection,
  useTranslationOperations,
  useTranslationResults,
} from ".";
import { useEditor } from "@/contexts/EditorContext";
import { useTranslationSettings } from "@/hooks/useTranslationSettings";

interface UseTranslationControllerProps {
  documentId: string;
}

export const useTranslationController = ({
  documentId,
}: UseTranslationControllerProps) => {
  const [analysisSourceItems, setAnalysisSourceItems] = useState<
    GlossaryItem[]
  >([]);
  // Manual input state with character limit
  const CHARACTER_LIMIT = 5000; // Set character limit for manual input
  const [manualText, setManualText] = useState<string>("");
  const [inputMode, setInputMode] = useState<"selection" | "manual">(
    "selection"
  );

  // Get translation settings
  const { config, updateConfig, isSidebarCollapsed, setIsSidebarCollapsed } =
    useTranslationSettings();

  // Get editor context
  const {
    quillEditors,
    scrollToLineNumber,
    getQuill,
    getTextByLineNumber,
    activeEditor,
  } = useEditor();

  // Text selection hook
  const {
    selectedText,
    activeSelectedEditor,
    selectedTextLineNumbers,
    clearSelection,
    clearUISelection,
    getTranslatedTextForLine,
  } = useTextSelection();

  // Translation results hook
  const {
    editedTexts,
    editingId,
    editedText,
    expandedItems,
    getCurrentText,
    getCurrentTranslationResults,
    startEditing,
    cancelEditing,
    saveEdit,
    resetToOriginal,
    toggleItemExpansion,
    resetEditingState,
    setEditedText,
  } = useTranslationResults();

  // Copy operations hook
  const {
    copiedItems,
    copyResult,
    copyAllResults,
    appendAllResults,
    overwriteAllResults: overwriteAllResultsInternal,
    insertSingleResult,
    resetCopyFeedback,
  } = useCopyOperations({
    quillEditors,
    documentId,
    scrollToLineNumber,
  });

  // Handle manual text input with character limit
  const handleManualTextChange = useCallback(
    (text: string) => {
      if (text.length <= CHARACTER_LIMIT) {
        setManualText(text);
      }
    },
    [CHARACTER_LIMIT]
  );

  // Get current input text based on mode
  const getCurrentInputText = useCallback(() => {
    return inputMode === "selection" ? selectedText : manualText;
  }, [inputMode, selectedText, manualText]);

  // Get current line numbers (only for selection mode)
  const getCurrentLineNumbers = useCallback(() => {
    return inputMode === "selection" ? selectedTextLineNumbers : null;
  }, [inputMode, selectedTextLineNumbers]);
  // Translation operations hook
  const {
    isTranslating,
    translationResults,
    currentStatus,
    error,
    progressPercent,
    startTranslation: startTranslationInternal,
    stopTranslation,
    resetTranslations: resetTranslationsInternal,
    updateTranslationResults,
    setError,
  } = useTranslationOperations({
    config,
    selectedText: getCurrentInputText(),
    selectedTextLineNumbers: getCurrentLineNumbers(),
    onStreamComplete: (finalResults) => {
      // Clear UI selection but keep line numbers for replace functionality
      if (inputMode === "selection") {
        clearUISelection();
      }

      const items = finalResults.map((r) => ({
        original_text: r.originalText,
        translated_text: r.translatedText,
      }));
      setAnalysisSourceItems(items);

      if (config.extractGlossary && finalResults.length > 0) {
        startGlossaryExtraction();
      }
    },
  });

  // Get current translation results function for hooks
  const getCurrentResults = () =>
    translationResults.length > 0
      ? getCurrentTranslationResults(translationResults)
      : [];
  // Glossary operations hook
  const {
    glossaryTerms,
    glossarySourcePairs,
    isExtractingGlossary,
    startGlossaryExtraction,
    startStandaloneGlossaryExtraction,
    copyGlossaryTerms: copyGlossaryTermsInternal,
    resetGlossary: resetGlossaryInternal,
    glossaryExtractionResults,
    setGlossaryExtractionResults,
  } = useGlossaryOperations({
    config,
    getCurrentTranslationResults: getCurrentResults,
    onGlossaryComplete: () => {
      if (translationResults.length > 0) {
        startStandardizationAnalysis();
      }
    },
    setError,
  });

  // Standardization operations hook
  const {
    inconsistentTerms,
    isAnalyzingStandardization,
    standardizationStatus,
    isApplyingStandardization,
    applyStandardizationStatus,
    standardizationSelections,
    currentProcessingIndex,
    standardizationProgress,
    standardizedTranslationResults,
    startStandardizationAnalysis,
    startApplyStandardization,
    startStandardizationTranslation,
    stopApplyStandardization,
    resetStandardization,
    setStandardizationSelections,
  } = useStandardizationOperations({
    config,
    getCurrentTranslationResults: getCurrentResults,
    updateTranslationResults,
    glossaryTerms,
    translationPairs: analysisSourceItems,
    setError,
  });

  // Refs for scrolling and containers
  const resultAreaRef = useRef<HTMLDivElement>(null);
  const translationListRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Helper function to scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 150); // Slightly increased delay to ensure DOM is updated
  };

  // Enhanced wrapper functions
  const handleConfigChange = <K extends keyof TranslationConfig>(
    key: K,
    value: TranslationConfig[K]
  ) => {
    updateConfig(key, value);
  };

  const startTranslation = async () => {
    const currentText = getCurrentInputText();

    if (!currentText.trim()) {
      setError("Please select text or enter text to translate");
      return;
    }

    // Reset all previous results and states
    resetTranslationsInternal(); // Reset translation list
    resetCopyFeedback();
    resetGlossaryInternal(); // Reset glossary list
    resetStandardization();
    await startTranslationInternal();
  };

  const copyGlossaryTerms = () => {
    const copyId = copyGlossaryTermsInternal();
    return copyId;
  };

  const copyAllResultsWrapper = () => {
    const currentResults = getCurrentResults();
    copyAllResults(currentResults);
  };

  const overwriteAllResults = () => {
    const currentResults = getCurrentResults();
    overwriteAllResultsInternal(currentResults, translationResults);
  };

  const startGlossaryAndInconsistencyAnalysis = async () => {
    await startGlossaryExtraction();
  };

  // Standalone glossary extraction from editors
  const extractGlossaryFromEditors = async (textPairs: GlossaryItem[]) => {
    setAnalysisSourceItems(textPairs);
    setGlossaryExtractionResults([]); // Clear previous results

    await startStandaloneGlossaryExtraction(textPairs);
  };

  const resetTranslations = () => {
    resetTranslationsInternal();
    resetCopyFeedback();
    resetEditingState();
    resetGlossaryInternal();
    resetStandardization();
    setAnalysisSourceItems([]);
  };

  const resetGlossary = () => {
    resetGlossaryInternal();
    resetStandardization();
  };

  const getOriginalTextForLine = useCallback(
    (lineNumber: number): string | null => {
      if (!activeEditor) return null;
      const quill = getQuill(activeEditor);
      return getTextByLineNumber(quill, lineNumber);
    },
    [activeEditor, getQuill, getTextByLineNumber]
  );
  const hasTranslationResults = translationResults.length > 0;
  const hasGlossaryResults = glossaryTerms.length > 0;
  const hasInconsistentTerms = Object.keys(inconsistentTerms).length > 0;
  const hasActiveWorkflow =
    hasTranslationResults || hasGlossaryResults || hasInconsistentTerms;
  const resetActiveWorkflow = () => {
    resetTranslations();
    resetGlossary();
    resetStandardization();
    setAnalysisSourceItems([]);
  };
  return {
    hasActiveWorkflow,
    resetActiveWorkflow: resetActiveWorkflow,
    // Config and UI state
    config,
    handleConfigChange,
    isSidebarCollapsed,
    setIsSidebarCollapsed,

    // Text input (selection + manual)
    selectedText,
    activeSelectedEditor,
    selectedTextLineNumbers,
    manualText,
    inputMode,
    CHARACTER_LIMIT,
    getCurrentInputText,
    getCurrentLineNumbers,
    setManualText: handleManualTextChange,
    setInputMode,
    clearSelection,
    clearUISelection,
    getTranslatedTextForLine,
    getOriginalTextForLine,

    // Translation state
    isTranslating,
    translationResults,
    currentStatus,
    error,
    progressPercent,

    // Translation results management
    editedTexts,
    editingId,
    editedText,
    expandedItems,
    getCurrentText,
    getCurrentTranslationResults: getCurrentResults,

    // Copy operations
    copiedItems,

    // Glossary state
    glossaryTerms,
    glossarySourcePairs,
    isExtractingGlossary,
    glossaryExtractionResults,

    // Standardization state
    inconsistentTerms,
    isAnalyzingStandardization,
    standardizationStatus,
    isApplyingStandardization,
    applyStandardizationStatus,
    standardizationSelections,
    currentProcessingIndex,
    standardizationProgress,
    standardizedTranslationResults,

    // Refs
    resultAreaRef,
    translationListRef,
    scrollContainerRef,

    // Translation actions
    startTranslation,
    stopTranslation,
    resetTranslations,

    // Results editing actions
    startEditing,
    cancelEditing,
    saveEdit,
    resetToOriginal,
    toggleItemExpansion,
    setEditedText,

    // Copy actions
    copyResult,
    copyAllResults: copyAllResultsWrapper,
    appendAllResults: () => appendAllResults(translationResults),
    overwriteAllResults,
    insertSingleResult,

    // Glossary actions
    startGlossaryExtraction,
    copyGlossaryTerms,
    startGlossaryAndInconsistencyAnalysis,
    extractGlossaryFromEditors,
    resetGlossary,

    // Standardization actions
    startStandardizationAnalysis,
    startApplyStandardization,
    startStandardizationTranslation,
    stopApplyStandardization,
    setStandardizationSelections,

    // Utility
    scrollToBottom,
    setError,
  };
};
