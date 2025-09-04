import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Loader2,
  Play,
  Plus,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useEditor } from "@/contexts/EditorContext";
import GlossaryChatbot from "./GlossaryChatbot";


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
  activeSelectedEditor: string | null;
  selectedTextLineNumbers: Record<string, { from: number; to: number }> | null;
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
  onOverwriteAllResults: () => void;
  onStartGlossaryAndInconsistencyAnalysis: () => void;
  onStartStandardizationAnalysis: () => void;
}

const TranslationControls: React.FC<TranslationControlsProps> = ({
  selectedText,
  activeSelectedEditor,
  selectedTextLineNumbers,
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
  onOverwriteAllResults,
  onStartGlossaryAndInconsistencyAnalysis,
  onStartStandardizationAnalysis,
}) => {
  const { getQuill } = useEditor();

  // Helper function to extract start and end line numbers from selectedTextLineNumbers
  const getLineRange = (lineNumbers: Record<string, { from: number; to: number }> | null): { startLine: number; endLine: number } | null => {
    if (!lineNumbers) return null;
    
    const lineNums = Object.keys(lineNumbers).map(Number).sort((a, b) => a - b);
    if (lineNums.length === 0) return null;
    
    return {
      startLine: lineNums[0],
      endLine: lineNums[lineNums.length - 1]
    };
  };

  // Helper function to create truncated preview text
  const createTruncatedPreview = (text: string, lineRange: { startLine: number; endLine: number } | null): string => {
    if (!text || !lineRange) return "";
    
    const words = text.trim().split(/\s+/);
    const firstWords = words.slice(0, 4).join(" "); // Get first 4 words
    const lineRangeText = lineRange.startLine === lineRange.endLine 
      ? `(${lineRange.startLine})` 
      : `(${lineRange.startLine}-${lineRange.endLine})`;
    
    if (words.length > 4) {
      return `${firstWords}...${lineRangeText}`;
    } else {
      return `${firstWords}${lineRangeText}`;
    }
  };

  // Helper function to format text for tooltip (shows all text, scrollable)
  const formatTooltipText = (text: string): { displayText: string } => {
    return { 
      displayText: text
    };
  };

  // Function to scroll to the selected text in the editor
  const scrollToSelectedText = () => {
    if (!selectedTextLineNumbers || !activeSelectedEditor) return;
    
    const quill = getQuill(activeSelectedEditor);
    if (!quill) return;

    const lineRange = getLineRange(selectedTextLineNumbers);
    if (!lineRange) return;

    // Get the editor container and line numbers container
    const editorElement = quill.root;
    const editorContainer = editorElement.closest(".editor-container");
    if (!editorContainer) return;

    const lineNumbersContainer = editorContainer.querySelector(".line-numbers");
    if (!lineNumbersContainer) return;

    // Find the line number element for the start line
    const targetLineElement = lineNumbersContainer.querySelector(
      `.line-number[id$="-line-${lineRange.startLine}"]`
    ) as HTMLElement;
    
    if (!targetLineElement) return;

    // Get the top position of the line and scroll to it
    const lineTop = parseFloat(targetLineElement.style.top);
    editorElement.scrollTo({
      top: lineTop,
      behavior: "smooth",
    });
  };

  const lineRange = getLineRange(selectedTextLineNumbers);
  const truncatedPreview = createTruncatedPreview(selectedText, lineRange);
  const { displayText: tooltipText } = formatTooltipText(selectedText);

  return (
    <div className="border-t border-gray-200 p-3 space-y-3">
      {/* Selected Text Preview */}
      {selectedText && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-2">
        

          {/* Truncated Preview with Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="text-xs text-gray-700 font-mono cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors w-full text-left" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollToSelectedText();
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent selection change on mouse down
                  }}
                  type="button"
                >
                  {truncatedPreview}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-md max-h-32 p-3 bg-white border border-gray-200 shadow-lg text-xs overflow-hidden">
                <div className="relative max-h-24 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono leading-relaxed text-gray-700">
                    {tooltipText}
                  </pre>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
                  <Loader2 className="w-4 h-4 text-secondary-600 animate-spin" />
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
                      className="bg-secondary-600 h-2 rounded-full transition-all duration-300 ease-out"
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
                  onClick={onOverwriteAllResults}
                  variant="outline"
                  size="sm"
                  className={`h-6 px-2 text-xs transition-colors ${
                    copiedItems.has("overwrite-feedback")
                      ? "bg-green-100 text-green-600 border-green-300"
                      : ""
                  }`}
                  title={
                    copiedItems.has("overwrite-feedback")
                      ? "Overwritten!"
                      : "Overwrite at specific line numbers"
                  }
                >
                  {copiedItems.has("overwrite-feedback") ? (
                    <Check className="w-3 h-3 mr-1" />
                  ) : (
                    <Plus className="w-3 h-3 mr-1" />
                  )}
                  {copiedItems.has("overwrite-feedback") ? "Overwritten!" : "Overwrite All"}
                </Button>
              </div>
            </div>
          )}

          {/* Analysis Buttons - Only show when data is not loaded yet */}
          {(glossaryTerms.length === 0 ||
            Object.keys(inconsistentTerms).length === 0) && (
            <div className="flex items-center justify-center pt-1 border-t border-gray-100 space-y-1">
              <div className="flex gap-1">
                {/* Glossary Chatbot - Hide when glossary is loaded */}
                {glossaryTerms.length === 0 && (
                  <GlossaryChatbot
                    onStartGlossaryExtraction={onStartGlossaryAndInconsistencyAnalysis}
                    isExtractingGlossary={isExtractingGlossary}
                    isAnalyzingStandardization={isAnalyzingStandardization}
                    translationResults={translationResults}
                    disabled={translationResults.length === 0}
                  />
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
