const express = require("express");
const {
  getExpressions,
  getText,
  getExpressionTexts,
} = require("../apis/openpecha_api");
const router = express.Router();

/**
 * GET /pecha/list
 * @summary Get a list of metadata filtered by type (root, commentary, translations)
 * @tags Pecha - Pecha document operations
 * @param {string} - Filter type: root, commentary, or translations
 * @return {array<object>} 200 - List of metadata filtered by type
 * @return {object} 400 - Bad request - Type parameter is required
 * @return {object} 500 - Server error - Failed to fetch metadata
 * @example response - Example response for type=root
 * [
 *   {
 *     "id": "root_001",
 *     "title": "Prajnaparamita Hridaya Sutra",
 *     "type": "root",
 *     "language": "sanskrit",
 *     "metadata": {
 *       "author": "Buddha",
 *       "category": "sutra",
 *       "period": "classical"
 *     }
 *   },
 *   {
 *     "id": "root_002",
 *     "title": "Vajracchedika Prajnaparamita Sutra",
 *     "type": "root",
 *     "language": "sanskrit",
 *     "metadata": {
 *       "author": "Buddha",
 *       "category": "sutra",
 *       "period": "classical"
 *     }
 *   }
 * ]
 */
router.get("/list", async (req, res) => {
  const { type } = req.query;

  // Validate type parameter
  const allowedTypes = ["root", "commentary", "translations"];
  if (type && !allowedTypes.includes(type)) {
    return res.status(400).json({
      error: "Invalid type parameter",
      allowedTypes: allowedTypes,
      provided: type,
    });
  }

  try {
    let metadata;

    // Use getRootExpressions for root type
    metadata = await getExpressions(type);
    let return_data = metadata.map((l) => {
      return {
        alt_title: l?.alt_titles,
        id: l?.id,
        title: l?.title,
        language: l?.language,
      };
    });

    res.json(return_data);
  } catch (error) {
    console.error("Error fetching metadata:", error);
    res.status(500).json({
      error: "Failed to fetch metadata",
      type: type,
      details: error.message,
    });
  }
});

/**
 * GET /pecha/{id}/texts
 * @summary Get manifestations for a specific expression ID
 * @tags Pecha - Pecha document operations
 * @param {string} id.path.required - Expression ID
 * @return {array<object>} 200 - List of manifestations for the expression
 * @return {object} 400 - Bad request - Expression ID is required
 * @return {object} 404 - Not found - Expression not found
 * @return {object} 500 - Server error - Failed to fetch manifestations
 * @example response - Example response
 * [
 *   {
 *     "id": "manifest_001",
 *     "expression_id": "expr_001",
 *     "type": "original",
 *     "language": "tibetan",
 *     "title": "Heart Sutra - Original Tibetan",
 *     "metadata": {
 *       "format": "traditional",
 *       "source": "derge_kangyur",
 *       "volume": 34,
 *       "folio": "144b-146a"
 *     }
 *   },
 *   {
 *     "id": "manifest_002",
 *     "expression_id": "expr_001",
 *     "type": "translation",
 *     "language": "english",
 *     "title": "Heart Sutra - English Translation",
 *     "metadata": {
 *       "translator": "Edward Conze",
 *       "year": 1958,
 *       "publisher": "Buddhist Society"
 *     }
 *   }
 * ]
 */
router.get("/:id/texts", async (req, res) => {
  const expressionId = req.params.id;
  if (!expressionId) {
    return res.status(400).json({
      error: "Expression ID is required",
    });
  }

  try {
    const manifestations = await getExpressionTexts(expressionId);

    if (!manifestations) {
      return res.status(404).json({
        error: "Expression not found",
        expression_id: expressionId,
      });
    }
    let return_data = manifestations.map((l) => {
      return {
        id: l?.id,
        expression_id: l?.expression,
        annotation: l?.annotations,
        type: l?.type,
      };
    });
    res.json(return_data);
  } catch (error) {
    console.error("Error fetching manifestations:", error);

    // Handle specific error cases
    if (error.message.includes("404") || error.message.includes("not found")) {
      return res.status(404).json({
        error: "Expression not found",
        expression_id: expressionId,
        details: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to fetch manifestations",
      expression_id: expressionId,
      details: error.message,
    });
  }
});

/**
 * GET /pecha/text/{id}
 * @summary Get serialized text content using text ID
 * @tags Pecha - Pecha document operations
 * @param {string} id.path.required - Text expression ID
 * @return {object} 200 - Serialized text content ready for translation
 * @return {object} 400 - Bad request - Text ID is required
 * @return {object} 404 - Not found - Text not found
 * @return {object} 500 - Server error - Failed to fetch text
 * @example response - Example response
 * {
 *   "id": "text_001",
 *   "content": "བཅོམ་ལྡན་འདས་མ་ཤེས་རབ་ཀྱི་ཕ་རོལ་ཏུ་ཕྱིན་པའི་སྙིང་པོ།",
 *   "metadata": {
 *     "language": "tibetan",
 *     "title": "Heart Sutra",
 *     "manifestation_type": "original"
 *   },
 *   "structure": {
 *     "segments": 42,
 *     "format": "plain_text"
 *   }
 * }
 */
router.get("/text/:id", async (req, res) => {
  const textId = req.params.id;

  if (!textId) {
    return res.status(400).json({
      error: "Text ID is required",
    });
  }

  try {
    const textContent = await getText(textId);

    if (!textContent) {
      return res.status(404).json({
        error: "Text not found",
        id: textId,
      });
    }

    res.json(textContent);
  } catch (error) {
    console.error("Error fetching text:", error);

    // Handle specific error cases
    if (error.message.includes("404") || error.message.includes("not found")) {
      return res.status(404).json({
        error: "Text not found",
        id: textId,
        details: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to fetch text content",
      id: textId,
      details: error.message,
    });
  }
});

module.exports = router;
