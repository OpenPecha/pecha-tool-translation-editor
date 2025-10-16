import { getHeaders } from "./utils";

const server_url = import.meta.env.VITE_SERVER_URL;

// Apply standardization interfaces
export interface GlossaryTerm {
	source_term: string;
	translated_term: string;
}

export interface StandardizationItem {
	original_text: string;
	translated_text: string;
	glossary: GlossaryTerm[];
}

export interface StandardizationPair {
	source_word: string;
	standardized_translation: string;
}

export interface ApplyStandardizationParams {
	items: StandardizationItem[];
	standardization_pairs: StandardizationPair[];
	model_name: string;
	user_rules?: string;
}

// Apply standardization streaming event types
export interface InitializationEvent {
	type: "initialization";
	timestamp: string;
	total_items: number;
	message: string;
}

export interface PlanningEvent {
	type: "planning";
	timestamp: string;
	total_batches: number;
	batch_size: number;
	message: string;
}

export interface RetranslationStartEvent {
	type: "retranslation_start";
	timestamp: string;
	index: number;
	status: "processing";
	message: string;
}

export interface RetranslationCompletedEvent {
	type: "retranslation_completed";
	timestamp: string;
	status: "item_updated";
	index: number;
	updated_item: StandardizationItem;
	message?: string;
}

export interface CompletionEvent {
	type: "completion";
	timestamp: string;
	total_completed: number;
	status: "completed";
	message: string;
}

export interface ErrorEvent {
	type: "error";
	timestamp: string;
	status: "failed";
	message: string;
	details?: string;
	error?: string;
}

export type ApplyStandardizationStreamEvent =
	| InitializationEvent
	| PlanningEvent
	| RetranslationStartEvent
	| RetranslationCompletedEvent
	| CompletionEvent
	| ErrorEvent;

/**
 * Makes the fetch request for apply standardization streaming
 */
export const streamApplyStandardization = async (
	params: ApplyStandardizationParams,
): Promise<Response> => {
	const response = await fetch(`${server_url}/standardize/apply/stream`, {
		method: "POST",
		headers: getHeaders(),
		body: JSON.stringify(params),
	});

	if (!response.ok) {
		// Handle different types of HTTP errors
		if (response.status === 401) {
			throw new Error("Authentication failed. Please log in again.");
		} else if (response.status === 403) {
			throw new Error(
				"Access denied. You don't have permission to use standardization services.",
			);
		} else if (response.status === 400) {
			try {
				const errorData = await response.json();
				throw new Error(
					errorData.error ?? "Invalid standardization application parameters.",
				);
			} catch {
				throw new Error("Invalid standardization application parameters.");
			}
		} else if (response.status >= 500) {
			throw new Error(
				"Standardization service is temporarily unavailable. Please try again later.",
			);
		} else {
			try {
				const errorData = await response.json();
				throw new Error(
					errorData.error ??
						`Standardization application failed with status ${response.status}`,
				);
			} catch {
				throw new Error(
					`Standardization application failed with status ${response.status}`,
				);
			}
		}
	}

	return response;
};

/**
 * Consumes the standardization application stream and parses events
 */
