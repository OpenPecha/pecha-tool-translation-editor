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
		getTranslatedTextForLine,
		selectedTextLineNumbers,
		extractGlossaryFromEditors,
	} = useTranslationSidebar();

	const initiateTranslationFlow = useCallback(async (): Promise<CommandResult> => {
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

		const firstLineNumber = lineNumbers[0];
		const translatedText = getTranslatedTextForLine(firstLineNumber);

		if (!translatedText) {
			return {
				success: false,
				message: `Could not find a corresponding translation for the selected text on line ${firstLineNumber}. Please ensure a translation exists.`,
				error: "No translated text",
			};
		}

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
		[initiateTranslationFlow, initiateGlossaryFlow],
	);

	return {
		processInput,
	};
};
