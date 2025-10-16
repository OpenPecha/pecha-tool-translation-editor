import { useRef, useState } from "react";
import {
  type GlossaryItem,
  performStreamingGlossaryExtraction,
} from "@/api/glossary";
import type {
  TranslationConfig,
  TranslationResult,
} from "./useTranslationOperations";

export interface GlossaryTerm {
  source_term: string;
  translated_term: string;
  frequency?: number;
  context?: string;
}

export interface GlossaryEvent {
  type: string;
  timestamp?: string;
  total_items?: number;
  total_batches?: number;
  terms?: Array<{
    source_term: string;
    translated_term: string;
    frequency?: number;
    context?: string;
  }>;
  glossary_terms?: Array<{
    source_term?: string;
    translated_term?: string;
    original?: string;
    translated?: string;
    frequency?: number;
    context?: string;
    definition?: string;
  }>;
  error?: string;
}

interface UseGlossaryOperationsProps {
  config: TranslationConfig;
  getCurrentTranslationResults: () => TranslationResult[];
  onGlossaryComplete?: () => void;
  setError: (error: string | null) => void;
}

export const useGlossaryOperations = ({
  config,
  getCurrentTranslationResults,
  onGlossaryComplete,
  setError,
}: UseGlossaryOperationsProps) => {
  // Glossary extraction state
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([]);
  const [isExtractingGlossary, setIsExtractingGlossary] = useState(false);

  const glossaryAbortControllerRef = useRef<AbortController | null>(null);

  const handleGlossaryStreamEvent = (event: GlossaryEvent) => {
    console.log("Handling glossary event:", event.type, event);

    switch (event.type) {
      case "initialization":
        break;

      case "planning":
        break;

      case "glossary_extraction_start":
        break;

      case "glossary_batch_completed":
        console.log("Glossary batch completed:", event);
        if (event.terms && event.terms.length > 0) {
          // Convert the API response format to our interface
          const convertedTerms: GlossaryTerm[] = event.terms.map((term) => ({
            source_term: term.source_term,
            translated_term: term.translated_term,
            frequency: term.frequency,
            context: term.context,
          }));
          console.log("Adding glossary terms:", convertedTerms);
          setGlossaryTerms((prev) => [...prev, ...convertedTerms]);
        }
        break;

      case "completion":
        console.log("Glossary completion event:", event);
        setIsExtractingGlossary(false); // Stop loading indicator
        if (event.glossary_terms && event.glossary_terms.length > 0) {
          // Convert the API response format to our interface
          const convertedTerms: GlossaryTerm[] = event.glossary_terms.map(
            (term) => ({
              source_term: term.source_term || term.original || "",
              translated_term: term.translated_term || term.translated || "",
              frequency: term.frequency,
              context: term.context || term.definition,
            })
          );
          console.log("Setting final glossary terms:", convertedTerms);
          setGlossaryTerms(convertedTerms);

          // Trigger completion callback
          setTimeout(() => {
            onGlossaryComplete?.();
          }, 100);
        }
        break;

      case "error":
        console.error("Glossary extraction error:", event.error);
        setError(`Glossary extraction error: ${event.error}`);
        setIsExtractingGlossary(false); // Stop loading indicator on error
        break;

      default:
        console.log("Unknown glossary event type:", event.type, event);
    }
  };

  const startGlossaryExtraction = async () => {
    const translationResults = getCurrentTranslationResults();

    if (translationResults.length === 0) {
      console.log("No translation results available for glossary extraction");
      return;
    }

    console.log("Starting glossary extraction with:", {
      resultsCount: translationResults.length,
      modelName: config.modelName,
      batchSize: config.batchSize,
    });

    setIsExtractingGlossary(true);
    setGlossaryTerms([]);

    // Create abort controller for glossary extraction
    glossaryAbortControllerRef.current = new AbortController();

    try {
      // Prepare items for glossary extraction using current text (edited or original)
      const items: GlossaryItem[] = translationResults.map((result) => ({
        original_text: result.originalText,
        translated_text: result.translatedText, // This now includes edited text
        metadata: {
          ...result.metadata,
          timestamp: result.timestamp,
        },
      }));

      const glossaryParams = {
        items,
        model_name: config.modelName,
        batch_size: Math.min(config.batchSize, 5), // Limit batch size for glossary
      };

      console.log("Glossary extraction params:", glossaryParams);

      await performStreamingGlossaryExtraction(
        glossaryParams,
        // onEvent - handle glossary events
        (event: GlossaryEvent) => {
          console.log("Glossary event received:", event);
          if (!glossaryAbortControllerRef.current?.signal.aborted) {
            handleGlossaryStreamEvent(event);
          }
        },
        // onComplete
        () => {
          console.log("Glossary extraction completed!");
          setIsExtractingGlossary(false);
          onGlossaryComplete?.();
        },
        // onError
        (error: Error) => {
          console.error("Glossary extraction error:", error);
          setIsExtractingGlossary(false);
          // Show error in UI for debugging
          setError(`Glossary extraction failed: ${error.message}`);
        },
        // Pass the abort controller
        glossaryAbortControllerRef.current
      );
    } catch (err) {
      // Don't show error for aborted requests
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Glossary extraction aborted");
        return;
      }

      console.error("Glossary extraction error:", err);
      setIsExtractingGlossary(false);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      // Show error in UI for debugging
      setError(`Glossary extraction failed: ${errorMessage}`);
    }
  };

  const copyGlossaryTerms = () => {
    const glossaryText = glossaryTerms
      .map((term) => `${term.source_term} - ${term.translated_term}`)
      .join("\n");
    navigator.clipboard.writeText(glossaryText);
    return "glossary-copy";
  };

  const resetGlossary = () => {
    setGlossaryTerms([]);
    setIsExtractingGlossary(false);
  };

  const stopGlossaryExtraction = () => {
    if (glossaryAbortControllerRef.current) {
      glossaryAbortControllerRef.current.abort();
    }
    setIsExtractingGlossary(false);
  };

  // Standalone glossary extraction function
  const startStandaloneGlossaryExtraction = async (
    textPairs: GlossaryItem[]
  ) => {
    if (textPairs.length === 0) {
      console.log("No text pairs available for standalone glossary extraction");
      return;
    }

    console.log("Starting standalone glossary extraction with:", {
      pairsCount: textPairs.length,
      modelName: config.modelName,
      batchSize: config.batchSize,
    });

    setIsExtractingGlossary(true);
    setGlossaryTerms([]);

    // Create abort controller for glossary extraction
    glossaryAbortControllerRef.current = new AbortController();

    try {
      const glossaryParams = {
        items: textPairs,
        model_name: config.modelName,
        batch_size: Math.min(config.batchSize, 5), // Limit batch size for glossary
      };

      console.log("Standalone glossary extraction params:", glossaryParams);

      await performStreamingGlossaryExtraction(
        glossaryParams,
        // onEvent - handle glossary events
        (event: GlossaryEvent) => {
          console.log("Standalone glossary event received:", event);
          if (!glossaryAbortControllerRef.current?.signal.aborted) {
            handleGlossaryStreamEvent(event);
          }
        },
        // onComplete
        () => {
          console.log("Standalone glossary extraction completed!");
          setIsExtractingGlossary(false);
          onGlossaryComplete?.();
        },
        // onError
        (error: Error) => {
          console.error("Standalone glossary extraction error:", error);
          setIsExtractingGlossary(false);
          // Show error in UI for debugging
          setError(`Standalone glossary extraction failed: ${error.message}`);
        },
        glossaryAbortControllerRef.current
      );
    } catch (error) {
      console.error("Failed to start standalone glossary extraction:", error);
      setIsExtractingGlossary(false);
      setError(
        error instanceof Error
          ? `Failed to start standalone glossary extraction: ${error.message}`
          : "Failed to start standalone glossary extraction"
      );
    }
  };

  return {
    // State
    glossaryTerms,
    isExtractingGlossary,

    // Actions
    startGlossaryExtraction,
    startStandaloneGlossaryExtraction,
    copyGlossaryTerms,
    resetGlossary,
    stopGlossaryExtraction,
  };
};