export const consumeApplyStandardizationStream = async (
	response: Response,
	onEvent: (event: ApplyStandardizationStreamEvent) => void,
	signal?: AbortSignal,
): Promise<void> => {
	if (!response.body) {
		throw new Error("No response body available for streaming");
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	try {
		while (true) {
			// Check if request was aborted
			if (signal?.aborted) {
				break;
			}

			const { done, value } = await reader.read();

			if (done) {
				break;
			}

			// Decode chunk and add to buffer
			buffer += decoder.decode(value, { stream: true });

			// Process complete lines
			const lines = buffer.split("\n");
			buffer = lines.pop() || ""; // Keep the last incomplete line in buffer

			for (const line of lines) {
				const trimmedLine = line.trim();
				if (!trimmedLine) continue;

				// Extract event data from SSE format
				let eventData = "";
				if (trimmedLine.startsWith("data: ")) {
					eventData = trimmedLine.substring(6).trim();
				} else if (trimmedLine.startsWith("data:")) {
					eventData = trimmedLine.substring(5).trim();
				}

				if (!eventData) continue;

				// Handle multiple JSON objects or fragments in eventData
				if (eventData.startsWith("{") && eventData.endsWith("}")) {
					try {
						// Single complete JSON object
						const parsedEvent = JSON.parse(
							eventData,
						) as ApplyStandardizationStreamEvent;

						// Handle error events immediately
						if (parsedEvent.type === "error") {
							const error = new Error(
								`Standardization error: ${
									parsedEvent.message || parsedEvent.error
								}`,
							);
							throw error;
						}

						// Call the event handler with the parsed event
						onEvent(parsedEvent);
					} catch (parseError) {
						console.warn(
							"Failed to parse complete JSON event:",
							parseError,
							"Raw eventData:",
							eventData,
						);
					}
				} else {
					// Handle partial or malformed JSON using a more robust approach
					try {
						// Try to fix common SSE formatting issues
						let cleanedData = eventData;

						// Remove duplicate "data: " prefixes that sometimes occur
						if (cleanedData.includes("data: ")) {
							cleanedData = cleanedData.replace(/data:\s*/g, "");
						}

						// Try to parse after cleaning
						if (cleanedData.startsWith("{")) {
							const parsedEvent = JSON.parse(
								cleanedData,
							) as ApplyStandardizationStreamEvent;

							// Handle error events immediately
							if (parsedEvent.type === "error") {
								const error = new Error(
									`Standardization error: ${
										parsedEvent.message || parsedEvent.error
									}`,
								);
								throw error;
							}

							// Call the event handler with the parsed event
							onEvent(parsedEvent);
						} else {
							console.warn("Skipping non-JSON event data:", eventData);
						}
					} catch (parseError) {
						console.warn(
							"Failed to parse standardization streaming event:",
							parseError,
							"Raw line:",
							line,
							"Extracted eventData:",
							eventData,
						);

						// Check for authentication errors in raw text
						if (
							line.toLowerCase().includes("authentication") ||
							line.toLowerCase().includes("unauthorized") ||
							line.toLowerCase().includes("401")
						) {
							const error = new Error(
								"Authentication error during standardization. Please log in again.",
							);
							throw error;
						}
					}
				}
			}
		}
	} catch (error) {
		// Handle abort errors gracefully
		if (error instanceof Error && error.name === "AbortError") {
			return; // Exit silently on abort
		}

		const errorObj =
			error instanceof Error
				? error
				: new Error("Unknown streaming error occurred during standardization");
		throw errorObj;
	} finally {
		reader.releaseLock();
	}
};

/**
 * Validates apply standardization parameters
 */
export const validateApplyStandardizationParams = (
	params: ApplyStandardizationParams,
): void => {
	if (
		!params.items ||
		!Array.isArray(params.items) ||
		params.items.length === 0
	) {
		throw new Error(
			"At least one item is required for standardization application",
		);
	}

	if (
		!params.standardization_pairs ||
		!Array.isArray(params.standardization_pairs) ||
		params.standardization_pairs.length === 0
	) {
		throw new Error("At least one standardization pair is required");
	}

	if (!params.model_name || params.model_name.trim() === "") {
		throw new Error("Model name is required");
	}

	// Check for valid items
	const hasInvalidItems = params.items.some(
		(item) =>
			!item.original_text ||
			!item.translated_text ||
			!item.glossary ||
			!Array.isArray(item.glossary) ||
			item.original_text.trim() === "" ||
			item.translated_text.trim() === "",
	);
	if (hasInvalidItems) {
		throw new Error(
			"All items must have non-empty original_text, translated_text, and glossary array",
		);
	}

	// Check for valid glossary terms
	const hasInvalidGlossaryTerms = params.items.some((item) =>
		item.glossary.some(
			(term) =>
				!term.source_term ||
				!term.translated_term ||
				term.source_term.trim() === "" ||
				term.translated_term.trim() === "",
		),
	);
	if (hasInvalidGlossaryTerms) {
		throw new Error(
			"All glossary terms must have non-empty source_term and translated_term",
		);
	}

	// Check for valid standardization pairs
	const hasInvalidPairs = params.standardization_pairs.some(
		(pair) =>
			!pair.source_word ||
			!pair.standardized_translation ||
			pair.source_word.trim() === "" ||
			pair.standardized_translation.trim() === "",
	);
	if (hasInvalidPairs) {
		throw new Error(
			"All standardization pairs must have non-empty source_word and standardized_translation",
		);
	}
};

/**
 * Complete apply standardization function with validation and error handling
 */
export const performStreamingApplyStandardization = async (
	params: ApplyStandardizationParams,
	onEvent: (event: ApplyStandardizationStreamEvent) => void,
	onComplete: () => void,
	onError: (error: Error) => void,
	signal?: AbortSignal,
): Promise<void> => {
	try {
		// Validate parameters before starting
		validateApplyStandardizationParams(params);

		console.log("Starting standardization application:", {
			itemCount: params.items.length,
			standardizationPairCount: params.standardization_pairs.length,
			modelName: params.model_name,
		});

		const response = await streamApplyStandardization(params);

		await consumeApplyStandardizationStream(response, onEvent, signal);

		console.log("Standardization application stream completed");
		onComplete();
	} catch (error) {
		const errorObj =
			error instanceof Error
				? error
				: new Error("Standardization application failed unexpectedly");

		console.error("Standardization application error:", errorObj.message);
		onError(errorObj);
	}
};

/**
 * Helper function to create standardization pairs from inconsistent terms
 */
export const createStandardizationPairs = (
	inconsistentTerms: Record<string, string[]>,
): StandardizationPair[] => {
	return Object.entries(inconsistentTerms).map(
		([sourceWord, translations]) => ({
			source_word: sourceWord,
			// Use the first translation as the standardized one (could be enhanced with user selection)
			standardized_translation: translations[0],
		}),
	);
};

/**
 * Helper function to count total retranslations needed
 */
export const countRetranslationItems = (
	params: ApplyStandardizationParams,
): number => {
	return params.items.length;
};
