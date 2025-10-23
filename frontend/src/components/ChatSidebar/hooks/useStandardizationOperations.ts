import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  type ApplyStandardizationParams,
  type ApplyStandardizationStreamEvent,
  performStreamingApplyStandardization,
} from "@/api/apply_standardization";
import {
  type InconsistentTerms,
  performStandardizationAnalysis,
  type StandardizationRequest,
} from "@/api/standardize";
import type { GlossaryItem } from "@/api/glossary";
import { type GlossaryTerm } from "./useGlossaryOperations";
import type {
  TranslationConfig,
  TranslationResult,
} from "./useTranslationOperations";

interface UseStandardizationOperationsProps {
  config: TranslationConfig;
  getCurrentTranslationResults: () => TranslationResult[];
  updateTranslationResults: (
    updater: (prev: TranslationResult[]) => TranslationResult[]
  ) => void;
  glossaryTerms: GlossaryTerm[];
  setError: (error: string | null) => void;
  translationPairs: GlossaryItem[];
}

export const useStandardizationOperations = ({
  config,
  getCurrentTranslationResults,
  updateTranslationResults,
  glossaryTerms,
  translationPairs,
  setError,
}: UseStandardizationOperationsProps) => {
  // Standardization analysis state
  const [inconsistentTerms, setInconsistentTerms] = useState<InconsistentTerms>(
    {}
  );
  const [isAnalyzingStandardization, setIsAnalyzingStandardization] =
    useState(false);
  const [standardizationStatus, setStandardizationStatus] =
    useState<string>("");

  // Apply standardization state
  const [isApplyingStandardization, setIsApplyingStandardization] =
    useState(false);
  const [applyStandardizationStatus, setApplyStandardizationStatus] =
    useState<string>("");
  const applyStandardizationAbortControllerRef = useRef<AbortController | null>(
    null
  );

  // User standardization selections
  const [standardizationSelections, setStandardizationSelections] = useState<
    Record<string, string>
  >({});

  // Track which item is currently being processed during standardization
  const [currentProcessingIndex, setCurrentProcessingIndex] =
    useState<number>(-1);
  const [standardizationProgress, setStandardizationProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
  }>({ current: 0, total: 0, percentage: 0 });
  const [standardizedTranslationResults, setStandardizedTranslationResults] =
    useState<TranslationResult[]>([]);

  const startStandardizationAnalysis = async () => {
    let items: StandardizationRequest["items"];
    if (translationPairs.length > 0) {
      items = translationPairs.map((pair) => ({
        original_text: pair.original_text,
        translated_text: pair.translated_text,
        glossary: glossaryTerms.map((term) => ({
          source_term: term.source_term,
          translated_term: term.translated_term,
        })),
      }));
    } else {
      const translationResults = getCurrentTranslationResults();
      if (translationResults.length === 0) {
        toast.error("No text available for inconsistency analysis.");
        return;
      }
      items = translationResults.map((result) => ({
        original_text: result.originalText,
        translated_text: result.translatedText,
        glossary: glossaryTerms.map((term) => ({
          source_term: term.source_term,
          translated_term: term.translated_term,
        })),
      }));
    }

    if (glossaryTerms.length === 0) {
      return;
    }

    startAnalysis(items);
  };

  const startAnalysis = async (items: StandardizationRequest["items"]) => {
    setIsAnalyzingStandardization(true);
    setStandardizationStatus("Analyzing translation consistency...");
    setInconsistentTerms({});

    try {
      const standardizationParams = { items };

      const result = await performStandardizationAnalysis(
        standardizationParams
      );

      setInconsistentTerms(result.inconsistent_terms);
      // Set default selections for the radio buttons
      const defaultSelections: Record<string, string> = {};
      for (const [term, data] of Object.entries(result.inconsistent_terms)) {
        const suggestions = Array.isArray(data) ? data : data.suggestions || [];
        if (suggestions.length > 0) {
          defaultSelections[term] = suggestions[0];
        }
      }
      setStandardizationSelections(defaultSelections);

      const inconsistentCount = Object.keys(result.inconsistent_terms).length;
      if (inconsistentCount > 0) {
        setStandardizationStatus(
          `Found ${inconsistentCount} inconsistent terms`
        );
      } else {
        setStandardizationStatus("No inconsistencies found");
        toast.success("No inconsistencies found");
      }

      setIsAnalyzingStandardization(false);
    } catch (err) {
      setIsAnalyzingStandardization(false);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setStandardizationStatus(
        `Standardization analysis failed: ${errorMessage}`
      );
      // Show error in UI for debugging
      setError(`Standardization analysis failed: ${errorMessage}`);
    }
  };

  const handleApplyStandardizationStreamEvent = (
    event: ApplyStandardizationStreamEvent
  ) => {
    switch (event.type) {
      case "initialization":
        setApplyStandardizationStatus(
          `Starting standardization for ${event.total_items} items...`
        );
        setStandardizationProgress({
          current: 0,
          total: event.total_items,
          percentage: 0,
        });
        break;

      case "planning":
        setApplyStandardizationStatus(
          `Planning retranslation in ${event.total_batches} batches...`
        );
        break;

      case "retranslation_start":
        setApplyStandardizationStatus(
          `Re-translating item ${event.index + 1}...`
        );
        setCurrentProcessingIndex(event.index);
        break;

      case "retranslation_completed":
        setApplyStandardizationStatus(`Updated item ${event.index + 1}`);

        // Update progress
        setStandardizationProgress((prev) => {
          const current = event.index + 1;
          const percentage = (current / prev.total) * 100;
          return {
            current,
            total: prev.total,
            percentage: Math.round(percentage),
          };
        });

        // Update the specific translation result with the new standardized version
        if (event.updated_item && typeof event.index === "number") {
          updateTranslationResults((prev) => {
            const updatedResults = [...prev];
            if (updatedResults[event.index]) {
              const currentResult = updatedResults[event.index];
              updatedResults[event.index] = {
                ...currentResult,
                previousTranslatedText: currentResult.translatedText, // Store old translation
                translatedText: event.updated_item.translated_text, // Set new translation
                originalText: event.updated_item.original_text,
                isUpdated: true, // Mark as updated for visual indicator
                // Keep the original line numbers when updating
                lineNumbers: currentResult.lineNumbers,
              };
            }
            return updatedResults;
          });
        }
        break;

      case "completion":
        setApplyStandardizationStatus("Standardization application completed!");
        setCurrentProcessingIndex(-1); // Reset processing index
        setStandardizationProgress((prev) => ({ ...prev, percentage: 100 }));
        break;

      case "error":
        console.error("Apply standardization error event:", event);
        setApplyStandardizationStatus(
          `Apply standardization error: ${event.message}`
        );
        setError(`Apply standardization error: ${event.message}`);
        setCurrentProcessingIndex(-1); // Reset processing index
        break;
    }
  };

  const startApplyStandardization = async () => {
    const translationResults = getCurrentTranslationResults();

    if (
      translationResults.length === 0 ||
      Object.keys(inconsistentTerms).length === 0
    ) {
      return;
    }

    setIsApplyingStandardization(true);
    setApplyStandardizationStatus("Preparing standardization application...");

    // Create abort controller for this request
    applyStandardizationAbortControllerRef.current = new AbortController();

    try {
      // Convert translation results to standardization items using current text (edited or original)
      const items = translationResults.map((result) => ({
        original_text: result.originalText,
        translated_text: result.translatedText, // This now includes edited text
        glossary: glossaryTerms.map((term) => ({
          source_term: term.source_term,
          translated_term: term.translated_term,
        })),
      }));

      // Create standardization pairs from user selections
      const standardization_pairs = Object.entries(inconsistentTerms).map(
        ([sourceWord, data]) => {
          const suggestions = Array.isArray(data)
            ? data
            : data.suggestions || [];
          return {
            source_word: sourceWord,
            standardized_translation:
              standardizationSelections[sourceWord] || suggestions[0],
          };
        }
      );

      const params: ApplyStandardizationParams = {
        items,
        standardization_pairs,
        model_name: config.modelName,
        user_rules:
          config.userRules ||
          "Apply standardization consistently while maintaining natural translation flow",
      };

      await performStreamingApplyStandardization(
        params,
        // onEvent
        (event: ApplyStandardizationStreamEvent) => {
          if (!applyStandardizationAbortControllerRef.current?.signal.aborted) {
            handleApplyStandardizationStreamEvent(event);
          }
        },
        // onComplete
        () => {
          setIsApplyingStandardization(false);
          setApplyStandardizationStatus(
            "Standardization application completed!"
          );
        },
        // onError
        (error: Error) => {
          console.error("Apply standardization error:", error);
          setIsApplyingStandardization(false);
          setApplyStandardizationStatus(
            `Apply standardization error: ${error.message}`
          );
          setError(`Apply standardization failed: ${error.message}`);
        },
        applyStandardizationAbortControllerRef.current.signal
      );
    } catch (err) {
      console.error("Apply standardization setup error:", err);
      setIsApplyingStandardization(false);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setApplyStandardizationStatus(
        `Apply standardization setup failed: ${errorMessage}`
      );
      setError(`Apply standardization setup failed: ${errorMessage}`);
    }
  };

  const startStandardizationTranslation = async () => {
    // Reset previous standardized results before starting a new one
    setStandardizedTranslationResults([]);

    // This function will be called when the user clicks "Apply Standardization".
    // It will first apply the standardization and then start a new translation
    // with the standardized text.
    await startApplyStandardization();

    // After standardization is complete, the `retranslation_completed` event
    // handler will have updated the translationResults. Now, we can kick off
    // the new translation.

    // For now, let's just populate the standardized results with the updated
    // translationResults.
    const updatedResults = getCurrentTranslationResults();
    setStandardizedTranslationResults(updatedResults);
  };

  const stopApplyStandardization = () => {
    if (applyStandardizationAbortControllerRef.current) {
      applyStandardizationAbortControllerRef.current.abort();
    }
    setIsApplyingStandardization(false);
    setApplyStandardizationStatus("Standardization stopped");
    setCurrentProcessingIndex(-1); // Reset processing index
  };

  const resetStandardization = () => {
    setInconsistentTerms({});
    setIsAnalyzingStandardization(false);
    setStandardizationStatus("");
    setIsApplyingStandardization(false);
    setApplyStandardizationStatus("");
    setStandardizationSelections({});
    setCurrentProcessingIndex(-1);
    setStandardizationProgress({ current: 0, total: 0, percentage: 0 });
    setStandardizedTranslationResults([]);
  };

  return {
    // State
    inconsistentTerms,
    isAnalyzingStandardization,
    standardizationStatus,
    isApplyingStandardization,
    applyStandardizationStatus,
    standardizationSelections,
    currentProcessingIndex,
    standardizationProgress,
    standardizedTranslationResults,

    // Actions
    startStandardizationAnalysis,
    startApplyStandardization,
    startStandardizationTranslation,
    stopApplyStandardization,
    resetStandardization,
    setStandardizationSelections,
  };
};
