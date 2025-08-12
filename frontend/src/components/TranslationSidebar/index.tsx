import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Square, Languages, Trash2, ChevronRight } from "lucide-react";

import {
  TargetLanguage,
  TextType,
  ModelName,
  performStreamingTranslation,
  TranslationStreamEvent,
} from "@/api/translate";
import {
  performStreamingGlossaryExtraction,
  GlossaryItem,
} from "@/api/glossary";
import {
  performStandardizationAnalysis,
  StandardizationRequest,
  InconsistentTerms,
} from "@/api/standardize";
import {
  performStreamingApplyStandardization,
  ApplyStandardizationParams,
  ApplyStandardizationStreamEvent,
} from "@/api/apply_standardization";
import { useEditor } from "@/contexts/EditorContext";

// Import components
import GlossaryDisplay from "./components/GlossaryDisplay";
import TranslationResults from "./components/TranslationResults";
import SettingsModal from "./components/SettingsModal";
import StandardizationPanel from "./components/StandardizationPanel";
import TranslationControls from "./components/TranslationControls";

interface TranslationConfig {
  targetLanguage: TargetLanguage;
  textType: TextType;
  modelName: ModelName;
  batchSize: number;
  userRules: string;
  extractGlossary: boolean;
}

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

interface GlossaryTerm {
  source_term: string;
  translated_term: string;
  frequency?: number;
  context?: string;
}

interface GlossaryEvent {
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

const TranslationSidebar: React.FC<{ documentId: string }> = ({
  documentId,
}) => {
  const [config, setConfig] = useState<TranslationConfig>({
    targetLanguage: "english",
    textType: "commentary",
    modelName: "claude",
    batchSize: 2,
    userRules: "do translation normally",
    extractGlossary: false,
  });

  const [selectedText, setSelectedText] = useState<string>("");
  const [selectedTextLineNumbers, setSelectedTextLineNumbers] = useState<Record<
    string,
    { from: number; to: number }
  > | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResults, setTranslationResults] = useState<
    TranslationResult[]
  >([]);
  const { quillEditors, getSelectionLineNumbers } = useEditor();

  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState(new Set<number>());

  // Glossary extraction state
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([]);
  const [isExtractingGlossary, setIsExtractingGlossary] = useState(false);

  const glossaryAbortControllerRef = useRef<AbortController | null>(null);

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

  const abortControllerRef = useRef<AbortController | null>(null);
  const resultAreaRef = useRef<HTMLDivElement>(null);
  const translationListRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Track the current segment index for line number mapping
  const currentSegmentIndexRef = useRef<number>(0);

  // Function to get selected text from the DOM (only from main editor)
  const getSelectedText = () => {
    const selection = window.getSelection();
    if (selection?.toString().trim()) {
      // Check if selection is from the main editor (not from sidebar or other elements)
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;

      // Find the closest editor container
      let element =
        container.nodeType === Node.TEXT_NODE
          ? container.parentElement
          : (container as Element);
      while (element) {
        // Look for editor-specific classes or data attributes
        if (
          element.classList?.contains("ql-editor") ||
          element.classList?.contains("ProseMirror") ||
          element.closest(".editor-container") ||
          element.closest('[data-editor="main"]')
        ) {
          return selection.toString().trim();
        }
        // Don't allow selection from translation sidebar
        if (element.closest("[data-translation-sidebar]")) {
          return "";
        }
        element = element.parentElement;
      }
    }
    return "";
  };

  // Monitor text selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      const text = getSelectedText();
      if (!text || text.length === 0) {
        return;
      }
      setSelectedText(text);

