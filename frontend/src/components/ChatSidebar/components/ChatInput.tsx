import { Send } from "lucide-react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import type { GlossaryItem } from "@/api/glossary";
import { useTranslation } from "@/components/ChatSidebar/contexts/TranslationContext";
import { useTextSelection } from "../hooks";

interface ChatInputProps {
  isProcessing?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  isProcessing = false,
  disabled = false,
  placeholder = "Type or paste text to translate...",
}) => {
  const [input, setInput] = useState("");
  const [shouldStartTranslation, setShouldStartTranslation] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { getTextPairsByLineNumbers } = useTextSelection();
  const {
    isTranslating,
    isExtractingGlossary,
    resetTranslations,
    resetGlossary,
    hasActiveWorkflow,
    resetActiveWorkflow,
    setManualText,
    setInputMode,
    startTranslation,
    extractGlossaryFromEditors,
    manualText,
    inputMode,
    selectedText,
    clearUISelection,
    selectedTextLineNumbers,
  } = useTranslation();

  // Effect to start translation when manual text is set from ChatInput
  useEffect(() => {
    if (
      shouldStartTranslation &&
      inputMode === "manual" &&
      manualText.trim() &&
      !isTranslating
    ) {
      setShouldStartTranslation(false);
      resetTranslations();
      resetGlossary();
      startTranslation();
    }
  }, [
    shouldStartTranslation,
    inputMode,
    manualText,
    isTranslating,
    resetTranslations,
    resetGlossary,
    startTranslation,
  ]);
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (text && !disabled && !isTranslating) {
      // Set the text in manual mode and flag for translation
      setInputMode("manual");
      setManualText(text);
      setShouldStartTranslation(true);

      // Clear input immediately
      setInput("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [input, disabled, isTranslating, setInputMode, setManualText]);

  // Handle quick command buttons for selected text
  const handleTranslateSelected = useCallback(() => {
    if (selectedText.trim() && !isTranslating) {
      setInputMode("selection");
      resetTranslations();
      resetGlossary();
      startTranslation();
    }
  }, [
    selectedText,
    isTranslating,
    setInputMode,
    resetTranslations,
    resetGlossary,
    startTranslation,
  ]);

  const handleGlossarySelected = useCallback(async () => {
    if (selectedText.trim() && !isExtractingGlossary) {
      // Create text pairs from selected text and corresponding translations

      const textPairs = getTextPairsByLineNumbers();
      if (!textPairs || textPairs.length === 0) {
        console.warn("No valid text pairs found for glossary extraction");
        return;
      }
      // Validate text pairs before sending
      const validTextPairs = textPairs.filter(
        (pair) =>
          pair.original_text &&
          pair.translated_text &&
          pair.original_text.trim().length > 0 &&
          pair.translated_text.trim().length > 0
      );

      if (validTextPairs.length === 0) {
        console.warn("No valid text pairs after validation");
        return;
      }

      setInputMode("selection");
      resetTranslations();
      resetGlossary();

      // Use extractGlossaryFromEditors with validated text pairs
      await extractGlossaryFromEditors(validTextPairs);
    }
  }, [
    selectedText,
    isExtractingGlossary,
    getTextPairsByLineNumbers,
    extractGlossaryFromEditors,
    resetTranslations,
    resetGlossary,
    setInputMode,
  ]);

  const handleKeyPress = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);

      // Auto-resize textarea
      const textarea = e.target;
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // Max height before scrolling
      textarea.style.height = Math.min(scrollHeight, maxHeight) + "px";
    },
    []
  );
  const handleFocus = () => {
    clearUISelection();
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Quick Commands for Selected Text */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 ">
        {hasActiveWorkflow ? (
          <Button
            variant="ghost"
            onClick={resetActiveWorkflow}
            className="flex-shrink-0 h-7 justify-self-end text-xs gap-1 hover:bg-blue-50 hover:text-blue-600"
          >
            /Clear
          </Button>
        ) : (
          <div className="flex gap-1 overflow-x-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTranslateSelected}
              disabled={
                !selectedText.trim() || isTranslating || isExtractingGlossary
              }
              className="flex-shrink-0 h-7 text-xs gap-1 hover:bg-blue-50 hover:text-blue-600"
              title="Translate selected text"
            >
              /Translate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGlossarySelected}
              disabled={
                !selectedText.trim() ||
                !selectedTextLineNumbers ||
                isTranslating ||
                isExtractingGlossary
              }
              className="flex-shrink-0 h-7 text-xs gap-1 hover:bg-blue-50 hover:text-blue-600"
              title="Extract glossary from selected text and corresponding translations"
            >
              /Glossary
            </Button>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3">
        <div className="flex gap-2 items-center">
          <textarea
            ref={textareaRef}
            value={input}
            onFocus={handleFocus}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isProcessing || isTranslating}
            className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 min-h-[40px] max-h-[120px]"
            rows={1}
          />

          <Button
            onClick={handleSend}
            disabled={
              disabled || !input.trim() || isProcessing || isTranslating
            }
            size="sm"
            className="h-10 px-3 bg-blue-500 hover:bg-blue-600 text-white"
            title="Translate text (Enter)"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
