const express = require("express");
const router = express.Router();

/**
 * GET /models
 * @summary Get list of available AI models
 * @tags Models - AI model management
 * @return {object} 200 - List of available models with details
 * @return {object} 500 - Server error
 * @example response - Example models response
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "value": "claude-sonnet-4-20250514",
 *       "name": "Claude Sonnet 4.0 (2025-05-14)",
 *       "provider": "Anthropic",
 *       "capabilities": ["text", "reasoning", "translation"],
 *       "contextWindow": 200000
 *     }
 *   ]
 * }
 */
router.get("", async (req, res) => {
  try {
    const response = await fetch(process.env.TRANSLATE_API_URL + "/models", {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });

    const rawModels = await response.json();

    // Transform the object-based response to an array format expected by frontend
    const transformedModels = Object.entries(rawModels).map(
      ([key, modelData]) => ({
        value: key, // The model ID (e.g., "claude-sonnet-4-20250514")
        name: modelData.description, // The human-readable description
        provider: modelData.provider,
        capabilities: modelData.capabilities,
        contextWindow: modelData.context_window,
      })
    );

    return res.json({
      success: true,
      data: transformedModels,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch models",
      error: error.message,
    });
  }
});

module.exports = router;
