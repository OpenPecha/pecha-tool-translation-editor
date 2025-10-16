/**
 * Utility function for overwriting AI-generated translations into the editor
 * while preserving line structure and total line count
 */

import Quill from "quill";

export interface TranslationResult {
	id: string;
	originalText: string;
	translatedText: string;
	timestamp: string;
	metadata?: {
		batch_id?: string;
		model_used?: string;
		text_type?: string;
	};
	previousTranslatedText?: string;
	isUpdated?: boolean;
	lineNumbers?: Record<string, { from: number; to: number }> | null;
}

export interface OverwriteResult {
	success: boolean;
	message: string;
	linesOverwritten: number;
	placeholdersAdded?: number;
}

export interface OverwriteOptions {
	placeholderType?: "emoji" | "invisible" | "none";
	customPlaceholder?: string;
}

/**
 * Flattens multi-line translations into a single line by replacing newlines with spaces
 * @param text - The text to flatten
 * @returns The flattened text
 */
function flattenTranslation(text: string): string {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.join(" ");
}

const LINE_PLACEHOLDER = "↩";

/**
 * Gets the appropriate placeholder text based on options
 * @param options - Configuration options for placeholder behavior
 * @returns The placeholder string to use
 */
function getPlaceholder(options: OverwriteOptions = {}): string {
	const { placeholderType = "emoji", customPlaceholder } = options;

	if (customPlaceholder) return customPlaceholder;

	switch (placeholderType) {
		case "emoji":
			return LINE_PLACEHOLDER;
		case "invisible":
			return "\u00A0"; // Non-breaking space
		case "none":
			return "";
		default:
			return LINE_PLACEHOLDER;
	}
}

/**
 * Creates a mapping between logical line numbers (counting only non-empty content)
 * and array indices (including blank lines)
 * @param lines - Array of strings representing editor content
 * @returns Map from logical line number (1-based) to array index (0-based)
 */
function createLogicalLineToIndexMapping(lines: string[]): Map<number, number> {
	const mapping = new Map<number, number>();
	let logicalLineNumber = 1;

	for (let arrayIndex = 0; arrayIndex < lines.length; arrayIndex++) {
		const line = lines[arrayIndex];
		// Only count non-empty lines as logical lines (consistent with LineNumbers component)
		if (line.trim() !== "") {
			mapping.set(logicalLineNumber, arrayIndex);
			logicalLineNumber++;
		}
	}

	return mapping;
}

/**
 * Gets the array index for a given logical line number
 * @param logicalLineNumber - 1-based logical line number (counting only non-empty lines)
 * @param lines - Array of strings representing editor content
 * @returns Array index (0-based) or -1 if not found
 */
function getArrayIndexForLogicalLine(
	logicalLineNumber: number,
	lines: string[],
): number {
	const mapping = createLogicalLineToIndexMapping(lines);
	return mapping.get(logicalLineNumber) ?? -1;
}

/**
 * Overwrites AI-generated translations into the translation editor at their specific logical line numbers
 *
 * IMPORTANT: This function uses LOGICAL line numbering, which means:
 * - Only non-empty lines are counted for line numbering (consistent with LineNumbers component)
 * - Blank lines ("") are preserved in their exact positions and never overwritten
 * - Translation line numbers refer to the Nth non-empty line, not array indices
 *
 * Example:
 * Editor content: ["Hello", "", "World", "", "Test"]
 * Logical lines:  [1=Hello, 2=World, 3=Test] (blanks are skipped)
 * Translation for logical line 2 will overwrite "World", not the first blank line
 *
 * @param targetEditor - The Quill editor instance to modify
 * @param translationResults - Array of translation results with logical line number mappings
 * @param options - Configuration options for the overwrite behavior
 * @returns Result object with success status and details
 */
