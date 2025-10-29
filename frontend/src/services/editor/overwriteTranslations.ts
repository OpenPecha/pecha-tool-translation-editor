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

function getCharacterIndexForLine(lineIndex: number, lines: string[]): number {
	let characterIndex = 0;
	for (let i = 0; i < lineIndex && i < lines.length; i++) {
		characterIndex += lines[i].length + 1; // +1 for newline character
	}
	return characterIndex;
}

function getMaxLogicalLines(lines: string[]): number {
	return lines.filter(line => line.trim() !== "").length;
}

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

	// Import Delta class for delta operations
	const Delta = Quill.import("delta");

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

	// Create a batch delta for all changes to preserve formatting
	let batchDelta = new Delta();
	let linesOverwritten = 0;
	let placeholdersAdded = 0;
	let lastInsertedCharacterIndex = -1;

	// Handle empty editor case - need to create content structure
	if (isEditorEmpty && maxLineNumber > 0) {
		// For empty editor, create the initial structure with placeholders
		let initialContent = "";
		for (let i = 0; i < maxLineNumber; i++) {
			if (i > 0) initialContent += "\n";
			initialContent += placeholder;
			if (placeholder !== "") {
				placeholdersAdded++;
			}
		}
		// Insert initial structure
		batchDelta = batchDelta.insert(initialContent);
		
		// Update currentLines to reflect the new structure
		currentLines.length = 0;
		currentLines.push(...initialContent.split("\n"));
	}

	// Sort translations by logical line number to process them in order
	const sortedTranslations = Array.from(lineTranslations.entries()).sort((a, b) => a[0] - b[0]);

	// Process each translation using delta operations
	for (const [logicalLineNumber, translatedText] of sortedTranslations) {
		// Map logical line number to actual array index
		const arrayIndex = getArrayIndexForLogicalLine(logicalLineNumber, currentLines);

		if (arrayIndex >= 0 && arrayIndex < currentLines.length) {
			// Only overwrite if the target line is not a deliberate blank line
			const currentLine = currentLines[arrayIndex];
			if (currentLine.trim() !== "") {
				// Calculate character position for this line
				const lineStartIndex = getCharacterIndexForLine(arrayIndex, currentLines);
				const lineLength = currentLine.length;

				// Flatten multi-line translations to maintain line count
				const flattenedText = flattenTranslation(translatedText);

				// Create delta operation to replace this line while preserving formatting
				const lineDelta = new Delta()
					.retain(lineStartIndex) // Keep everything before this line
					.delete(lineLength) // Delete the current line content
					.insert(flattenedText); // Insert the new translation

				// Apply this delta operation
				targetEditor.updateContents(lineDelta, "user");

				// Update our tracking
				currentLines[arrayIndex] = flattenedText;
				linesOverwritten++;
				lastInsertedCharacterIndex = lineStartIndex + flattenedText.length;
			} else {
				console.warn(
					`Logical line ${logicalLineNumber} maps to a blank line (index ${arrayIndex}), skipping overwrite to preserve blank line`,
				);
			}
		} else if (logicalLineNumber > getMaxLogicalLines(currentLines)) {
			// Line number is higher than existing content - need to extend the editor
			const currentLogicalLines = getMaxLogicalLines(currentLines);
			const linesNeeded = logicalLineNumber - currentLogicalLines;

			// Calculate where to insert new content (at the end)
			const endPosition = targetEditor.getLength() - 1; // -1 to account for Quill's trailing newline

			// Create content to extend the editor
			let extensionContent = "";
			for (let i = 0; i < linesNeeded - 1; i++) {
				extensionContent += "\n" + placeholder;
				if (placeholder !== "") {
					placeholdersAdded++;
				}
			}

			// Add the final line with the translation
			const flattenedText = flattenTranslation(translatedText);
			extensionContent += "\n" + flattenedText;

			// Create delta to extend the editor
			const extensionDelta = new Delta()
				.retain(endPosition)
				.insert(extensionContent);

			// Apply the extension
			targetEditor.updateContents(extensionDelta, "user");

			// Update our tracking
			currentLines.push(...extensionContent.substring(1).split("\n")); // Remove first \n
			linesOverwritten++;
			lastInsertedCharacterIndex = endPosition + extensionContent.length;
		} else {
			console.warn(
				`Logical line number ${logicalLineNumber} could not be mapped to array index`,
			);
		}
	}

	// Focus the editor and position cursor at the end of the last inserted translation
	targetEditor.focus();

	if (lastInsertedCharacterIndex >= 0) {
		// Set cursor at the end of the last inserted translation
		targetEditor.setSelection(lastInsertedCharacterIndex, 0);
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
