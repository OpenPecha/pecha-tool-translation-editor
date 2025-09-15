import { useState, useRef } from "react";
import {
  TargetLanguage,
  TextType,
  ModelName,
  performStreamingTranslation,
  TranslationStreamEvent,
} from "@/api/translate";
import { useTranslate } from "@tolgee/react";

export interface TranslationConfig {
  targetLanguage: TargetLanguage;
  textType: TextType;
  modelName: ModelName;
  batchSize: number;
  userRules: string;
  extractGlossary: boolean;
}

export interface TranslationResult {
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

interface UseTranslationOperationsProps {
  config: TranslationConfig;
  selectedText: string;
  selectedTextLineNumbers: Record<string, { from: number; to: number }> | null;
  onStreamComplete?: () => void;
}

export const useTranslationOperations = ({
  config,
  selectedText,
  selectedTextLineNumbers,
  onStreamComplete,
}: UseTranslationOperationsProps) => {
  // Translation state
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResults, setTranslationResults] = useState<TranslationResult[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSegmentIndexRef = useRef<number>(0);
  const { t } = useTranslate();
  // Helper functions
  const updateProgress = (percent: number | null, text: string) => {
    if (percent !== null) {
      setProgressPercent(percent);
    }
    setCurrentStatus(text);
  };

  const addPartialResult = (textNumber: number, translationPreview: string) => {
    // Could be used for showing partial translations as they come in
    console.log(`Partial result for text ${textNumber}:`, translationPreview);
  };

  const onStreamError = (error: string) => {
    console.error("Stream error:", error);
    setError(error);
    setIsTranslating(false);
    setCurrentStatus("Error");
  };

  // Helper function to create segment-specific line number mappings
  const createSegmentLineMapping = (
    selectedText: string,
    capturedLineNumbers: Record<string, { from: number; to: number }> | null
  ): Array<Record<string, { from: number; to: number }> | null> => {
    if (!capturedLineNumbers) return [];

    const textLines = selectedText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const lineNumberEntries = Object.entries(capturedLineNumbers);
    const segmentMappings: Array<Record<string, { from: number; to: number }> | null> = [];

    // Map each text segment to its corresponding line number
    for (let i = 0; i < textLines.length; i++) {
      if (i < lineNumberEntries.length) {
        // Create a mapping for this specific segment with its corresponding line
        const [lineKey, range] = lineNumberEntries[i];
        segmentMappings.push({
          [lineKey]: range,
        });
      } else {
        // If we have more segments than line mappings, use null
        segmentMappings.push(null);
      }
    }

    return segmentMappings;
  };

  const handleStreamEvent = (
    event: TranslationStreamEvent,
    segmentLineMappings?: Array<Record<string, { from: number; to: number }> | null>
  ) => {
    switch (event.type) {
      case "initialization":
        updateProgress(
          0,
          `Starting translation of ${event.total_texts} line${
            event.total_texts === 1 ? "" : "s"
          }...`
        );
        break;

      case "planning":
        updateProgress(5, `Created ${event.total_batches} batches`);
        break;

      case "batch_start":
        updateProgress(
          event.progress_percent || 0,
          `Processing batch ${event.batch_number}...`
        );
        break;

      case "translation_start":
        updateProgress(null, "Translating...");
        break;

      case "text_completed":
        updateProgress(
          event.progress_percent || 0,
          `Completed ${event.text_number}/${event.total_texts} lines`
        );

        // Add partial result if we have translation preview
        if (event.translation_preview) {
          addPartialResult(event.text_number, event.translation_preview);
        }
        break;

      case "batch_completed":
        updateProgress(
          event.cumulative_progress || 0,
          `Batch ${event.batch_number} completed in ${event.processing_time}s`
        );

        // Display batch results immediately
        if (event.batch_results && event.batch_results.length > 0) {
          console.log("Adding batch results:", event.batch_results);

          const newResults = event.batch_results.map((result, batchIndex) => {
            // Get the segment-specific line numbers using the current segment index
            const segmentIndex = currentSegmentIndexRef.current + batchIndex;
            const segmentLineNumbers = segmentLineMappings?.[segmentIndex] || null;

            return {
              id: `${event.batch_id}-${batchIndex}-${Date.now()}`,
              originalText: result.original_text || "",
              translatedText: result.translated_text || "",
              timestamp: event.timestamp,
              metadata: {
                batch_id: event.batch_id,
                ...result.metadata,
              },
              lineNumbers: segmentLineNumbers, // Store the segment-specific line numbers
            };
          });

          // Update the segment index counter for the next batch
          currentSegmentIndexRef.current += event.batch_results.length;

          setTranslationResults((prev) => {
            const updatedResults = [...prev, ...newResults];
            return updatedResults;
          });
        }
        break;

      case "completion":
        console.log("Completion event - all batches done"); // Debug
        updateProgress(100, "Translation completed!");

        setTimeout(() => {
          setIsTranslating(false);
          setCurrentStatus("Complete");
          onStreamComplete?.();
        }, 1000); // Delay completion
        break;

      case "error":
        console.error("Stream error:", event.error);
        onStreamError(event.error);
        break;

      default:
        console.log("Unknown event type:", event.type);
    }
  };

  const startTranslation = async () => {
    if (!selectedText.trim()) {
      setError("Please select text to translate");
      return;
    }
    resetTranslations();

    // Reset segment index counter
    currentSegmentIndexRef.current = 0;

    // Capture current line numbers before translation starts
    const capturedLineNumbers = selectedTextLineNumbers;

    setIsTranslating(true);
    setCurrentStatus(t("translation.initializing"));
    setProgressPercent(0);
    setError(null);

    // Create abort controller for this translation
    abortControllerRef.current = new AbortController();

    try {
      // Split selected text by newlines and filter out empty lines
      const textLines = selectedText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // Create segment-specific line number mappings
      const segmentLineMappings = createSegmentLineMapping(selectedText, capturedLineNumbers);

      // Validate that we have text to translate
      if (textLines.length === 0) {
        setError("No valid text lines found to translate");
        setIsTranslating(false);
        return;
      }

      const translationParams = {
        texts: textLines,
        target_language: config.targetLanguage,
        text_type: config.textType,
        model_name: config.modelName,
        batch_size: config.batchSize,
        user_rules: config.userRules,
      };

      await performStreamingTranslation(
        translationParams,
        // onEvent - handle structured events
        (event: TranslationStreamEvent) => {
          if (!abortControllerRef.current?.signal.aborted) {
            handleStreamEvent(event, segmentLineMappings);
          }
        },
        // onComplete
        () => {
          setIsTranslating(false);
          setCurrentStatus("Complete");
        },
        // onError
        (error: Error) => {
          console.error("Translation error:", error);
          let errorMessage = error.message;

          // Handle specific error cases
          if (errorMessage.includes("503") || errorMessage.includes("service unavailable")) {
            errorMessage =
              "Translation service is currently unavailable. Please try again later.";
          } else if (errorMessage.includes("504") || errorMessage.includes("timed out")) {
            errorMessage =
              "Translation request timed out. The service may be experiencing high load.";
          } else if (errorMessage.includes("Authentication")) {
            errorMessage = "Authentication failed. Please refresh the page and try again.";
          }

          setError(errorMessage);
          setIsTranslating(false);
          setCurrentStatus("Error");
        },
        // Pass the abort controller
        abortControllerRef.current
      );
    } catch (err) {
      // Don't show error for aborted requests
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setError(err instanceof Error ? err.message : "Translation failed");
      setIsTranslating(false);
      setCurrentStatus("Failed");
    }
  };

  const stopTranslation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsTranslating(false);
    setCurrentStatus("Stopped");
  };

  const resetTranslations = () => {
    setTranslationResults([]);
    setError(null);
    setCurrentStatus("");
    setProgressPercent(0);
  };

  const updateTranslationResults = (updater: (prev: TranslationResult[]) => TranslationResult[]) => {
    setTranslationResults(updater);
  };

  return {
    // State
    isTranslating,
    translationResults,
    currentStatus,
    error,
    progressPercent,

    // Actions
    startTranslation,
    stopTranslation,
    resetTranslations,
    updateTranslationResults,
    setError,
  };
};
