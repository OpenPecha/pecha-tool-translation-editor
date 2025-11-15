import { ChevronRight, MapPin, MessageSquare, Plus, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation as useTranslationI18next } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SettingsModal from "./components/sidebar/SettingsModal";
import {
  TranslationProvider,
  useTranslation,
} from "./contexts/TranslationContext";
import ChatHistory from "./components/ChatHistory";
import ChatInput from "./components/ChatInput";
import ResultsPanel from "./components/ResultsPanel";
import { useChatFlow } from "./hooks/useChatFlow";

interface ChatSidebarProps {
  documentId: string;
}

const ChatSidebarContent: React.FC = () => {
  const { t } = useTranslationI18next();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const { messages, clearHistory, messageCount, handleAction } = useChatFlow();

  const {
    config,
    handleConfigChange,
    isTranslating,
    isExtractingGlossary,
    isAnalyzingStandardization,
    selectedText,
    selectedTextLineNumbers,
    clearSelection,
    resetTranslations,
    resetGlossary,
    translationResults,
    glossaryTerms,
    inconsistentTerms,
    inputMode,
  } = useTranslation();

  const hasTranslationResults = translationResults.length > 0;
  const hasGlossaryResults = glossaryTerms.length > 0;
  const hasInconsistentTerms = Object.keys(inconsistentTerms).length > 0;
  const showPanel =
    hasTranslationResults ||
    hasGlossaryResults ||
    hasInconsistentTerms ||
    isTranslating ||
    isExtractingGlossary ||
    isAnalyzingStandardization;

  // Helper function to extract start and end line numbers from selectedTextLineNumbers
  const getLineRange = (
    lineNumbers: Record<string, { from: number; to: number }> | null
  ): { startLine: number; endLine: number } | null => {
    if (!lineNumbers) return null;

    const lineNums = Object.keys(lineNumbers)
      .map(Number)
      .sort((a, b) => a - b);
    if (lineNums.length === 0) return null;

    return {
      startLine: lineNums[0],
      endLine: lineNums.at(-1)!,
    };
  };

  // Helper function to create truncated preview text
  const createTruncatedPreview = (
    text: string,
    lineRange: { startLine: number; endLine: number } | null
  ): string => {
    if (!text || !lineRange) return "";

    const words = text.trim().split(/\s+/);
    const firstWords = words.slice(0, 4).join(" "); // Get first 4 words
    const lineRangeText =
      lineRange.startLine === lineRange.endLine
        ? `(${lineRange.startLine})`
        : `(${lineRange.startLine}-${lineRange.endLine})`;

    if (words.length > 4) {
      return `${firstWords}...${lineRangeText}`;
    } else {
      return `${firstWords}${lineRangeText}`;
    }
  };

  const handleClearChat = useCallback(() => {
    if (
      globalThis.confirm(
        "Are you sure you want to clear the chat history and reset all results?"
      )
    ) {
      clearHistory();
      resetTranslations();
      resetGlossary();
    }
  }, [clearHistory, resetTranslations, resetGlossary]);

  if (isCollapsed) {
    return (
      <div className="h-full w-12 flex flex-col bg-neutral-50 dark:bg-neutral-800 border-l border-gray-200 dark:border-gray-700">
        <div className="p-2 flex flex-col items-center gap-4">
          <Button
            onClick={() => setIsCollapsed(false)}
            variant="ghost"
            size="icon"
            className="w-8 h-8 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Open Chat Assistant"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-end p-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">

        <div className="">
          {messageCount > 0 && (
            <Button
              onClick={handleClearChat}
              variant="ghost"
              size="icon"
              className="w-6 h-6 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600"
              title="Reset chat"
            >
              <Plus className="w-3 h-3" />
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

      {/* Selected Text Display */}
      <TooltipProvider>
        {selectedText && (
          <div className="border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-950/20 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                    {t("translation.selectedText")}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm text-blue-800 dark:text-blue-200 truncate">
                        {createTruncatedPreview(
                          selectedText,
                          getLineRange(selectedTextLineNumbers)
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      className="max-w-xs max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="whitespace-pre-wrap break-words text-xs">
                        {selectedText}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  onClick={clearSelection}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1 text-blue-600 dark:text-blue-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
                  title="Clear selected text"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </TooltipProvider>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {showPanel ? (
          <ResultsPanel inputMode={inputMode} />
        ) : (
          <ChatHistory
            messages={messages}
            isProcessing={
              isTranslating ||
              isExtractingGlossary ||
              isAnalyzingStandardization
            }
            onAction={handleAction}
          />
        )}

        {/* Input Area */}
        <ChatInput
          isProcessing={
            isTranslating || isExtractingGlossary || isAnalyzingStandardization
          }
        />
      </div>
    </div>
  );
};

const ChatSidebar: React.FC<ChatSidebarProps> = ({ documentId }) => {
  return (
    <TranslationProvider documentId={documentId}>
      <ChatSidebarContent />
    </TranslationProvider>
  );
};

export default ChatSidebar;
