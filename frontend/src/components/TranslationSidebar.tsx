import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Play,
  Square,
  Settings,
  Languages,
  Copy,
  Plus,
  Check,
  Globe,
  FileText,
  Bot,
  Hash,
  MessageSquare,
  Trash2,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from "lucide-react";

import {
  TARGET_LANGUAGES,
  TEXT_TYPES,
  MODEL_NAMES,
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
  formatInconsistenciesForDisplay,
} from "@/api/standardize";
import {
  performStreamingApplyStandardization,
  ApplyStandardizationParams,
  ApplyStandardizationStreamEvent,
} from "@/api/apply_standardization";
import { useEditor } from "@/contexts/EditorContext";

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
    extractGlossary: true,
  });

  const [selectedText, setSelectedText] = useState<string>("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResults, setTranslationResults] = useState<
    TranslationResult[]
  >([]);
  const { quillEditors } = useEditor();

  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState(new Set<number>());

  // Glossary extraction state
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([]);
  const [isExtractingGlossary, setIsExtractingGlossary] = useState(false);
  const [glossaryStatus, setGlossaryStatus] = useState<string>("");

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

  const abortControllerRef = useRef<AbortController | null>(null);
  const resultAreaRef = useRef<HTMLDivElement>(null);
  const translationListRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Function to get selected text from the DOM (only from main editor)
  const getSelectedText = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
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
      setSelectedText(text);

      // Auto-expand sidebar when text is selected (optional)
      // Uncomment the line below to auto-expand on selection:
      // if (text && isSidebarCollapsed) setIsSidebarCollapsed(false);
    };

    // Add event listener for selection changes
    document.addEventListener("selectionchange", handleSelectionChange);

    // Initial check
    handleSelectionChange();

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

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

  // Helper function to get line count from text
  const getLineCount = (text: string) => {
    return text.split("\n").filter((line) => line.trim().length > 0).length;
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
      console.log("Starting glossary extraction...");
      startGlossaryExtraction();
    } else {
      console.log("Glossary extraction not triggered:", {
        extractGlossary: config.extractGlossary,
        hasResults: translationResults.length > 0,
      });
    }
  };

  const onStreamError = (error: string) => {
    console.error("Stream error:", error);
    setError(error);
    setIsTranslating(false);
    setCurrentStatus("Error");
  };

  const handleStreamEvent = (event: TranslationStreamEvent) => {
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

          const newResults = event.batch_results.map((result, index) => ({
            id: `${event.batch_id}-${index}-${Date.now()}`,
            originalText: result.original_text || "",
            translatedText: result.translated_text || "",
            timestamp: event.timestamp,
            metadata: {
              batch_id: event.batch_id,
              ...result.metadata,
            },
          }));

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

  const startTranslation = async () => {
    if (!selectedText.trim()) {
      setError("Please select text to translate");
      return;
    }

    setIsTranslating(true);
    setTranslationResults([]);
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
            handleStreamEvent(event);
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
    setGlossaryStatus("Preparing glossary extraction...");
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
          setGlossaryStatus("Glossary extraction completed!");

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
          setGlossaryStatus(`Glossary error: ${error.message}`);
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
      setGlossaryStatus(`Glossary extraction failed: ${errorMessage}`);
      // Show error in UI for debugging
      setError(`Glossary extraction failed: ${errorMessage}`);
    }
  };

  const handleGlossaryStreamEvent = (event: GlossaryEvent) => {
    console.log("Handling glossary event:", event.type, event);

    switch (event.type) {
      case "initialization":
        setGlossaryStatus(
          `Starting glossary extraction of ${event.total_items} items...`
        );
        break;

      case "planning":
        setGlossaryStatus(
          `Created ${event.total_batches} batches for glossary extraction`
        );
        break;

      case "glossary_extraction_start":
        setGlossaryStatus("Extracting glossary terms...");
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
          setGlossaryStatus(`Extracted ${event.terms.length} terms from batch`);
        }
        break;

      case "completion":
        console.log("Glossary completion event:", event);
        setGlossaryStatus("Glossary extraction completed!");
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
        setGlossaryStatus(`Error: ${event.error}`);
        setError(`Glossary extraction error: ${event.error}`);
        break;

      default:
        console.log("Unknown glossary event type:", event.type, event);
    }
  };

  const stopGlossaryExtraction = () => {
    if (glossaryAbortControllerRef.current) {
      glossaryAbortControllerRef.current.abort();
    }
    setIsExtractingGlossary(false);
    setGlossaryStatus("Glossary extraction stopped");
  };

  const copyGlossaryTerms = () => {
    const glossaryText = glossaryTerms
      .map((term) => `${term.source_term} - ${term.translated_term}`)
      .join("\n");
    navigator.clipboard.writeText(glossaryText);
    showCopyFeedback("glossary-copy");
  };

  // Text truncation functionality
  const TRUNCATE_LENGTH = 150; // Characters to show before truncation

  const truncateText = (
    text: string,
    maxLength: number = TRUNCATE_LENGTH
  ): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
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

  const shouldShowExpandButton = (text: string): boolean => {
    return text.length > TRUNCATE_LENGTH;
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

      console.log("Apply standardization params:", params);

      await performStreamingApplyStandardization(
        params,
        // onEvent
        (event: ApplyStandardizationStreamEvent) => {
          console.log("Apply standardization event received:", event);
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
        break;

      case "retranslation_completed":
        setApplyStandardizationStatus(`Updated item ${event.index + 1}`);

        // Update the specific translation result with the new standardized version
        if (event.updated_item && typeof event.index === "number") {
          setTranslationResults((prev) => {
            const updatedResults = [...prev];
            if (updatedResults[event.index]) {
              updatedResults[event.index] = {
                ...updatedResults[event.index],
                translatedText: event.updated_item.translated_text,
                originalText: event.updated_item.original_text,
              };
            }
            return updatedResults;
          });
        }
        break;

      case "completion":
        console.log("Apply standardization completion event:", event);
        setApplyStandardizationStatus("Standardization application completed!");
        break;

      case "error":
        console.error("Apply standardization error event:", event);
        setApplyStandardizationStatus(
          `Apply standardization error: ${event.message}`
        );
        setError(`Apply standardization error: ${event.message}`);
        break;
    }
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
    setGlossaryStatus("");
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

                <Dialog
                  open={isSettingsModalOpen}
                  onOpenChange={setIsSettingsModalOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 rounded-md hover:bg-gray-100"
                      title="Translation Settings"
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Settings className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <DialogTitle className="text-lg font-semibold">
                            Translation Settings
                          </DialogTitle>
                          <p className="text-sm text-gray-500 mt-1">
                            Configure your translation preferences
                          </p>
                        </div>
                      </div>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                      {/* Core Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <Globe className="w-4 h-4 text-gray-600" />
                          Core Settings
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Target Language */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <Languages className="w-3 h-3 text-gray-500" />
                              Target Language
                            </Label>
                            <Select
                              value={config.targetLanguage}
                              onValueChange={(value: TargetLanguage) =>
                                handleConfigChange("targetLanguage", value)
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TARGET_LANGUAGES.map((lang) => (
                                  <SelectItem key={lang} value={lang}>
                                    {lang.charAt(0).toUpperCase() +
                                      lang.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Text Type */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <FileText className="w-3 h-3 text-gray-500" />
                              Content Type
                            </Label>
                            <Select
                              value={config.textType}
                              onValueChange={(value: TextType) =>
                                handleConfigChange("textType", value)
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TEXT_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type.charAt(0).toUpperCase() +
                                      type.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* AI Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <Bot className="w-4 h-4 text-gray-600" />
                          AI Configuration
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Model */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <Bot className="w-3 h-3 text-gray-500" />
                              AI Model
                            </Label>
                            <Select
                              value={config.modelName}
                              onValueChange={(value: ModelName) =>
                                handleConfigChange("modelName", value)
                              }
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MODEL_NAMES.map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model.toUpperCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Batch Size */}
                          <div className="space-y-2">
                            <Label
                              htmlFor="batch-size"
                              className="text-sm font-medium flex items-center gap-2"
                            >
                              <Hash className="w-3 h-3 text-gray-500" />
                              Batch Size
                            </Label>
                            <Input
                              id="batch-size"
                              type="number"
                              min={1}
                              max={10}
                              value={config.batchSize}
                              onChange={(e) =>
                                handleConfigChange(
                                  "batchSize",
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="h-9"
                            />
                            <p className="text-xs text-gray-500">
                              Lines processed per batch (1-10)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Custom Instructions */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <MessageSquare className="w-4 h-4 text-gray-600" />
                          Custom Instructions
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="user-rules"
                            className="text-sm font-medium flex items-center gap-2"
                          >
                            <MessageSquare className="w-3 h-3 text-gray-500" />
                            Translation Guidelines
                          </Label>
                          <Textarea
                            id="user-rules"
                            placeholder="Enter specific instructions for the AI translator (e.g., 'Maintain formal tone', 'Preserve technical terms', etc.)"
                            value={config.userRules}
                            onChange={(e) =>
                              handleConfigChange("userRules", e.target.value)
                            }
                            className="min-h-[80px] resize-none"
                          />
                          <p className="text-xs text-gray-500">
                            Provide additional context or specific rules for
                            better translation quality
                          </p>
                        </div>
                      </div>

                      {/* Glossary Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <BookOpen className="w-4 h-4 text-gray-600" />
                          Glossary Extraction
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <Lightbulb className="w-3 h-3 text-gray-500" />
                                Auto-extract Glossary
                              </Label>
                              <p className="text-xs text-gray-500">
                                Automatically extract key terms after
                                translation
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.extractGlossary}
                                onChange={(e) =>
                                  handleConfigChange(
                                    "extractGlossary",
                                    e.target.checked
                                  )
                                }
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
                <div ref={translationListRef} className="space-y-4">
                  {translationResults.map((result, index) => (
                    <div
                      key={result.id}
                      className="bg-gray-50 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            onClick={() =>
                              copyResult(result.translatedText, result.id)
                            }
                            variant="ghost"
                            size="sm"
                            className={`h-6 w-6 p-0 hover:bg-gray-200 transition-colors ${
                              copiedItems.has(result.id)
                                ? "bg-green-100 text-green-600"
                                : ""
                            }`}
                            title={
                              copiedItems.has(result.id) ? "Copied!" : "Copy"
                            }
                          >
                            {copiedItems.has(result.id) ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {/* Source Text with highlighted glossary terms */}
                        <div className="border-l-4 border-gray-300 pl-3">
                          <div className="text-xs text-gray-500 mb-1 font-medium flex items-center gap-2">
                            Source:
                          </div>
                          <div className="text-sm text-gray-600 leading-relaxed">
                            {expandedItems.has(index)
                              ? result.originalText
                              : truncateText(result.originalText)}
                          </div>
                          {shouldShowExpandButton(result.originalText) && (
                            <Button
                              onClick={() => toggleItemExpansion(index)}
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 mt-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                              {expandedItems.has(index) ? (
                                <>
                                  <ChevronUp className="w-3 h-3 mr-1" />
                                  Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3 mr-1" />
                                  Show more
                                </>
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Translation Text with highlighted glossary terms */}
                        <div className="border-l-4 border-blue-300 pl-3">
                          <div className="text-xs text-gray-500 mb-1 font-medium flex items-center gap-2">
                            Translation:
                          </div>
                          <div className="text-sm text-gray-800 leading-relaxed">
                            <div className="whitespace-pre-wrap font-sans">
                              {expandedItems.has(index)
                                ? result.translatedText
                                : truncateText(result.translatedText)}
                            </div>
                          </div>
                          {shouldShowExpandButton(result.translatedText) && (
                            <Button
                              onClick={() => toggleItemExpansion(index)}
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 mt-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                              {expandedItems.has(index) ? (
                                <>
                                  <ChevronUp className="w-3 h-3 mr-1" />
                                  Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3 mr-1" />
                                  Show more
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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

                {/* Batch Actions */}
                {translationResults.length > 0 && !isTranslating && (
                  <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {translationResults.length} translation
                        {translationResults.length > 1 ? "s" : ""}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          onClick={copyAllResults}
                          variant="outline"
                          size="sm"
                          className={`h-6 px-2 text-xs transition-colors ${
                            copiedItems.has("copy-all")
                              ? "bg-green-100 text-green-600 border-green-300"
                              : ""
                          }`}
                          title={
                            copiedItems.has("copy-all") ? "Copied!" : "Copy All"
                          }
                        >
                          {copiedItems.has("copy-all") ? (
                            <Check className="w-3 h-3 mr-1" />
                          ) : (
                            <Copy className="w-3 h-3 mr-1" />
                          )}
                          {copiedItems.has("copy-all") ? "Copied!" : "Copy All"}
                        </Button>
                        <Button
                          onClick={appendAllResults}
                          variant="outline"
                          size="sm"
                          className={`h-6 px-2 text-xs transition-colors ${
                            copiedItems.has("append-fallback")
                              ? "bg-green-100 text-green-600 border-green-300"
                              : ""
                          }`}
                          title={
                            copiedItems.has("append-fallback")
                              ? "Copied to clipboard!"
                              : "Append to Editor"
                          }
                        >
                          {copiedItems.has("append-fallback") ? (
                            <Check className="w-3 h-3 mr-1" />
                          ) : (
                            <Plus className="w-3 h-3 mr-1" />
                          )}
                          {copiedItems.has("append-fallback")
                            ? "Copied!"
                            : "Append"}
                        </Button>
                      </div>
                    </div>

                    {/* Manual Glossary Extraction Button */}
                    <div className="flex items-center justify-center pt-1 border-t border-gray-100 space-y-1">
                      <div className="flex gap-1">
                        <Button
                          onClick={startGlossaryAndInconsistencyAnalysis}
                          disabled={
                            isExtractingGlossary ||
                            isAnalyzingStandardization ||
                            translationResults.length === 0
                          }
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs text-purple-600 border-purple-300 hover:bg-purple-50"
                        >
                          {isExtractingGlossary ||
                          isAnalyzingStandardization ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              {isExtractingGlossary
                                ? "Extracting..."
                                : "Analyzing..."}
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-3 h-3 mr-1" />
                              Extract & Analyze
                            </>
                          )}
                        </Button>

                        {glossaryTerms.length > 0 && (
                          <Button
                            onClick={startStandardizationAnalysis}
                            disabled={
                              isAnalyzingStandardization ||
                              isExtractingGlossary ||
                              translationResults.length === 0 ||
                              glossaryTerms.length === 0
                            }
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                          >
                            {isAnalyzingStandardization ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Check Consistency
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Glossary Extraction Status */}
                {isExtractingGlossary && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-purple-800">
                          {glossaryStatus}
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          Extracting key terms from translations...
                        </p>
                      </div>
                      <Button
                        onClick={stopGlossaryExtraction}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-purple-600 hover:bg-purple-100"
                      >
                        <Square className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Inline Glossary Suggestions */}
                {glossaryTerms.length > 0 && (
                  <div className="border-l-4 border-purple-300 bg-purple-50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">
                        Found {glossaryTerms.length} key terms
                      </span>
                      <Button
                        onClick={copyGlossaryTerms}
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-purple-600 hover:bg-purple-100"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-purple-600 mb-2">
                      Key terms extracted from your translations:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {glossaryTerms.slice(0, 6).map((term, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center bg-white border border-purple-200 rounded px-2 py-1 text-xs"
                        >
                          <span className="text-gray-700">
                            {term.source_term}
                          </span>
                          <ChevronRight className="w-3 h-3 mx-1 text-purple-400" />
                          <span className="text-purple-600">
                            {term.translated_term}
                          </span>
                        </div>
                      ))}
                      {glossaryTerms.length > 6 && (
                        <div className="inline-flex items-center text-xs text-purple-500">
                          +{glossaryTerms.length - 6} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Inline Inconsistency Suggestions */}
                {Object.keys(inconsistentTerms).length > 0 && (
                  <div className="border-l-4 border-orange-300 bg-orange-50 p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">
                        {Object.keys(inconsistentTerms).length} inconsistent
                        terms found
                      </span>
                    </div>
                    <div className="text-xs text-orange-600 mb-2">
                      These terms have multiple translations. Choose your
                      preferred standardization:
                    </div>

                    {formatInconsistenciesForDisplay(inconsistentTerms).map(
                      (item, index) => (
                        <div
                          key={`${item.sourceTerm}-${index}`}
                          className="bg-white border border-orange-200 rounded p-3 space-y-2"
                        >
                          <div className="text-sm font-medium text-gray-800">
                            {item.sourceTerm}
                          </div>
                          <div className="text-xs text-orange-600 mb-1">
                            Found variations: {item.translations.join(", ")}
                          </div>

                          {/* Simple radio selection */}
                          <div className="space-y-1">
                            {item.translations.map((translation, idx) => (
                              <label
                                key={idx}
                                className="flex items-center gap-2 cursor-pointer text-sm"
                              >
                                <input
                                  type="radio"
                                  name={`standardization-${item.sourceTerm}`}
                                  value={translation}
                                  checked={
                                    standardizationSelections[
                                      item.sourceTerm
                                    ] === translation ||
                                    (!standardizationSelections[
                                      item.sourceTerm
                                    ] &&
                                      idx === 0)
                                  }
                                  onChange={(e) =>
                                    setStandardizationSelections((prev) => ({
                                      ...prev,
                                      [item.sourceTerm]: e.target.value,
                                    }))
                                  }
                                  className="text-orange-600"
                                />
                                <span className="text-gray-700">
                                  {translation}
                                </span>
                              </label>
                            ))}

                            {/* Custom option */}
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <input
                                type="radio"
                                name={`standardization-${item.sourceTerm}`}
                                value="custom"
                                checked={
                                  !!(
                                    standardizationSelections[
                                      item.sourceTerm
                                    ] &&
                                    !item.translations.includes(
                                      standardizationSelections[item.sourceTerm]
                                    )
                                  )
                                }
                                onChange={() =>
                                  setStandardizationSelections((prev) => ({
                                    ...prev,
                                    [item.sourceTerm]: "",
                                  }))
                                }
                                className="text-orange-600"
                              />
                              <div className="flex-1">
                                <span className="text-gray-700">Custom:</span>
                                {standardizationSelections[item.sourceTerm] &&
                                  !item.translations.includes(
                                    standardizationSelections[item.sourceTerm]
                                  ) && (
                                    <Input
                                      placeholder="Enter custom translation"
                                      value={
                                        standardizationSelections[
                                          item.sourceTerm
                                        ] || ""
                                      }
                                      onChange={(e) =>
                                        setStandardizationSelections(
                                          (prev) => ({
                                            ...prev,
                                            [item.sourceTerm]: e.target.value,
                                          })
                                        )
                                      }
                                      className="text-xs mt-1 h-6"
                                    />
                                  )}
                              </div>
                            </label>
                          </div>
                        </div>
                      )
                    )}

                    {/* Apply button */}
                    <div className="pt-2 border-t border-orange-200">
                      <Button
                        onClick={startApplyStandardization}
                        disabled={
                          isApplyingStandardization ||
                          isAnalyzingStandardization
                        }
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white h-8 text-sm"
                      >
                        {isApplyingStandardization ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Apply Standardization
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Apply Status */}
                    {isApplyingStandardization && (
                      <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded p-2">
                        {applyStandardizationStatus}
                      </div>
                    )}
                  </div>
                )}

                {/* Success Message */}
                {!isAnalyzingStandardization &&
                  !isExtractingGlossary &&
                  Object.keys(inconsistentTerms).length === 0 &&
                  standardizationStatus.includes("No inconsistencies") && (
                    <div className="border-l-4 border-green-300 bg-green-50 p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Analysis Complete
                        </span>
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Your translations are consistent across all terms
                      </div>
                    </div>
                  )}

                {/* Analysis Status */}
                {(isExtractingGlossary || isAnalyzingStandardization) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-800">
                          {isExtractingGlossary
                            ? "Extracting glossary terms..."
                            : standardizationStatus}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {isExtractingGlossary
                            ? "Processing translation content..."
                            : "Checking translation consistency..."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inconsistency Panel */}
                {Object.keys(inconsistentTerms).length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <h3 className="text-lg font-semibold text-orange-800">
                        Translation Inconsistencies
                      </h3>
                    </div>
                    <p className="text-sm text-orange-600">
                      Choose standardized translations for inconsistent terms
                    </p>

                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {formatInconsistenciesForDisplay(inconsistentTerms).map(
                        (item, index) => (
                          <div
                            key={`${item.sourceTerm}-${index}`}
                            className="bg-white border border-orange-200 rounded-lg p-4 space-y-3"
                          >
                            <div className="text-base font-medium text-gray-800">
                              {item.sourceTerm}
                            </div>
                            <div className="text-sm text-orange-600 font-medium">
                              Choose the standardized translation:
                            </div>

                            {/* Radio button options for existing translations */}
                            <div className="space-y-3">
                              {item.translations.map((translation, idx) => (
                                <label
                                  key={idx}
                                  className="flex items-start gap-3 cursor-pointer group"
                                >
                                  <input
                                    type="radio"
                                    name={`standardization-${item.sourceTerm}`}
                                    value={translation}
                                    checked={
                                      standardizationSelections[
                                        item.sourceTerm
                                      ] === translation ||
                                      (!standardizationSelections[
                                        item.sourceTerm
                                      ] &&
                                        idx === 0)
                                    }
                                    onChange={(e) =>
                                      setStandardizationSelections((prev) => ({
                                        ...prev,
                                        [item.sourceTerm]: e.target.value,
                                      }))
                                    }
                                    className="mt-1 text-orange-600"
                                  />
                                  <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-1">
                                    {translation}
                                  </span>
                                </label>
                              ))}

                              {/* Custom option */}
                              <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                  type="radio"
                                  name={`standardization-${item.sourceTerm}`}
                                  value="custom"
                                  checked={
                                    !!(
                                      standardizationSelections[
                                        item.sourceTerm
                                      ] &&
                                      !item.translations.includes(
                                        standardizationSelections[
                                          item.sourceTerm
                                        ]
                                      )
                                    )
                                  }
                                  onChange={() =>
                                    setStandardizationSelections((prev) => ({
                                      ...prev,
                                      [item.sourceTerm]: "",
                                    }))
                                  }
                                  className="mt-1 text-orange-600"
                                />
                                <div className="flex-1">
                                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                    Custom:
                                  </span>

                                  {/* Custom input field */}
                                  {standardizationSelections[item.sourceTerm] &&
                                    !item.translations.includes(
                                      standardizationSelections[item.sourceTerm]
                                    ) && (
                                      <div className="mt-2">
                                        <Input
                                          placeholder="Enter custom translation"
                                          value={
                                            standardizationSelections[
                                              item.sourceTerm
                                            ] || ""
                                          }
                                          onChange={(e) =>
                                            setStandardizationSelections(
                                              (prev) => ({
                                                ...prev,
                                                [item.sourceTerm]:
                                                  e.target.value,
                                              })
                                            )
                                          }
                                          className="text-sm"
                                        />
                                      </div>
                                    )}
                                </div>
                              </label>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {/* Apply Button */}
                    <div className="pt-4 border-t border-orange-200">
                      <Button
                        onClick={startApplyStandardization}
                        disabled={
                          isApplyingStandardization ||
                          isAnalyzingStandardization
                        }
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        size="lg"
                      >
                        {isApplyingStandardization ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Applying Standardization...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Apply Standardization (
                            {Object.keys(inconsistentTerms).length} terms)
                          </>
                        )}
                      </Button>

                      {/* Apply Status */}
                      {isApplyingStandardization && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 font-medium">
                            {applyStandardizationStatus}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Success Message - No Inconsistencies */}
                {!isAnalyzingStandardization &&
                  !isExtractingGlossary &&
                  Object.keys(inconsistentTerms).length === 0 &&
                  standardizationStatus.includes("No inconsistencies") && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Translation Analysis Complete
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        Your translations are consistent across all terms
                      </p>
                    </div>
                  )}

                {/* Glossary Terms Display */}
                {glossaryTerms.length > 0 ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">
                          Extracted Glossary
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={copyGlossaryTerms}
                          variant="ghost"
                          size="sm"
                          className={`h-6 w-6 p-0 hover:bg-purple-100 transition-colors ${
                            copiedItems.has("glossary-copy")
                              ? "bg-green-100 text-green-600"
                              : "text-purple-600"
                          }`}
                          title={
                            copiedItems.has("glossary-copy")
                              ? "Copied!"
                              : "Copy Glossary Terms"
                          }
                        >
                          {copiedItems.has("glossary-copy") ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          {glossaryTerms.length} terms
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {glossaryTerms.map((term, index) => (
                        <div
                          key={`${term.source_term}-${index}`}
                          className="bg-white border border-purple-200 rounded-md p-2 space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800">
                                {term.source_term}
                              </div>
                              <div className="text-sm text-gray-600">
                                {term.translated_term}
                              </div>
                              {term.context && (
                                <div className="text-xs text-gray-500 italic mt-1">
                                  {term.context}
                                </div>
                              )}
                            </div>
                            {term.frequency && term.frequency > 1 && (
                              <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                ×{term.frequency}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-purple-600 text-center">
                      {glossaryTerms.length} terms extracted
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No glossary terms available</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Translate text with auto-extract glossary enabled
                    </p>
                  </div>
                )}

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
              <div className="border-t border-gray-200 p-3 space-y-3">
                {/* Selected Text Preview */}
                {selectedText && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">
                        Selected Text
                      </span>
                      <span className="text-xs text-gray-400">
                        {getLineCount(selectedText)} line
                        {getLineCount(selectedText) === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="max-h-16 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">
                        {selectedText.length > 200
                          ? selectedText.substring(0, 200) + "..."
                          : selectedText}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Translation Button */}
                <Button
                  onClick={startTranslation}
                  disabled={isTranslating || !selectedText.trim()}
                  className="w-full h-8"
                  size="sm"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-2" />
                      Translate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TranslationSidebar;

// Note: If there are JSX errors around the closing tags above,
// manually retype lines 2194-2199 due to invisible character issues