      // Get line number information for the selected text
      if (text) {
        const lineNumbers = getSelectionLineNumbers();
        setSelectedTextLineNumbers(lineNumbers);

        // Console log the line numbers in the requested format
      } else {
        setSelectedTextLineNumbers(null);
      }
    };

    // Add event listener for selection changes
    document.addEventListener("selectionchange", handleSelectionChange);

    // Initial check
    handleSelectionChange();

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [getSelectionLineNumbers]);

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

  const handleConfigChange = <K extends keyof TranslationConfig>(
    key: K,
    value: TranslationConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Helper functions for managing translation state
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

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollContainerRef.current) {
        console.log("Auto-scrolling to bottom..."); // Debug log
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 150); // Slightly increased delay to ensure DOM is updated
  };

  const renderResults = () => {
    // Force re-render of results - component already re-renders on state change
  };

  const onStreamComplete = () => {
    setIsTranslating(false);
    setCurrentStatus("Complete");

    // Trigger glossary extraction if enabled and we have results
    console.log("Translation completed!", {
      extractGlossaryEnabled: config.extractGlossary,
      translationResultsCount: translationResults.length,
      willTriggerGlossary:
        config.extractGlossary && translationResults.length > 0,
    });

    if (config.extractGlossary && translationResults.length > 0) {
      startGlossaryExtraction();
    }
  };

  const onStreamError = (error: string) => {
    console.error("Stream error:", error);
    setError(error);
    setIsTranslating(false);
    setCurrentStatus("Error");
  };

  const handleStreamEvent = (event: TranslationStreamEvent, segmentLineMappings?: Array<Record<string, { from: number; to: number }> | null>) => {
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
            const segmentLineNumbers = segmentLineMappings && segmentLineMappings[segmentIndex] || null;

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
            scrollToBottom(); // Auto-scroll when new translations are added
            return updatedResults;
          });
          renderResults();
        }
        break;

      case "completion":
        console.log("Completion event - all batches done"); // Debug
        updateProgress(100, "Translation completed!");

        setTimeout(() => onStreamComplete(), 1000); // Delay completion
        break;

      case "error":
        console.error("Stream error:", event.error);
        onStreamError(event.error);
        break;

      default:
        console.log("Unknown event type:", event.type);
    }
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
          [lineKey]: range
        });
      } else {
        // If we have more segments than line mappings, use null
        segmentMappings.push(null);
      }
    }

    return segmentMappings;
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
    setCurrentStatus("Initializing...");
    setProgressPercent(0);
    setError(null);
    setCopiedItems(new Set()); // Clear any copy feedback
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
          if (
            errorMessage.includes("503") ||
            errorMessage.includes("service unavailable")
          ) {
            errorMessage =
              "Translation service is currently unavailable. Please try again later.";
          } else if (
            errorMessage.includes("504") ||
            errorMessage.includes("timed out")
          ) {
            errorMessage =
              "Translation request timed out. The service may be experiencing high load.";
          } else if (errorMessage.includes("Authentication")) {
            errorMessage =
              "Authentication failed. Please refresh the page and try again.";
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

  const copyAllResults = () => {
    const allTranslations = translationResults
      .map((result) => result.translatedText)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(allTranslations);
    showCopyFeedback("copy-all");
  };

  const appendAllResults = () => {
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

  // Glossary extraction functions
  // Combined function to extract glossary and check inconsistencies
  const startGlossaryAndInconsistencyAnalysis = async () => {
    console.log(
      "Starting combined glossary extraction and inconsistency analysis"
    );
    await startGlossaryExtraction();
  };

  const startGlossaryExtraction = async () => {
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
      // Prepare items for glossary extraction
      const items: GlossaryItem[] = translationResults.map((result) => ({
        original_text: result.originalText,
        translated_text: result.translatedText,
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

          // Start standardization analysis after glossary extraction completes
          // We need to delay this to ensure glossary terms state has updated
          setTimeout(() => {
            startStandardizationAnalysis();
          }, 100);
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

          // Start standardization analysis with the new terms
          setTimeout(() => {
            if (translationResults.length > 0) {
              startStandardizationAnalysis();
            }
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

  const copyGlossaryTerms = () => {
    const glossaryText = glossaryTerms
      .map((term) => `${term.source_term} - ${term.translated_term}`)
      .join("\n");
    navigator.clipboard.writeText(glossaryText);
    showCopyFeedback("glossary-copy");
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

  // Standardization analysis functions
  const startStandardizationAnalysis = async () => {
    if (translationResults.length === 0 || glossaryTerms.length === 0) {
      console.log(
        "No translation results or glossary terms available for standardization analysis"
      );
      return;
    }

    console.log("Starting standardization analysis with:", {
      resultsCount: translationResults.length,
      glossaryTermsCount: glossaryTerms.length,
    });

    setIsAnalyzingStandardization(true);
    setStandardizationStatus("Analyzing translation consistency...");
    setInconsistentTerms({});

    try {
      // Prepare items for standardization analysis
      const items: StandardizationRequest["items"] = translationResults.map(
        (result) => ({
          original_text: result.originalText,
          translated_text: result.translatedText,
          glossary: glossaryTerms.map((term) => ({
            source_term: term.source_term,
            translated_term: term.translated_term,
          })),
        })
      );

      const standardizationParams = { items };

      console.log("Standardization analysis params:", standardizationParams);

      const result = await performStandardizationAnalysis(
        standardizationParams
      );

      console.log("Standardization analysis result:", result);
      setInconsistentTerms(result.inconsistent_terms);

      const inconsistentCount = Object.keys(result.inconsistent_terms).length;
      if (inconsistentCount > 0) {
        setStandardizationStatus(
          `Found ${inconsistentCount} inconsistent terms`
        );
      } else {
        setStandardizationStatus("No inconsistencies found");
      }

      setIsAnalyzingStandardization(false);
    } catch (err) {
      console.error("Standardization analysis error:", err);
      setIsAnalyzingStandardization(false);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setStandardizationStatus(
        `Standardization analysis failed: ${errorMessage}`
      );
      // Show error in UI for debugging
      setError(`Standardization analysis failed: ${errorMessage}`);
    }
  };

  // Apply standardization functions
  const startApplyStandardization = async () => {
    if (
      translationResults.length === 0 ||
      Object.keys(inconsistentTerms).length === 0
    ) {
      console.log(
        "No translation results or inconsistent terms available for standardization application"
      );
      return;
    }

    console.log("Starting apply standardization with:", {
      resultsCount: translationResults.length,
      inconsistentTermsCount: Object.keys(inconsistentTerms).length,
    });

    setIsApplyingStandardization(true);
    setApplyStandardizationStatus("Preparing standardization application...");

    // Create abort controller for this request
    applyStandardizationAbortControllerRef.current = new AbortController();

    try {
      // Convert translation results to standardization items
      const items = translationResults.map((result) => ({
        original_text: result.originalText,
        translated_text: result.translatedText,
        glossary: glossaryTerms.map((term) => ({
          source_term: term.source_term,
          translated_term: term.translated_term,
        })),
      }));

      // Create standardization pairs from user selections
      const standardization_pairs = Object.entries(inconsistentTerms).map(
        ([sourceWord, translations]) => ({
          source_word: sourceWord,
          standardized_translation:
            standardizationSelections[sourceWord] || translations[0],
        })
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
          console.log("Apply standardization completed!");
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

  const handleApplyStandardizationStreamEvent = (
    event: ApplyStandardizationStreamEvent
  ) => {
    console.log("Handling apply standardization event:", event);

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
          setTranslationResults((prev) => {
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
        console.log("Apply standardization completion event:", event);
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

  const stopApplyStandardization = () => {
    if (applyStandardizationAbortControllerRef.current) {
      applyStandardizationAbortControllerRef.current.abort();
    }
    setIsApplyingStandardization(false);
    setApplyStandardizationStatus("Standardization stopped");
    setCurrentProcessingIndex(-1); // Reset processing index
  };

  const resetTranslations = () => {
    setTranslationResults([]);
    setCopiedItems(new Set());
    setError(null);
    setCurrentStatus("");
    setProgressPercent(0);
    setExpandedItems(new Set());
    setGlossaryTerms([]);
    setIsExtractingGlossary(false);
    setInconsistentTerms({});
    setIsAnalyzingStandardization(false);
    setStandardizationStatus("");
    setIsApplyingStandardization(false);
    setApplyStandardizationStatus("");
    setStandardizationSelections({});
  };

  return (
    <div
      data-translation-sidebar
      className={`h-full flex border-l border-gray-200 bg-white transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? "w-12" : "w-96"
      }`}
    >
      {/* Main Translation Panel */}
      <div className="flex-1 flex flex-col">
        {/* Collapsed State - Toggle Button Only */}
        {isSidebarCollapsed ? (
          <div className="h-full flex flex-col items-center justify-start pt-4 px-1">
            <Button
              onClick={() => setIsSidebarCollapsed(false)}
              variant="ghost"
              size="icon"
              className={`w-10 h-10 rounded-md hover:bg-gray-100 relative ${
                selectedText ? "ring-2 ring-green-200" : ""
              }`}
              title={`Open Translation Panel${
                selectedText ? " (Text Selected)" : ""
              }`}
            >
              <Languages className="w-5 h-5" />
              {selectedText && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              )}
            </Button>

            <div
              className="mt-4"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              <span className="text-xs text-gray-500 font-medium">
                Translate
              </span>
            </div>

            {isTranslating && (
              <div className="mt-4 flex flex-col items-center space-y-2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <div className="w-1 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="w-1 bg-blue-500 rounded-full transition-all duration-300"
                    style={{ height: `${Math.max(progressPercent, 5)}px` }}
                  />
                </div>
              </div>
            )}

            {translationResults.length > 0 && !isTranslating && (
              <div className="mt-4">
                <div
                  className="w-2 h-2 bg-green-500 rounded-full"
                  title={`${translationResults.length} translation(s) complete`}
                />
              </div>
            )}
          </div>
        ) : (
          /* Expanded State - Chat-like Interface */
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <Button
                onClick={() => setIsSidebarCollapsed(true)}
                variant="ghost"
                size="icon"
                className="w-6 h-6 rounded-md hover:bg-gray-100"
                title="Collapse Translation Panel"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>

              <h3 className="text-sm font-medium text-gray-900">Translation</h3>

              <div className="flex items-center gap-1">
                {translationResults.length > 0 && (
                  <Button
                    onClick={resetTranslations}
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 rounded-md hover:bg-gray-100 hover:text-red-600"
                    title="Clear Translation Results"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}

                <SettingsModal
                  config={config}
                  isOpen={isSettingsModalOpen}
                  onOpenChange={setIsSettingsModalOpen}
                  onConfigChange={handleConfigChange}
                />
              </div>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 flex flex-col min-h-0">
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-3 space-y-3"
              >
                {/* Error Display */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 text-red-400 mt-0.5">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-red-800 font-medium">
                          Error
                        </p>
                        <p className="text-sm text-red-600 mt-1">{error}</p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            onClick={() => {
                              setError(null);
                              startTranslation();
                            }}
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs text-red-700 border-red-300 hover:bg-red-50"
                          >
                            Retry
                          </Button>
                          <Button
                            onClick={() => setError(null)}
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-red-600"
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Translation Results */}
                <div ref={translationListRef}>
                  <TranslationResults
                    translationResults={translationResults}
                    copiedItems={copiedItems}
                    expandedItems={expandedItems}
                    onCopyResult={copyResult}
                    onToggleItemExpansion={toggleItemExpansion}
                  />
                </div>

                {/* Translation Progress - Bottom */}
                {isTranslating && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        <span className="text-sm font-medium text-blue-800">
                          Translating...
                        </span>
                      </div>
                      <Button
                        onClick={stopTranslation}
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
                      >
                        <Square className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-blue-600">{currentStatus}</p>
                    </div>
                  </div>
                )}

                {/* Glossary Terms Display - Full variant */}
                <GlossaryDisplay
                  glossaryTerms={glossaryTerms}
                  copiedItems={copiedItems}
                  isExtractingGlossary={isExtractingGlossary}
                  onCopyGlossaryTerms={copyGlossaryTerms}
                  onRetryGlossaryExtraction={
                    startGlossaryAndInconsistencyAnalysis
                  }
                  scrollContainerRef={scrollContainerRef}
                />
                <StandardizationPanel
                  inconsistentTerms={inconsistentTerms}
                  standardizationSelections={standardizationSelections}
                  isAnalyzingStandardization={isAnalyzingStandardization}
                  isApplyingStandardization={isApplyingStandardization}
                  applyStandardizationStatus={applyStandardizationStatus}
                  standardizationStatus={standardizationStatus}
                  onStandardizationSelectionChange={
                    setStandardizationSelections
                  }
                  onApplyStandardization={startApplyStandardization}
                  onStopStandardization={stopApplyStandardization}
                  onRetryInconsistencyAnalysis={startStandardizationAnalysis}
                  variant="inline"
                  currentProcessingIndex={currentProcessingIndex}
                  scrollContainerRef={scrollContainerRef}
                />
                {/* Empty State */}
                {!isTranslating &&
                  translationResults.length === 0 &&
                  !error && (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Languages className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Select text to translate</p>
                      </div>
                    </div>
                  )}
              </div>

              {/* Input Area at Bottom */}
              <TranslationControls
                selectedText={selectedText}
                selectedTextLineNumbers={selectedTextLineNumbers}
                translationResults={translationResults}
                isTranslating={isTranslating}
                isExtractingGlossary={isExtractingGlossary}
                isAnalyzingStandardization={isAnalyzingStandardization}
                isApplyingStandardization={isApplyingStandardization}
                standardizationProgress={standardizationProgress}
                applyStandardizationStatus={applyStandardizationStatus}
                copiedItems={copiedItems}
                glossaryTerms={glossaryTerms}
                inconsistentTerms={inconsistentTerms}
                onStartTranslation={startTranslation}
                onCopyAllResults={copyAllResults}
                onAppendAllResults={appendAllResults}
                onStartGlossaryAndInconsistencyAnalysis={
                  startGlossaryAndInconsistencyAnalysis
                }
                onStartStandardizationAnalysis={startStandardizationAnalysis}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TranslationSidebar;
