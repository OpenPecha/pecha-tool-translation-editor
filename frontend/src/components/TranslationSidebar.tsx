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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const TranslationSidebar: React.FC = () => {
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
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusLogs, setStatusLogs] = useState<
    Array<{
      timestamp: string;
      message: string;
      type: string;
    }>
  >([]);
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
  const addStatusLog = (event: TranslationStreamEvent) => {
    setStatusLogs((prev) => [
      ...prev,
      {
        timestamp: event.timestamp,
        message: event.message || event.type,
        type: event.type,
      },
    ]);
  };

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
    console.log("Stream event:", event); // Debug logging
    addStatusLog(event);

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
    setStatusLogs([]);
    setError(null);

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
        }
      );
    } catch (err) {
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

  const copyResult = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyAllResults = () => {
    const allTranslations = translationResults
      .map((result) => result.translatedText)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(allTranslations);
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
        /* Expanded State - Full Sidebar */
        <>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <Button
                onClick={() => setIsSidebarCollapsed(true)}
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-md hover:bg-gray-100 flex-shrink-0 mr-3"
                title="Collapse Translation Panel"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Live Translation
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Select text in the editor and translate it in real-time
                </p>
              </div>

              <Dialog
                open={isSettingsModalOpen}
                onOpenChange={setIsSettingsModalOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-md hover:bg-gray-100 flex-shrink-0"
                    title="Translation Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Translation Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Target Language */}
                    <div className="space-y-2">
                      <Label>Target Language</Label>
                      <Select
                        value={config.targetLanguage}
                        onValueChange={(value: TargetLanguage) =>
                          handleConfigChange("targetLanguage", value)
                        }
                      >
                        <SelectTrigger>
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
                      <Label>Text Type</Label>
                      <Select
                        value={config.textType}
                        onValueChange={(value: TextType) =>
                          handleConfigChange("textType", value)
                        }
                      >
                        <SelectTrigger>
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

                    {/* Model */}
                    <div className="space-y-2">
                      <Label>AI Model</Label>
                      <Select
                        value={config.modelName}
                        onValueChange={(value: ModelName) =>
                          handleConfigChange("modelName", value)
                        }
                      >
                        <SelectTrigger>
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
                      <Label htmlFor="batch-size">Batch Size</Label>
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
                      />
                    </div>

                    {/* User Rules */}
                    <div className="space-y-2">
                      <Label htmlFor="user-rules">
                        Translation Instructions
                      </Label>
                      <Textarea
                        id="user-rules"
                        placeholder="Additional instructions for translation..."
                        value={config.userRules}
                        onChange={(e) =>
                          handleConfigChange("userRules", e.target.value)
                        }
                        className="min-h-[60px] resize-none"
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-4 space-y-4 min-h-0">
            {/* Selected Text Display */}
            <div className="space-y-2 flex-shrink-0">
              <Label>Selected Text for Translation</Label>
              <div className="min-h-[100px] max-h-[300px] p-3 border rounded-md bg-gray-50 text-sm overflow-y-auto">
                {selectedText ? (
                  <pre className="whitespace-pre-wrap font-sans text-gray-800">
                    {selectedText}
                  </pre>
                ) : (
                  <p className="text-gray-500 italic">
                    Select text from the editor to translate...
                  </p>
                )}
              </div>
              {selectedText && (
                <p className="text-xs text-green-600">
                  ✓ {getLineCount(selectedText)} line
                  {getLineCount(selectedText) === 1 ? "" : "s"} selected (
                  {selectedText.length} characters)
                </p>
              )}
            </div>

            {/* Translation Controls */}
            <div className="space-y-2 flex-shrink-0">
              <div className="flex gap-2">
                <Button
                  onClick={startTranslation}
                  disabled={isTranslating || !selectedText.trim()}
                  className="flex-1"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Translation
                    </>
                  )}
                </Button>
                {isTranslating && (
                  <Button
                    onClick={stopTranslation}
                    variant="destructive"
                    size="icon"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Status Indicator with Progress Bar */}
              {currentStatus && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-600 text-center py-1">
                    {currentStatus}
                  </div>
                  {isTranslating && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                  {isTranslating && (
                    <div className="text-xs text-gray-500 text-center">
                      {Math.round(progressPercent)}%
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md space-y-3 flex-shrink-0">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-800">
                      Translation Error
                    </h4>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setError(null);
                      startTranslation();
                    }}
                    variant="outline"
                    size="sm"
                    className="text-red-700 border-red-300 hover:bg-red-50"
                  >
                    Retry Translation
                  </Button>
                  <Button
                    onClick={() => setError(null)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* Status Logs (when translating) */}
            {isTranslating && statusLogs.length > 0 && (
              <Card className="mb-4 flex-shrink-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Translation Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-32 overflow-y-auto">
                  <div className="space-y-1">
                    {statusLogs.slice(-5).map((log, index) => (
                      <div key={index} className="text-xs text-gray-600">
                        <span className="text-gray-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>{" "}
                        - {log.message}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Translation Results */}
            {(translationResults.length > 0 || isTranslating) && (
              <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Translation Results
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {translationResults.length > 0 && (
                        <>
                          <span className="text-xs text-gray-500">
                            ({translationResults.length} translations)
                          </span>
                          <Button
                            onClick={copyAllResults}
                            variant="outline"
                            size="sm"
                          >
                            Copy All
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                  <div className="flex-1 overflow-y-auto">
                    <div ref={resultAreaRef} className="p-4 space-y-4">
                      {/* Current Status */}
                      {isTranslating && (
                        <div className="flex items-center text-blue-600 p-3 bg-blue-50 rounded-md border border-blue-200">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          <span className="text-sm font-medium">
                            {currentStatus}
                          </span>
                        </div>
                      )}

                      {/* Individual Translation Results */}
                      {translationResults.map((result) => (
                        <div key={result.id} className="space-y-3">
                          {/* Translated Text */}
                          <div className="bg-white rounded-lg p-4 border-2 border-green-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-green-700">
                                  Translation
                                </h4>
                              </div>
                              <Button
                                onClick={() =>
                                  copyResult(result.translatedText)
                                }
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 text-xs border-green-300 hover:bg-green-50"
                              >
                                Copy
                              </Button>
                            </div>
                            <div className="text-sm text-gray-800 leading-relaxed">
                              <pre className="whitespace-pre-wrap font-sans">
                                {result.translatedText}
                              </pre>
                            </div>

                            {/* Metadata */}
                            <div className="mt-3 pt-2 border-t border-green-100">
                              <div className="text-xs text-gray-500 text-right">
                                {new Date(
                                  result.timestamp
                                ).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Empty State */}
                      {!isTranslating && translationResults.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-sm">
                            Translation results will appear here
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TranslationSidebar;
