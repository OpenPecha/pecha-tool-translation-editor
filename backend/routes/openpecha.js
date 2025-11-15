const PERSON_ID = process.env.PERSON_ID;
const express = require("express");
const {
  getTexts,
  getInstanceContent,
  getTextInstances,
  getAnnotations,
  uploadTranslationToOpenpecha,
  getSegmentRelated,
  getSegmentsContent,
  } = require("../apis/openpecha_api");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


const router = express.Router();

/**
 * Helper function to extract segment IDs and spans from segment-related response
 * @param {Array} segmentRelatedData - Response from getSegmentRelated
 * @returns {Array} Array of objects with segment_id, initialStartOffset, initialEndOffset
 */
function extractSegmentInfo(segmentRelatedData) {
  const segments = [];
  
  for (const item of segmentRelatedData) {
    if (item.segments && Array.isArray(item.segments)) {
      for (const segment of item.segments) {
        if (segment.segment_id && segment.span) {
          segments.push({
            segment_id: segment.segment_id,
            initialStartOffset: segment.span.start,
            initialEndOffset: segment.span.end,
          });
        }
      }
    }
  }
  
  return segments;
}

/**
 * Helper function to combine segment info with content
 * @param {Array} segmentInfo - Array with segment_id and offsets
 * @param {Array} segmentContent - Response from getSegmentsContent
 * @returns {Array} Combined array with segment_id, offsets, and content
 */
function combineSegmentData(segmentInfo, segmentContent) {
  // Create a map of segment_id to content for quick lookup
  const contentMap = new Map();
  if (Array.isArray(segmentContent)) {
    for (const item of segmentContent) {
      if (item.segment_id && item.content !== undefined) {
        contentMap.set(item.segment_id, item.content);
      }
    }
  }
  
  // Combine segment info with content
  return segmentInfo.map((segment) => ({
    segment_id: segment.segment_id,
    initialStartOffset: segment.initialStartOffset,
    initialEndOffset: segment.initialEndOffset,
    selectedText: contentMap.get(segment.segment_id) || "",
  }));
}

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

/**
 * GET /openpecha/instances/{instanceId}/segment-related
 * @summary Get segment-related data for a specific instance and span
 * @tags Pecha - OpenPecha integration
 * @param {string} instanceId.path.required - Instance ID
 * @param {number} span_start.query.required - Start position of the span
 * @param {number} span_end.query.required - End position of the span
 * @param {boolean} transfer.query - Transfer parameter (default: false)
 * @return {object} 200 - Segment-related data
 * @return {object} 400 - Bad request - Instance ID, span_start, and span_end are required
 * @return {object} 500 - Server error
 */
router.get("/instances/:instanceId/segment-related", async (req, res) => {
  const { instanceId } = req.params;
  const { span_start, span_end, transfer } = req.query;

  if (!instanceId) {
    return res.status(400).json({
      error: "Instance ID is required",
    });
  }

  if (span_start === undefined || span_end === undefined) {
    return res.status(400).json({
      error: "span_start and span_end query parameters are required",
    });
  }

  try {
    const spanStart = parseInt(span_start, 10);
    const spanEnd = parseInt(span_end, 10);
    const transferFlag = transfer === "true" || transfer === true;

    if (isNaN(spanStart) || isNaN(spanEnd)) {
      return res.status(400).json({
        error: "span_start and span_end must be valid numbers",
      });
    }

    const data = await getSegmentRelated(instanceId, spanStart, spanEnd, transferFlag);
    res.json(data);
  } catch (error) {
    console.error("Error fetching segment-related data:", error);
    res.status(500).json({
      error: "Failed to fetch segment-related data",
      instanceId,
      details: error.message,
    });
  }
});

/**
 * GET /openpecha/instances/{instanceId}/segment-content
 * @summary Get segment content for specific segment IDs
 * @tags Pecha - OpenPecha integration
 * @param {string} instanceId.path.required - Instance ID
 * @param {string} segment_id.query.required - Comma-separated segment IDs
 * @return {object} 200 - Segment content data
 * @return {object} 400 - Bad request - Instance ID and segment_id are required
 * @return {object} 500 - Server error
 */
router.get("/instances/:instanceId/segment-content", async (req, res) => {
  const { instanceId } = req.params;
  const { segment_id } = req.query;

  if (!instanceId) {
    return res.status(400).json({
      error: "Instance ID is required",
    });
  }

  if (!segment_id) {
    return res.status(400).json({
      error: "segment_id query parameter is required",
    });
  }

  try {
    const data = await getSegmentsContent(instanceId, segment_id);
    res.json(data);
  } catch (error) {
    console.error("Error fetching segment content:", error);
    res.status(500).json({
      error: "Failed to fetch segment content",
      instanceId,
      details: error.message,
    });
  }
});

/**
 * GET /openpecha/instances/{instanceId}/segments-with-content
 * @summary Get segment-related data with content combined for a specific instance and span
 * @tags Pecha - OpenPecha integration
 * @param {string} instanceId.path.required - Instance ID
 * @param {number} span_start.query.required - Start position of the span
 * @param {number} span_end.query.required - End position of the span
 * @param {boolean} transfer.query - Transfer parameter (default: false)
 * @return {array<object>} 200 - Array of segments with segment_id, offsets, and content
 * @return {object} 400 - Bad request - Instance ID, span_start, and span_end are required
 * @return {object} 500 - Server error
 * @example response - 200 - Success response
 * [
 *   {
 *     "segment_id": "iq140qPWdNVTTpqQUs0DC",
 *     "initialStartOffset": 431,
 *     "initialEndOffset": 504,
 *     "selectedText": "ལྷ་སོགས་འཇིག་རྟེན་ན་ཡང་དྲི་དང་ནི། །སྤོས་དང་དཔག་བསམ་ཤིང་དང་རིན་ཆེན་ཤིང་། །"
 *   }
 * ]
 */
router.get("/instances/:instanceId/segments-with-content", async (req, res) => {
  const { instanceId } = req.params;
  const { span_start, span_end, transfer } = req.query;

  if (!instanceId) {
    return res.status(400).json({
      error: "Instance ID is required",
    });
  }

  if (span_start === undefined || span_end === undefined) {
    return res.status(400).json({
      error: "span_start and span_end query parameters are required",
    });
  }

  try {
    const spanStart = parseInt(span_start, 10);
    const spanEnd = parseInt(span_end, 10);
    const transferFlag = transfer === "true" || transfer === true;

    if (isNaN(spanStart) || isNaN(spanEnd)) {
      return res.status(400).json({
        error: "span_start and span_end must be valid numbers",
      });
    }

    // Step 1: Get segment-related data
    const segmentRelatedData = await getSegmentRelated(
      instanceId,
      spanStart,
      spanEnd,
      transferFlag
    );

    // Step 2: Extract segment IDs and spans
    const segmentInfo = extractSegmentInfo(segmentRelatedData);

    // If no segments found, return empty array
    if (segmentInfo.length === 0) {
      return res.json([]);
    }

    // Step 3: Get segment IDs as comma-separated string
    const segmentIds = segmentInfo.map((seg) => seg.segment_id).join(",");

    // Step 4: Fetch segment content
    const segmentContent = await getSegmentsContent(instanceId, segmentIds);

    // Step 5: Combine segment info with content
    const combinedData = combineSegmentData(segmentInfo, segmentContent);

    res.json(combinedData);
  } catch (error) {
    console.error("Error fetching segments with content:", error);
    res.status(500).json({
      error: "Failed to fetch segments with content",
      instanceId,
      details: error.message,
    });
  }
});

module.exports = router;