export function overwriteAllTranslations(
	targetEditor: Quill,
	translationResults: TranslationResult[],
	options: OverwriteOptions = {},
): OverwriteResult {
	if (!targetEditor) {
		return {
			success: false,
			message: "No editor found for this document.",
			linesOverwritten: 0,
		};
	}

	if (!translationResults || translationResults.length === 0) {
		return {
			success: false,
			message: "No translation results provided.",
			linesOverwritten: 0,
		};
	}

	// Extract line number mappings from translation results
	const lineTranslations = new Map<number, string>();
	let maxLineNumber = 0;
	translationResults.forEach((result) => {
		if (result.lineNumbers) {
			const lineRanges = Object.entries(result.lineNumbers);
			if (lineRanges.length > 0) {
				const [lineKey] = lineRanges[0];
				const lineNumber = parseInt(lineKey);

				if (!isNaN(lineNumber) && lineNumber > 0) {
					// Flatten multi-line translations to maintain line count
					const flattenedTranslation = flattenTranslation(
						result.translatedText,
					);
					lineTranslations.set(lineNumber, flattenedTranslation);
					maxLineNumber = Math.max(maxLineNumber, lineNumber);
				}
			}
		}
	});

	if (lineTranslations.size === 0) {
		return {
			success: false,
			message:
				"No line number mapping found for translation results. Please try again after running translation on selected lines.",
			linesOverwritten: 0,
		};
	}

	// Get current editor content
	const currentText = targetEditor.getText();
	const currentLines = currentText.split("\n");

	// Remove the trailing empty line that Quill automatically adds, but preserve internal empty lines
	if (currentLines.length > 0 && currentLines[currentLines.length - 1] === "") {
		currentLines.pop();
	}

	// Get the placeholder to use for empty lines
	const placeholder = getPlaceholder(options);

	// Determine if the editor is empty or has meaningful content
	const isEditorEmpty =
		currentLines.length <= 1 &&
		(currentLines[0] === "" || currentLines[0]?.trim() === "");

	// Create target lines array
	const targetLines: string[] = [];
	let placeholdersAdded = 0;

	if (isEditorEmpty) {
		// For empty editor: Create minimal array to accommodate logical line numbers
		// Since we're starting with an empty editor, logical line positions map directly to array indices
		// We only need to create as many lines as the highest logical line number
		for (let i = 0; i < maxLineNumber; i++) {
			targetLines[i] = placeholder;
			if (placeholder !== "") {
				placeholdersAdded++;
			}
		}
	} else {
		// For non-empty editor: Preserve ALL existing content exactly as is
		// We don't need to extend beyond current content since we're mapping logical lines
		for (let i = 0; i < currentLines.length; i++) {
			// Use existing content - preserve all lines (including blank lines) exactly as they are
			targetLines[i] = currentLines[i];
		}
	}

	// Overwrite only the specific lines with translation results
	// Note: lineNumber refers to logical line numbers (counting only non-empty content)
	let linesOverwritten = 0;
	let lastInsertedLineIndex = -1; // Track the last line where we inserted content

	lineTranslations.forEach((translatedText, logicalLineNumber) => {
		// Map logical line number to actual array index
		const arrayIndex = getArrayIndexForLogicalLine(
			logicalLineNumber,
			targetLines,
		);

		if (arrayIndex >= 0 && arrayIndex < targetLines.length) {
			// Only overwrite if the target line is not a deliberate blank line
			// (blank lines in targetLines would be empty strings "", not whitespace-only)
			const currentLine = targetLines[arrayIndex];
			if (currentLine.trim() !== "") {
				// Flatten multi-line translations to maintain line count
				const flattenedText = flattenTranslation(translatedText);
				targetLines[arrayIndex] = flattenedText;
				linesOverwritten++;
				lastInsertedLineIndex = arrayIndex;
			} else {
				console.warn(
					`Logical line ${logicalLineNumber} maps to a blank line (index ${arrayIndex}), skipping overwrite to preserve blank line`,
				);
			}
		} else {
			// Line number is higher than existing content - need to extend the editor
			if (isEditorEmpty) {
				// In empty editor, we can safely add content at the logical line position
				// Extend targetLines if necessary to accommodate the translation
				while (targetLines.length < logicalLineNumber) {
					targetLines.push(placeholder);
					if (placeholder !== "") {
						placeholdersAdded++;
					}
				}
				// Place translation at the correct logical position (convert to 0-based index)
				const targetIndex = logicalLineNumber - 1;
				if (targetIndex >= 0) {
					const flattenedText = flattenTranslation(translatedText);
					targetLines[targetIndex] = flattenedText;
					linesOverwritten++;
					lastInsertedLineIndex = targetIndex;
				}
			} else {
				// For non-empty editor, we need to extend with placeholders to reach the target logical line
				// First, count how many logical lines we currently have
				const currentLogicalLines =
					createLogicalLineToIndexMapping(targetLines).size;

				// If the target logical line number is higher than what we have, extend the editor
				if (logicalLineNumber > currentLogicalLines) {
					// Add placeholders until we can accommodate the target logical line
					while (
						createLogicalLineToIndexMapping(targetLines).size <
						logicalLineNumber
					) {
						targetLines.push(placeholder);
						if (placeholder !== "") {
							placeholdersAdded++;
						}
					}

					// Now try to map the logical line number again
					const newArrayIndex = getArrayIndexForLogicalLine(
						logicalLineNumber,
						targetLines,
					);
					if (newArrayIndex >= 0 && newArrayIndex < targetLines.length) {
						const flattenedText = flattenTranslation(translatedText);
						targetLines[newArrayIndex] = flattenedText;
						linesOverwritten++;
						lastInsertedLineIndex = newArrayIndex;
					}
				} else {
					console.warn(
						`Logical line number ${logicalLineNumber} could not be mapped to array index in non-empty editor`,
					);
				}
			}
		}
	});

	// Set the new text content while preserving line count
	const newContent = targetLines.join("\n");
	targetEditor.setText(newContent, "user");

	// Focus the editor and position cursor at the end of the inserted translation
	targetEditor.focus();

	if (
		lastInsertedLineIndex >= 0 &&
		lastInsertedLineIndex < targetLines.length
	) {
		// Calculate the cursor position at the end of the inserted line
		let cursorPosition = 0;

		// Add the length of all lines before the inserted line (including newlines)
		for (let i = 0; i < lastInsertedLineIndex; i++) {
			cursorPosition += targetLines[i].length + 1; // +1 for the newline character
		}

		// Add the length of the inserted line itself
		cursorPosition += targetLines[lastInsertedLineIndex].length;

		// Set cursor at the end of the inserted translation
		targetEditor.setSelection(cursorPosition, 0);
	} else {
		// Fallback: position cursor at the end of the document
		const finalLength = targetEditor.getLength();
		targetEditor.setSelection(finalLength - 1, 0);
	}

	const baseMessage = `Successfully overwritten ${linesOverwritten} line${linesOverwritten === 1 ? "" : "s"}`;
	const placeholderMessage =
		placeholdersAdded > 0
			? ` (${placeholdersAdded} placeholder${placeholdersAdded === 1 ? "" : "s"} added for line numbering)`
			: "";

	return {
		success: true,
		message: baseMessage + placeholderMessage + ".",
		linesOverwritten,
		placeholdersAdded,
	};
}

/**
 * Validates that translation results have proper line number mappings
 * @param translationResults - Array of translation results to validate
 * @returns True if valid, false otherwise
 */
export function validateTranslationResults(
	translationResults: TranslationResult[],
): boolean {
	return translationResults.some(
		(result) =>
			result.lineNumbers && Object.keys(result.lineNumbers).length > 0,
	);
}

/**
 * Gets a summary of which lines will be overwritten
 * @param translationResults - Array of translation results
 * @returns Array of line numbers that will be overwritten
 */
export function getOverwritePreview(
	translationResults: TranslationResult[],
): number[] {
	const lineNumbers: number[] = [];

	translationResults.forEach((result) => {
		if (result.lineNumbers) {
			const lineRanges = Object.entries(result.lineNumbers);
			if (lineRanges.length > 0) {
				const [lineKey] = lineRanges[0];
				const lineNumber = parseInt(lineKey);

				if (!isNaN(lineNumber) && lineNumber > 0) {
					lineNumbers.push(lineNumber);
				}
			}
		}
	});

	return lineNumbers.sort((a, b) => a - b);
}
