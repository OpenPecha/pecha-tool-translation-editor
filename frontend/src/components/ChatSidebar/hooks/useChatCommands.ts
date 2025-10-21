import { useCallback } from "react";
import { useTranslationSidebar } from "../../TranslationSidebar/contexts/TranslationSidebarContext";
import type { AvailableCommand, CommandResult } from "../types/chatTypes";
import { AVAILABLE_COMMANDS } from "../types/chatTypes";

export const useChatCommands = () => {
  const {
    selectedText,
    startTranslation,
    startGlossaryExtraction,
    isTranslating,
    isExtractingGlossary,
    getTextByLineNumber,
    getOriginalTextForLine,
    getTranslatedTextForLine,
    selectedTextLineNumbers,
    extractGlossaryFromEditors,
  } = useTranslationSidebar();

  const initiateTranslationFlow =
    useCallback(async (): Promise<CommandResult> => {
      if (!selectedText || selectedText.trim() === "") {
        return {
          success: false,
          message:
            "No text selected. Please select some text in the editor before using #translate.",
          error: "No selected text",
        };
      }

      if (isTranslating) {
        return {
          success: false,
          message:
            "Translation is already in progress. Please wait for it to complete.",
          error: "Translation in progress",
        };
      }

      await startTranslation();
      return {
        success: true,
        message: `Started translation for selected text: "${selectedText
          .slice(0, 100)
          .trim()}"...`,
        data: { action: "translate" },
      };
    }, [selectedText, isTranslating, startTranslation]);

  const initiateGlossaryFlow = useCallback(async (): Promise<CommandResult> => {
    if (isExtractingGlossary) {
      return {
        success: false,
        message:
          "Glossary extraction is already in progress. Please wait for it to complete.",
        error: "Extraction in progress",
      };
    }

    if (!selectedText || !selectedText.trim() || !selectedTextLineNumbers) {
      return {
        success: false,
        message:
          "No text selected. Please select some text in the editor to use #glossary.",
        error: "No selected text",
      };
    }

    const lineNumbers = Object.keys(selectedTextLineNumbers).map(Number);
    if (lineNumbers.length === 0) {
      return {
        success: false,
        message: "Could not determine the line number of the selected text.",
        error: "No line number",
      };
    }
    // Create text pairs for ALL selected lines, not just the first
    const textPairs = [];
    const missingTranslations = [];

    for (let i = 0; i < lineNumbers.length; i++) {
      const lineNumber = lineNumbers[i];
      const originalText = getOriginalTextForLine(lineNumber); // You'll need to add this
      const translatedText = getTranslatedTextForLine(lineNumber);

      if (!translatedText) {
        missingTranslations.push(lineNumber);
        continue; // Skip lines without translations
      }

      if (originalText && originalText.trim()) {
        textPairs.push({
          original_text: originalText.trim(),
          translated_text: translatedText.trim(),
          metadata: {
            pairing_method: "selected_text_line_match",
            pair_index: i,
            line_number: lineNumber,
            timestamp: Date.now(),
          },
        });
      }
    }

    if (textPairs.length === 0) {
      return {
        success: false,
        message:
          missingTranslations.length > 0
            ? `Could not find translations for lines: ${missingTranslations.join(
                ", "
              )}. Please ensure translations exist for the selected lines.`
            : "No valid text pairs found in the selection.",
        error: "No text pairs",
      };
    }
    await extractGlossaryFromEditors(textPairs);

    return {
      success: true,
      message: "Started glossary extraction from selected text.",
      data: { action: "glossary" },
    };
  }, [
    isExtractingGlossary,
    selectedText,
    selectedTextLineNumbers,
    getTranslatedTextForLine,
    extractGlossaryFromEditors,
  ]);

  const processInput = useCallback(
    async (input: string): Promise<CommandResult> => {
      const command = input.trim().slice(1).split(" ")[0].toLowerCase();

      if (!(AVAILABLE_COMMANDS as readonly string[]).includes(command)) {
        return {
          success: false,
          message: `Command "#${command}" not found. Available commands: #translate, #glossary.`,
          error: "Command not found",
        };
      }

      switch (command as AvailableCommand) {
        case "translate":
          return initiateTranslationFlow();
        case "glossary":
          return initiateGlossaryFlow();
        default:
          return {
            success: false,
            message: "Unknown command.",
            error: "Unknown command",
          };
      }
    },
    [initiateTranslationFlow, initiateGlossaryFlow]
  );

  return {
    processInput,
  };
};
