const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * @typedef {object} TempSearchSegmentRequest
 * @property {string} textId - Text ID (optional)
 * @property {string} instanceId - Instance ID (optional)
 * @property {string} annoatationId - Annotation ID (optional)
 */

/**
 * POST /temp_annotation
 * @summary Create a new temp search segment
 * @tags Temp Search Segments - Temporary search segment management operations
 * @param {TempSearchSegmentRequest} request.body.required - Temp search segment information - application/json
 * @return {object} 201 - Created temp search segment
 * @return {object} 500 - Server error
 * @example request - Example request body
 * {
 *   "textId": "text-123",
 *   "instanceId": "instance-456",
 *   "annoatationId": "annotation-789",
 *   "createdBy": "user-123"
 * }
 * @example response - 201 - Success response
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid-123",
 *     "textId": "text-123",
 *     "instanceId": "instance-456",
 *     "annoatationId": "annotation-789",
 *     "createdAt": "2023-12-01T10:00:00.000Z",
 *     "updatedAt": "2023-12-01T10:00:00.000Z"
 *   }
 * }
 * @example response - 500 - Server error response
 * {
 *   "success": false,
 *   "error": "Error creating temp search segment",
 *   "details": "Database connection failed"
 * }
 */
router.post("", async (req, res) => {
  try {
    const { textId, instanceId, annoatationId, createdBy } = req.body;

    // Create temp search segment
    const tempSearchSegment = await prisma.tempSearchSegments.create({
      data: {
        textId: textId || null,
        instanceId: instanceId || null,
        annoatationId: annoatationId || null,
        createdBy: createdBy || null,
      },
    });

    res.status(201).json({
      success: true,
      data: tempSearchSegment,
    });
  } catch (error) {
    console.error("Error creating temp search segment:", error);
    res.status(500).json({
      success: false,
      error: "Error creating temp search segment",
      details: error.message,
    });
  }
});

module.exports = router;
