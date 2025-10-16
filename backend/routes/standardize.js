const express = require("express");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();

/**
 * @typedef {object} GlossaryTerm
 * @property {string} source_term.required - Source term in original language
 * @property {string} translated_term.required - Translated term
 */

/**
 * @typedef {object} StandardizationItem
 * @property {string} original_text.required - Original text content
 * @property {string} translated_text.required - Translated text content
 * @property {array<GlossaryTerm>} glossary.required - Array of glossary terms for this text pair
 */

/**
 * @typedef {object} StandardizationRequest
 * @property {array<StandardizationItem>} items.required - Array of text pairs with glossaries for analysis
 */

/**
 * @typedef {object} StandardizationResponse
 * @property {object} inconsistent_terms.required - Object with inconsistent terms as keys and arrays of different translations as values
 */

/**
 * POST /standardize/analyze
 * @summary Analyze translation consistency and identify inconsistent terms
 * @tags Standardization - Translation consistency analysis
 * @security BearerAuth
 * @param {StandardizationRequest} request.body.required - Standardization analysis request parameters
 * @return {StandardizationResponse} 200 - Analysis results with inconsistent terms
 * @return {object} 400 - Bad request - Invalid parameters or missing required fields
 * @return {object} 401 - Unauthorized - Authentication required
 * @return {object} 403 - Forbidden - Access denied to standardization services
 * @return {object} 500 - Server error - Standardization service unavailable or internal error
 * @example request - Example standardization analysis request
 * {
 *   "items": [
 *     {
 *       "original_text": "བྱང་ཆུབ་སེམས་དང་སེམས་དཔའ་རྣམས་ལ་ཕྱག་འཚལ་ལོ།",
 *       "translated_text": "Homage to the mind of enlightenment and the bodhisattvas.",
 *       "glossary": [
 *         {
 *           "source_term": "བྱང་ཆུབ་སེམས",
 *           "translated_term": "mind of enlightenment"
 *         },
 *         {
 *           "source_term": "སེམས་དཔའ",
 *           "translated_term": "bodhisattva"
 *         }
 *       ]
 *     },
 *     {
 *       "original_text": "བྱང་ཆུབ་སེམས་ནི་དཀོན་མཆོག་གསུམ་གྱི་གཞི་ཡིན།",
 *       "translated_text": "The enlightenment mind is the foundation of the Three Jewels.",
 *       "glossary": [
 *         {
 *           "source_term": "བྱང་ཆུབ་སེམས",
 *           "translated_term": "enlightenment mind"
 *         }
 *       ]
 *     }
 *   ]
 * }
 * @example response - Example analysis response
 * {
 *   "inconsistent_terms": {
 *     "བྱང་ཆུབ་སེམས": [
 *       "mind of enlightenment",
 *       "enlightenment mind"
 *     ]
 *   }
 * }
 */
router.post("/analyze", authenticate, async (req, res) => {
	try {
		const { items } = req.body;

		// Validate required fields
		if (!items || !Array.isArray(items) || items.length === 0) {
			return res
				.status(400)
				.json({ error: "items array is required and cannot be empty" });
		}

		// Validate items structure
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (!item.original_text || !item.translated_text || !item.glossary) {
				return res.status(400).json({
					error: `Item at index ${i} is missing required fields: original_text, translated_text, and glossary are required`,
				});
			}

			if (!Array.isArray(item.glossary)) {
				return res.status(400).json({
					error: `Item at index ${i} has invalid glossary field: must be an array`,
				});
			}

			// Validate glossary terms
			for (let j = 0; j < item.glossary.length; j++) {
				const term = item.glossary[j];
				if (!term.source_term || !term.translated_term) {
					return res.status(400).json({
						error: `Item at index ${i}, glossary term at index ${j} is missing required fields: source_term and translated_term are required`,
					});
				}
			}
		}

		// Prepare the request payload for the external API
		const requestPayload = { items };

		try {
			const response = await fetch(
				process.env.TRANSLATE_API_URL + "/standardize/analyze",
				{
					method: "POST",
					headers: {
						accept: "application/json",
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestPayload),
				},
			);

			if (!response.ok) {
				console.error(
					"External Standardization API error:",
					response.status,
					response.statusText,
				);
				const errorText = await response.text();

				return res.status(response.status).json({
					error: `External standardization API error: ${response.statusText}`,
					details: errorText,
				});
			}

			const result = await response.json();

			// Return the standardization analysis result
			res.json(result);
		} catch (fetchError) {
			console.error("Error connecting to standardization API:", fetchError);

			let errorMessage = "Standardization service unavailable";
			let errorDetails =
				"Unable to connect to the external standardization API";

			if (fetchError.name === "AbortError") {
				errorMessage = "Standardization API request timed out";
				errorDetails =
					"The external standardization service did not respond in time";
			}

			return res.status(503).json({
				error: errorMessage,
				details: errorDetails,
			});
		}
	} catch (error) {
		console.error("Error in standardization analysis:", error);

		res.status(500).json({
			error: "Internal server error during standardization analysis",
			details: error.message,
		});
	}
});

module.exports = router;
