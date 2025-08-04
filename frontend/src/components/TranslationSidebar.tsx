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
  ChevronRight,
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
import { useEditor } from "@/contexts/EditorContext";

interface TranslationConfig {
  targetLanguage: TargetLanguage;
  textType: TextType;
  modelName: ModelName;
  batchSize: number;
  userRules: string;
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

const TranslationSidebar: React.FC<{ documentId: string }> = ({
  documentId,
}) => {
  const [config, setConfig] = useState<TranslationConfig>({
    targetLanguage: "english",
    textType: "commentary",
    modelName: "claude",
    batchSize: 2,
    userRules: "do translation normally",
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

  const abortControllerRef = useRef<AbortController | null>(null);
  const resultAreaRef = useRef<HTMLDivElement>(null);
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

  const renderResults = () => {
    // Force re-render of results - component already re-renders on state change
  };

  const onStreamComplete = () => {
    setIsTranslating(false);
    setCurrentStatus("Complete");
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

          setTranslationResults((prev) => [...prev, ...newResults]);
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
      // Get the current content length
      const currentLength = targetEditor.getLength();

      // Check if there's existing content (Quill always has at least 1 character for the final newline)
      const hasContent = currentLength > 1;

      // Add spacing if there's existing content
      const spacing = hasContent ? "\n\n" : "";
      const contentToInsert =
        targetEditor.getText() + spacing + allTranslations;
      targetEditor?.setText(contentToInsert, "user");

      // Focus the editor
      targetEditor.focus();
    } else {
      // Fallback: copy to clipboard if no editor found
      navigator.clipboard.writeText(allTranslations);
      showCopyFeedback("append-fallback");
      alert(
        "No editor found for this document. Text copied to clipboard instead."
      );
    }
  };

  const resetTranslations = () => {
    setTranslationResults([]);
    setCopiedItems(new Set());
    setError(null);
    setCurrentStatus("");
    setProgressPercent(0);
  };

  return (
    <div
      data-translation-sidebar
      className={`h-full flex flex-col border-l border-gray-200 bg-white transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? "w-12" : "w-96"
      }`}
    >
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
            <span className="text-xs text-gray-500 font-medium">Translate</span>
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
                                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
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
                                  {type.charAt(0).toUpperCase() + type.slice(1)}
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
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Conversation Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
                      <p className="text-sm text-red-800 font-medium">Error</p>
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

              {/* Translation Status */}
              {isTranslating && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800">
                        {currentStatus}
                      </p>
                      <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        {Math.round(progressPercent)}%
                      </p>
                    </div>
                    <Button
                      onClick={stopTranslation}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
                    >
                      <Square className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Translation Results */}
              {translationResults.map((result) => (
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
                        title={copiedItems.has(result.id) ? "Copied!" : "Copy"}
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
                    {/* Source Text (truncated to one line) */}
                    <div className="border-l-4 border-gray-300 pl-3">
                      <div className="text-xs text-gray-500 mb-1 font-medium">
                        Source:
                      </div>
                      <div className="text-sm text-gray-600 truncate leading-relaxed">
                        {result.originalText}
                      </div>
                    </div>

                    {/* Translation Text */}
                    <div className="border-l-4 border-blue-300 pl-3">
                      <div className="text-xs text-gray-500 mb-1 font-medium">
                        Translation:
                      </div>
                      <div className="text-sm text-gray-800 leading-relaxed">
                        <pre className="whitespace-pre-wrap font-sans">
                          {result.translatedText}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Batch Actions */}
              {translationResults.length > 0 && !isTranslating && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
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
                </div>
              )}

              {/* Empty State */}
              {!isTranslating && translationResults.length === 0 && !error && (
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
                    <span className="text-xs text-gray-500">Selected Text</span>
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
  );
};

export default TranslationSidebar;
