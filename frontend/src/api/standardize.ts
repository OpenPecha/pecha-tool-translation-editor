import { getHeaders } from "./utils";

const server_url = import.meta.env.VITE_SERVER_URL;

// Standardization interfaces
export interface GlossaryTerm {
	source_term: string;
	translated_term: string;
}

export interface StandardizationItem {
	original_text: string;
	translated_text: string;
	glossary: GlossaryTerm[];
}

export interface StandardizationRequest {
	items: StandardizationItem[];
}

export interface InconsistentTerms {
	[sourceTerm: string]: string[]; // source term -> array of different translations
}

export interface StandardizationResponse {
	inconsistent_terms: InconsistentTerms;
}

/**
 * Analyzes translation consistency and identifies inconsistent terms
 * Returns a map of source terms to their different translations
 */
export const analyzeStandardization = async (
	params: StandardizationRequest,
): Promise<StandardizationResponse> => {
	try {
		const response = await fetch(`${server_url}/standardize/analyze`, {
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
						errorData.error ?? "Invalid standardization request parameters.",
					);
				} catch {
					throw new Error("Invalid standardization request parameters.");
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
							`Standardization request failed with status ${response.status}`,
					);
				} catch {
					throw new Error(
						`Standardization request failed with status ${response.status}`,
					);
				}
			}
		}

		const result = await response.json();
		return result as StandardizationResponse;
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error("Failed to analyze standardization");
	}
};

/**
 * Validates standardization parameters
 */
export const validateStandardizationParams = (
	params: StandardizationRequest,
): void => {
	if (
		!params.items ||
		!Array.isArray(params.items) ||
		params.items.length === 0
	) {
		throw new Error(
			"At least one item is required for standardization analysis",
		);
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
};

/**
 * Complete standardization analysis function with validation and error handling
 */
export const performStandardizationAnalysis = async (
	params: StandardizationRequest,
): Promise<StandardizationResponse> => {
	try {
		// Validate parameters before starting
		validateStandardizationParams(params);

		console.log("Starting standardization analysis:", {
			itemCount: params.items.length,
			totalGlossaryTerms: params.items.reduce(
				(sum, item) => sum + item.glossary.length,
				0,
			),
		});

		const result = await analyzeStandardization(params);

		console.log("Standardization analysis completed:", {
			inconsistentTermsCount: Object.keys(result.inconsistent_terms).length,
			inconsistentTerms: result.inconsistent_terms,
		});

		return result;
	} catch (error) {
		const errorObj =
			error instanceof Error
				? error
				: new Error("Standardization analysis failed unexpectedly");

		console.error("Standardization analysis error:", errorObj.message);
		throw errorObj;
	}
};

/**
 * Helper function to count total inconsistencies
 */
export const countInconsistencies = (
	inconsistentTerms: InconsistentTerms,
): number => {
	return Object.keys(inconsistentTerms).length;
};

/**
 * Helper function to get the most frequent translation for a term
 */
export const getMostFrequentTranslation = (translations: string[]): string => {
	if (translations.length === 0) return "";
	if (translations.length === 1) return translations[0];

	// Count frequency of each translation
	const frequency: Record<string, number> = {};
	translations.forEach((translation) => {
		frequency[translation] = (frequency[translation] || 0) + 1;
	});

	// Return the most frequent one
	return Object.entries(frequency).sort(([, a], [, b]) => b - a)[0][0];
};

/**
 * Helper function to format inconsistencies for display
 */
export const formatInconsistenciesForDisplay = (
	inconsistentTerms: InconsistentTerms,
): Array<{
	sourceTerm: string;
	translations: string[];
	suggestedTranslation: string;
	inconsistencyCount: number;
}> => {
	return Object.entries(inconsistentTerms).map(
		([sourceTerm, translations]) => ({
			sourceTerm,
			translations,
			suggestedTranslation: getMostFrequentTranslation(translations),
			inconsistencyCount: translations.length,
		}),
	);
};
