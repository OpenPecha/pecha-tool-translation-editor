const express = require("express");
const {
  getTexts,
  getInstanceContent,
  getTextInstances,
  getAnnotations,
} = require("../apis/openpecha_api");
const router = express.Router();

/**
 * GET /openpecha/texts
 * @summary Get list of texts from OpenPecha
 * @tags Pecha - OpenPecha integration
 * @param {string} type.query - Filter by type (root, commentary, translations)
 * @return {array<object>} 200 - List of texts
 * @return {object} 400 - Bad request - Invalid type parameter
 * @return {object} 500 - Server error
 */
router.get("/texts", async (req, res) => {
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
    let texts;

    // Use getRootExpressions for root type
    texts = await getTexts(type);
    res.json(texts);
  } catch (error) {
    console.error("Error fetching texts:", error);
    res.status(500).json({
      error: "Failed to fetch texts",
      type: type,
      details: error.message,
    });
  }
});

/**
 * GET /openpecha/{id}/instances
 * @summary Get text instances for a specific text ID
 * @tags Pecha - OpenPecha integration
 * @param {string} id.path.required - Text ID
 * @return {array<object>} 200 - List of text instances
 * @return {object} 400 - Bad request - Text ID is required
 * @return {object} 404 - Text instance not found
 * @return {object} 500 - Server error
 */
router.get("/:id/instances", async (req, res) => {
  const text_id = req.params.id;
  if (!text_id) {
    return res.status(400).json({
      error: "Text ID is required",
    });
  }

  try {
    const instances = await getTextInstances(text_id);

    if (!instances) {
      return res.status(404).json({
        error: "Text instance not found",
        text_id: text_id,
      });
    }
    res.json(instances);
  } catch (error) {
    console.error("Error fetching instances:", error);

    // Handle specific error cases
    if (error.message.includes("404") || error.message.includes("not found")) {
      return res.status(404).json({
        error: "Text instance not found",
        text_id: text_id,
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
 * GET /openpecha/instances/{id}
 * @summary Get text content by text ID
 * @tags Pecha - OpenPecha integration
 * @param {string} id.path.required - Text ID
 * @return {object} 200 - Text content
 * @return {object} 400 - Bad request - Text ID is required
 * @return {object} 404 - Text not found
 * @return {object} 500 - Server error
 */
router.get("/instances/:id", async (req, res) => {
  const textId = req.params.id;

  if (!textId) {
    return res.status(400).json({
      error: "Text ID is required",
    });
  }

  try {
    const textContent = await getInstanceContent(textId);

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

/**
 * GET /openpecha/annotations/{id}
 * @summary Get annotations by annotation ID
 * @tags Pecha - OpenPecha integration
 * @param {string} id.path.required - Annotation ID
 * @return {object} 200 - Annotation content
 * @return {object} 400 - Bad request - Annotation ID is required
 * @return {object} 404 - Annotation not found
 * @return {object} 500 - Server error
 * 
 */
router.get("/annotations/:id", async (req, res) => {
  const annotationId = req.params.id;
  if (!annotationId) {
    return res.status(400).json({
      error: "Annotation ID is required",
    });
  }
  try {
    const annotations = await getAnnotations(annotationId);
    res.json(annotations);
  } catch (error) {
    console.error("Error fetching annotations:", error);
    res.status(500).json({
      error: "Failed to fetch annotations",
      id: annotationId,
      details: error.message,
    }); 
  }
});
module.exports = router;
