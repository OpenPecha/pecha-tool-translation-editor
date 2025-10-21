import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslationSidebar } from "../../TranslationSidebar/contexts/TranslationSidebarContext";
import type { ChatMessage } from "../types/chatTypes";
import { useChatCommands } from "./useChatCommands";
import { useChatHistory } from "./useChatHistory";
export type ChatFlowState =
  | "IDLE"
  | "AWAITING_GLOSSARY_CONFIRMATION"
  | "AWAITING_INCONSISTENCY_CONFIRMATION"
  | "AWAITING_STANDARDIZATION_APPLY";

export const useChatFlow = () => {
  const [flowState, setFlowState] = useState<ChatFlowState>("IDLE");
  const { messages, addMessage, clearHistory, messageCount } = useChatHistory();
  const {
    startGlossaryExtraction,
    startStandardizationAnalysis,
    startApplyStandardization,
    inconsistentTerms,
    selectedText,
    selectedTextLineNumbers,
    getTranslatedTextForLine,
    extractGlossaryFromEditors,
  } = useTranslationSidebar();

  const { processInput } = useChatCommands();

  const handleSendMessage = useCallback(
    async (input: string) => {
      const trimmedInput = input.trim();
      addMessage("user", trimmedInput);

      if (trimmedInput.startsWith("#")) {
        const result = await processInput(trimmedInput);
        if (result.success) {
          addMessage("command-response", result.message, {
            command: trimmedInput.split(" ")[0].slice(1),
            status: "completed",
            metadata: result.data as Record<string, unknown>,
          });
        } else {
          addMessage("error", result.message, {
            command: trimmedInput.split(" ")[0].slice(1),
            status: "error",
            metadata: { error: result.error },
          });
        }
      } else {
        // Handle regular messages
        addMessage(
          "system",
          "I can only process commands. Please start your message with #."
        );
      }
    },
    [addMessage, processInput]
  );

  const handleAction = useCallback(
    async (action: string, message?: ChatMessage) => {
      switch (action) {
        case "confirm_glossary":
          if (flowState === "AWAITING_GLOSSARY_CONFIRMATION") {
            addMessage("system", "Starting glossary extraction...");

            if (
              selectedText &&
              selectedText.trim() &&
              selectedTextLineNumbers
            ) {
              const lineNumbers = Object.keys(selectedTextLineNumbers).map(
                Number
              );
              if (lineNumbers.length > 0) {
                const firstLineNumber = lineNumbers[0];
                const translatedText =
                  getTranslatedTextForLine(firstLineNumber);

                if (translatedText) {
                  const textPairs = [
                    {
                      original_text: selectedText.trim(),
                      translated_text: translatedText,
                      metadata: {
                        pairing_method: "selected_text_line_match",
                        pair_index: 0,
                        timestamp: Date.now(),
                      },
                    },
                  ];

                  await extractGlossaryFromEditors(textPairs);
                  addMessage(
                    "system",
                    "Glossary extracted from newly selected text."
                  );
                } else {
                  addMessage(
                    "error",
                    `Could not find a corresponding translation for the selected text on line ${firstLineNumber}. Falling back to the previous translation result.`
                  );
                  await startGlossaryExtraction(); // Fallback
                }
              } else {
                await startGlossaryExtraction();
              }
            } else {
              await startGlossaryExtraction();
              addMessage(
                "system",
                "Glossary extracted from the previous translation."
              );
            }

            addMessage(
              "system",
              "Would you like to check for inconsistencies?",
              {
                actions: [
                  { label: "Yes", action: "confirm_inconsistency" },
                  { label: "No", action: "cancel" },
                ],
              }
            );
            setFlowState("AWAITING_INCONSISTENCY_CONFIRMATION");
          }
          break;
        case "confirm_inconsistency":
          if (flowState === "AWAITING_INCONSISTENCY_CONFIRMATION") {
            await startStandardizationAnalysis();
            addMessage("system", "Inconsistency check started.");
            setTimeout(() => {
              if (Object.keys(inconsistentTerms).length > 0) {
                addMessage(
                  "system",
                  "Inconsistencies found. Please review and select the correct standardizations in the panel below."
                );
                setFlowState("AWAITING_STANDARDIZATION_APPLY");
              } else {
                addMessage("system", "No inconsistencies found.");
                setFlowState("IDLE");
              }
            }, 1000); // Delay to allow state to update
          }
          break;
        case "apply_standardization":
          if (flowState === "AWAITING_STANDARDIZATION_APPLY") {
            await startApplyStandardization();
            addMessage(
              "system",
              "Applying standardizations and re-translating..."
            );
            setFlowState("IDLE");
          }
          break;
        case "cancel":
          addMessage("system", "Ok, let me know what you want to do next.");
          setFlowState("IDLE");
          break;
        default:
          break;
      }
    },
    [
      flowState,
      startGlossaryExtraction,
      startStandardizationAnalysis,
      startApplyStandardization,
      addMessage,
      inconsistentTerms,
      selectedText,
      selectedTextLineNumbers,
      getTranslatedTextForLine,
      extractGlossaryFromEditors,
    ]
  );

  return {
    handleSendMessage,
    handleAction,
    messages,
    clearHistory,
    messageCount,
  };
};
