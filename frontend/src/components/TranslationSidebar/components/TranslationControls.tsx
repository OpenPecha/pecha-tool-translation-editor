import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Play,
  Plus,
  Copy,
  Check,
  BookOpen,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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

interface TranslationControlsProps {
  selectedText: string;
  translationResults: TranslationResult[];
  isTranslating: boolean;
  isExtractingGlossary: boolean;
  isAnalyzingStandardization: boolean;
  isApplyingStandardization?: boolean;
  standardizationProgress?: {
    current: number;
    total: number;
    percentage: number;
  };
  applyStandardizationStatus?: string;
  copiedItems: Set<string>;
  glossaryTerms: GlossaryTerm[];
  inconsistentTerms: Record<string, unknown>;
  onStartTranslation: () => void;
  onCopyAllResults: () => void;
  onAppendAllResults: () => void;
  onStartGlossaryAndInconsistencyAnalysis: () => void;
  onStartStandardizationAnalysis: () => void;
}

const TranslationControls: React.FC<TranslationControlsProps> = ({
  selectedText,
  translationResults,
  isTranslating,
  isExtractingGlossary,
  isAnalyzingStandardization,
  isApplyingStandardization = false,
  standardizationProgress,
  applyStandardizationStatus,
  copiedItems,
  glossaryTerms,
  inconsistentTerms,
  onStartTranslation,
  onCopyAllResults,
  onAppendAllResults,
  onStartGlossaryAndInconsistencyAnalysis,
  onStartStandardizationAnalysis,
}) => {
  const [isSelectedTextCollapsed, setIsSelectedTextCollapsed] = useState(true);

  const getLineCount = (text: string) => {
    return text.split("\n").filter((line) => line.trim().length > 0).length;
  };

  return (
    <div className="border-t border-gray-200 p-3 space-y-3">
      {/* Selected Text Preview */}
      {selectedText && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Selected Text</span>
              <span className="text-xs text-gray-400">
                {getLineCount(selectedText)} line
                {getLineCount(selectedText) === 1 ? "" : "s"}
              </span>
            </div>
            <button
              onClick={() =>
                setIsSelectedTextCollapsed(!isSelectedTextCollapsed)
              }
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title={
                isSelectedTextCollapsed
                  ? "Show selected text"
                  : "Hide selected text"
              }
            >
              {isSelectedTextCollapsed ? (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronUp className="w-3 h-3 text-gray-500" />
              )}
            </button>
          </div>
          {!isSelectedTextCollapsed && (
            <div className="max-h-16 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">
                {selectedText.length > 200
                  ? selectedText.substring(0, 200) + "..."
                  : selectedText}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Batch Actions or Standardization Progress */}
      {translationResults.length > 0 && !isTranslating && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
          {isApplyingStandardization ? (
            /* Standardization Progress Display */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-sm font-medium text-gray-900">
                    Applying Standardization
                  </span>
                </div>
                {standardizationProgress && (
                  <span className="text-sm font-medium text-gray-900">
                    {standardizationProgress.percentage}%
                  </span>
                )}
              </div>

              {standardizationProgress && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{
                        width: `${standardizationProgress.percentage}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      {standardizationProgress.current} of{" "}
                      {standardizationProgress.total} items
                    </span>
                    {applyStandardizationStatus && (
                      <span className="italic">
                        {applyStandardizationStatus}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Normal Batch Actions */
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {translationResults.length} translation
                {translationResults.length > 1 ? "s" : ""}
              </span>
              <div className="flex gap-1">
                <Button
                  onClick={onCopyAllResults}
                  variant="outline"
                  size="sm"
                  className={`h-6 px-2 text-xs transition-colors ${
                    copiedItems.has("copy-all")
                      ? "bg-green-100 text-green-600 border-green-300"
                      : ""
                  }`}
                  title={copiedItems.has("copy-all") ? "Copied!" : "Copy All"}
                >
                  {copiedItems.has("copy-all") ? (
                    <Check className="w-3 h-3 mr-1" />
                  ) : (
                    <Copy className="w-3 h-3 mr-1" />
                  )}
                  {copiedItems.has("copy-all") ? "Copied!" : "Copy All"}
                </Button>
                <Button
                  onClick={onAppendAllResults}
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
                  {copiedItems.has("append-fallback") ? "Copied!" : "Append"}
                </Button>
              </div>
            </div>
          )}

          {/* Analysis Buttons - Only show when data is not loaded yet */}
          {(glossaryTerms.length === 0 ||
            Object.keys(inconsistentTerms).length === 0) && (
            <div className="flex items-center justify-center pt-1 border-t border-gray-100 space-y-1">
              <div className="flex gap-1">
                {/* Extract & Analyze Button - Hide when glossary is loaded */}
                {glossaryTerms.length === 0 && (
                  <Button
                    onClick={onStartGlossaryAndInconsistencyAnalysis}
                    disabled={
                      isExtractingGlossary ||
                      isAnalyzingStandardization ||
                      translationResults.length === 0
                    }
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    {isExtractingGlossary || isAnalyzingStandardization ? (
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
                )}

                {/* Check Consistency Button - Show only when glossary exists but inconsistencies don't */}
                {glossaryTerms.length > 0 &&
                  Object.keys(inconsistentTerms).length === 0 && (
                    <Button
                      onClick={onStartStandardizationAnalysis}
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
          )}
        </div>
      )}

      {/* Translation Button */}
      <Button
        onClick={onStartTranslation}
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
  );
};

export default TranslationControls;
