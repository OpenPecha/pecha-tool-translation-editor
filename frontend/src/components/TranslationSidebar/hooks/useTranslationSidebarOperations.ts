import { useRef, useEffect } from "react";
import { useEditor } from "@/contexts/EditorContext";
import { useTranslationSettings } from "@/hooks/useTranslationSettings";

import {
	useTranslationOperations,
	TranslationConfig,
} from "./useTranslationOperations";
import { useTranslationResults } from "./useTranslationResults";
import { useTextSelection } from "./useTextSelection";
import { useCopyOperations } from "./useCopyOperations";
import { useGlossaryOperations } from "./useGlossaryOperations";
import { useStandardizationOperations } from "./useStandardizationOperations";

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
	const { quillEditors, scrollToLineNumber } = useEditor();

	// Text selection hook
	const {
		selectedText,
		activeSelectedEditor,
		selectedTextLineNumbers,
		clearSelection,
		clearUISelection,
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
		isExtractingGlossary,
		startGlossaryExtraction,
		copyGlossaryTerms: copyGlossaryTermsInternal,
		resetGlossary,
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
		setError,
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
		value: TranslationConfig[K],
	) => {
		updateConfig(key, value);
	};

	const startTranslation = async () => {
		resetCopyFeedback();
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

	const resetTranslations = () => {
		resetTranslationsInternal();
		resetCopyFeedback();
		resetEditingState();
		resetGlossary();
		resetStandardization();
	};

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
		isExtractingGlossary,

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
