import { useCallback, useEffect, useRef } from "react";
import type { GlossaryItem } from "@/api/glossary";
import type { TranslationConfig } from "@/components/TranslationSidebar/hooks";
import {
  useCopyOperations,
  useGlossaryOperations,
  useStandardizationOperations,
  useTextSelection,
  useTranslationOperations,
  useTranslationResults,
} from "@/components/TranslationSidebar/hooks";
import { useEditor } from "@/contexts/EditorContext";
import { useTranslationSettings } from "@/hooks/useTranslationSettings";

interface UseTranslationSidebarOperationsProps {
  documentId: string;
}

export const useTranslationSidebarOperations = ({
  documentId,
}: UseTranslationSidebarOperationsProps) => {
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
    selectedText,
    selectedTextLineNumbers,
    onStreamComplete: () => {
      // Clear UI selection but keep line numbers for replace functionality
      clearUISelection();

      if (config.extractGlossary && translationResults.length > 0) {
        startGlossaryExtraction();
      }
    },
  });

  // Get current translation results function for hooks
  const getCurrentResults = () =>
    getCurrentTranslationResults(translationResults);

  // Glossary operations hook
  const {
    glossaryTerms,
    glossarySourcePairs,
    isExtractingGlossary,
    startGlossaryExtraction,
    startStandaloneGlossaryExtraction,
    copyGlossaryTerms: copyGlossaryTermsInternal,
    resetGlossary,
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
    startStandardizationAnalysis,
    startApplyStandardization,
    stopApplyStandardization,
    resetStandardization,
    setStandardizationSelections,
  } = useStandardizationOperations({
    config,
    getCurrentTranslationResults: getCurrentResults,
    updateTranslationResults,
    glossaryTerms,
    glossarySourcePairs,
    setError,
    glossaryExtractionResults,
  });

  // Refs for scrolling and containers
  const resultAreaRef = useRef<HTMLDivElement>(null);
  const translationListRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of results
  useEffect(() => {
    if (resultAreaRef.current && translationResults.length > 0) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        const container = resultAreaRef.current?.parentElement;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 50);
    }
  }, [translationResults]);

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
    resetCopyFeedback();
    resetGlossary();
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
    setGlossaryExtractionResults([]); // Clear previous results
    await startStandaloneGlossaryExtraction(textPairs);
  };

  const resetTranslations = () => {
    resetTranslationsInternal();
    resetCopyFeedback();
    resetEditingState();
    resetGlossary();
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

  return {
    // Config and UI state
    config,
    handleConfigChange,
    isSidebarCollapsed,
    setIsSidebarCollapsed,

    // Text selection
    selectedText,
    activeSelectedEditor,
    selectedTextLineNumbers,
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
    stopApplyStandardization,
    setStandardizationSelections,

    // Utility
    scrollToBottom,
    setError,
  };
};
