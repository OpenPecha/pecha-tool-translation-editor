const PERSON_ID = process.env.PERSON_ID;
const express = require("express");
const {
  getTexts,
  getInstanceContent,
  getTextInstances,
  getAnnotations,
  uploadTranslationToOpenpecha,
  } = require("../apis/openpecha_api");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


const router = express.Router();

/**
 * GET /openpecha/texts
 * @summary Get list of texts from OpenPecha
 * @tags Pecha - OpenPecha integration
 * @param {string} type.query - Filter by type (root, commentary, translations)
 * @param {number} limit.query - Limit number of texts returned
 * @param {number} offset.query - Offset for pagination
 * @param {string} language.query - Filter by language
 * @return {array<object>} 200 - List of texts
 * @return {object} 400 - Bad request - Invalid type parameter
 * @return {object} 500 - Server error
 */
router.get("/texts", async (req, res) => {
  const { type, limit, offset, language } = req.query;

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
    const texts = await getTexts(type, limit, offset, language);
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

/**
 * POST /openpecha/instances/{instance_id}/translation
 * @summary Upload translation to OpenPecha
 * @tags Pecha - OpenPecha integration
 * @param {string} instance_id.path.required - Instance ID
 * @param {object} request.body.required - Translation information
 * @param {string} request.body.language - Language of the translation
 * @param {string} request.body.content - Content of the translation
 * @param {string} request.body.title - Title of the translation
 * @param {array<object>} request.body.segmentation - Segmentation of the translation
 * @param {array<object>} request.body.target_annotation - Target annotation spans
 * @param {array<object>} request.body.alignment_annotation - Alignment annotation spans
 * @return {object} 200 - Translation uploaded successfully
 * @return {object} 400 - Bad request - Instance ID, root document ID, and translation document ID are required
 * @return {object} 500 - Server error
 * @example request - Upload translation request
 * {
 *   "language": "en",
 *   "content": "This is a translation of the root text",
 *   "title": "Translation of the root text",
 *   "segmentation": [{"start": 0, "end": 20}],
 *   "target_annotation": [{"span": {"start": 0, "end": 20}, "index": 0}],
 *   "alignment_annotation": [{"span": {"start": 0, "end": 20}, "index": 0, "alignment_index": [0]}]
 * }
 * @example response - 200 - Success response
 * {
 *   "success": true,
 *   "message": "Translation uploaded successfully",
 *   "translation_id": "title-1234567890"
 * }
 */


router.post("/instances/:instance_id/translation/:translation_doc_id", async (req, res) => {
  const { instance_id, translation_doc_id } = req.params;
  if (!instance_id) {
    return res.status(400).json({
      error: "Instance ID is required",
      details: "Missing instance_id parameter",
    });
  }
  
  if (!translation_doc_id) {
    return res.status(400).json({
      error: "Translation document ID is required",
      details: "Missing translation_doc_id parameter",
    });
  }
  const requiredFields = [
    "language",
    "content",
    "title",
    "segmentation",
    "target_annotation",
    "alignment_annotation",
  ];
  const missingField = requiredFields.find(field => !req.body[field]);
  if (missingField) {
    return res.status(400).json({
      error: `${missingField.replace(/_/g, " ")} is required`,
      instance_id,
      details: `Missing required field: ${missingField}`,
    });
  }
  const translationData = {
    ...req.body,
    author: {
      "person_id": PERSON_ID,
    },
  };
  try {
    const translation = await uploadTranslationToOpenpecha(instance_id, translationData);
    await prisma.docMetadata.create({
      data: {
        docId: translation_doc_id,
        instanceId: translation.instance_id,
        textId: translation.text_id,
      },
    });
    res.json({
      success: true,
      message: "Translation uploaded successfully",
      data: translation,
    });
  } catch (error) {
    console.error("Error uploading translation:", error);
    res.status(500).json({
      error: "Failed to upload translation",
      instance_id,
      details: error.message,
    });
  }
});

module.exports = router;
