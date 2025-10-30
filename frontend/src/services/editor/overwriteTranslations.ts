
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

const getTextByLineNumber = (
    quill: Quill | null,
    lineNumber: number
  ): string | null => {
    if (!quill || lineNumber < 1) return null;
  
    const fullText = quill.getText();
    const fullTextLines = fullText.split("\n");
  
    let currentLineNumber = 1;
  
    for (let i = 0; i < fullTextLines.length; i++) {
      const lineText = fullTextLines[i];
  
      // Skip counting for leading/trailing empty lines
      if (!lineText.trim()) continue;
  
      if (currentLineNumber === lineNumber) {
        // Count number of consecutive empty lines *after* this line
        let noOfNewLines = 0;
        for (let j = i + 1; j < fullTextLines.length; j++) {
          if (fullTextLines[j].trim()) break;
          noOfNewLines++;
        }
  
        return lineText + '\n'.repeat(noOfNewLines);
      }
  
      currentLineNumber++;
    }
  
    return null; // Line number not found
  };

function flattenTranslation(text: string, quill: Quill, lineNumber: number): string {
	const data = getTextByLineNumber(quill, lineNumber);
	// Count newlines in the data to preserve formatting
	const newlineCount = data ? (data.match(/\n/g) || []).length : 0;
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.join(" ") + '\n'.repeat(newlineCount);
}

const LINE_PLACEHOLDER = "↩";

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
	sourceEditor: Quill,
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
						sourceEditor,
						lineNumber
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
		let initialContent = "";
		for (let i = 1; i <= maxLineNumber; i++) {
			if (i > 1) initialContent += "\n";
			
			initialContent += placeholder;
			placeholdersAdded++;
		}
		
		// Insert initial structure into the editor
		targetEditor.updateContents(batchDelta.insert(initialContent), "user");
		
		currentLines.length = 0;
		currentLines.push(...initialContent.split("\n"));
	}

	const sortedTranslations = Array.from(lineTranslations.entries()).sort((a, b) => a[0] - b[0]);

	// Process each translation using delta operations
	for (const [logicalLineNumber, translatedText] of sortedTranslations) {
		let arrayIndex: number;
		
		if (isEditorEmpty) {
			arrayIndex = logicalLineNumber - 1;
		} else {
			// Use the existing logic for non-empty editors
			arrayIndex = getArrayIndexForLogicalLine(logicalLineNumber, currentLines);
		}

		if (arrayIndex >= 0 && arrayIndex < currentLines.length) {
			// Calculate character position for this line
			const lineStartIndex = getCharacterIndexForLine(arrayIndex, currentLines);
			const currentLine = currentLines[arrayIndex];
			const lineLength = currentLine.length;

			// Flatten multi-line translations to maintain line count
			const flattenedText = flattenTranslation(translatedText, sourceEditor, logicalLineNumber);

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
			const flattenedText = flattenTranslation(translatedText, sourceEditor, logicalLineNumber);
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
