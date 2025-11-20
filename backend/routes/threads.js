const express = require("express");
const { PrismaClient } = require("@prisma/client");
const {
  authenticate,
  optionalAuthenticate,
} = require("../middleware/authenticate");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * GET /threads
 * @summary Get all threads with optional document and range filters
 * @tags Threads - Thread management operations
 * @param {string} documentId.query - Optional document ID to filter threads - eg: doc-123
 * @param {integer} startOffset.query - Optional start offset to filter threads (must be used with endOffset) - eg: 100
 * @param {integer} endOffset.query - Optional end offset to filter threads (must be used with startOffset) - eg: 150
 * @return {array<Thread>} 200 - List of threads with creator and comments
 * @return {object} 500 - Server error
 * @example response - 200 - Success response
 * [
 *   {
 *     "id": "thread-123",
 *     "documentId": "doc-456",
 *     "isSystemGenerated": false,
 *     "initialStartOffset": 100,
 *     "initialEndOffset": 150,
 *     "selectedText": "Selected text content",
 *     "createdByUserId": "user-789",
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "updatedAt": "2024-01-01T00:00:00.000Z",
 *     "createdByUser": {
 *       "id": "user-789",
 *       "username": "John Doe",
 *       "email": "john@example.com"
 *   }
 * ]
 */
router.get("/", async (req, res) => {
  try {
    const { documentId, startOffset, endOffset } = req.query;

    let whereClause = {};
    if (documentId) {
      whereClause.documentId = documentId;
    }

    if (startOffset !== undefined && endOffset !== undefined) {
      whereClause.initialStartOffset = { gte: parseInt(startOffset, 10) };
      whereClause.initialEndOffset = { lte: parseInt(endOffset, 10) };
    }
    const threads = await prisma.thread.findMany({
      where: whereClause,
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        // comments: {
        //   include: {
        //     user: true
        //   },
        //   orderBy: {
        //     createdAt: "asc"
        //   }
        // }
      },
    });

    res.json(threads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while fetching threads" });
  }
});


/**
 * GET /threads/{id}
 * @summary Get a specific thread by ID with all comments
 * @tags Threads - Thread management operations
 * @param {string} id.path.required - Thread ID - eg: thread-123
 * @return {object} 200 - Thread details with comments and creator info
 * @return {object} 404 - Thread not found
 * @return {object} 500 - Server error
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if(!id) {
      return res.status(400).json({ error: "Thread ID is required" });
    }
    const thread = await prisma.thread.findUnique({
      where: { id: id },
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        comments: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
    });
    
    

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    res.json(thread);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching thread" });
  }
});

/**
 * POST /threads
 * @summary Create a new thread for text selection
 * @tags Threads - Thread management operations
 * @security BearerAuth
 * @param {object} request.body.required - Thread information - application/json
 * @param {string} request.body.documentId.required - Document ID - eg: doc-123
 * @param {integer} request.body.initialStartOffset.required - Start offset in document - eg: 100
 * @param {integer} request.body.initialEndOffset.required - End offset in document - eg: 150
 * @param {string} request.body.selectedText - Selected text content - eg: Selected text here
 * @param {boolean} request.body.isSystemGenerated - Whether thread is system-generated (default: false) - eg: false
 * @return {object} 201 - Created thread with creator info
 * @return {object} 400 - Bad request - Missing required fields
 * @return {object} 500 - Server error
 * @example request - Example request body
 * {
 *   "documentId": "doc-123",
 *   "initialStartOffset": 100,
 *   "initialEndOffset": 150,
 *   "selectedText": "This is the selected text",
 *   "isSystemGenerated": false
 * }
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      documentId,
      initialStartOffset,
      initialEndOffset,
      selectedText,
      isSystemGenerated,
    } = req.body;

    if (!documentId || initialStartOffset == null || initialEndOffset == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const data = {
      documentId,
      initialStartOffset,
      initialEndOffset,
      selectedText: selectedText || null,
      createdByUserId: req.user.id,
      isSystemGenerated: isSystemGenerated || false,
    };

    const newThread = await prisma.thread.create({
      data: data,
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        }
      },
    });
    res.status(201).json(newThread);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating thread" });
  }
});

/**
 * PUT /threads/{id}
 * @summary Update a thread (only by creator)
 * @tags Threads - Thread management operations
 * @security BearerAuth
 * @param {string} id.path.required - Thread ID - eg: thread-123
 * @param {object} request.body.required - Updated thread information - application/json
 * @param {string} request.body.selectedText - Updated selected text - eg: Updated selected text
 * @return {object} 200 - Updated thread with creator and comments
 * @return {object} 403 - Forbidden - Not the thread creator
 * @return {object} 404 - Thread not found
 * @return {object} 500 - Server error
 * @example request - Example request body
 * {
 *   "selectedText": "Updated selected text content"
 * }
 */
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { selectedText } = req.body;

    const existingThread = await prisma.thread.findUnique({
      where: { id },
    });

    if (!existingThread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    // Check if user is the creator of the thread
    if (existingThread.createdByUserId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Only the thread creator can update it" });
    }

    const updateData = {};
    if (selectedText !== undefined) updateData.selectedText = selectedText;
    updateData.updatedAt = new Date();

    const updatedThread = await prisma.thread.update({
      where: { id },
      data: updateData,
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        comments: {
          include: {
            user: true,
          },
        },
      },
    });

    res.json(updatedThread);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error updating thread" });
  }
});

/**
 * DELETE /threads/{id}
 * @summary Delete a thread (only by creator)
 * @tags Threads - Thread management operations
 * @security BearerAuth
 * @param {string} id.path.required - Thread ID - eg: thread-123
 * @return {object} 200 - Success message
 * @return {object} 403 - Forbidden - Not the thread creator
 * @return {object} 404 - Thread not found
 * @return {object} 500 - Server error
 * @example response - 200 - Success response
 * {
 *   "message": "Thread deleted successfully"
 * }
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const thread = await prisma.thread.findUnique({
      where: { id },
    });

    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    // Check if user is the creator of the thread
    if (thread.createdByUserId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Only the thread creator can delete it" });
    }

    await prisma.thread.delete({
      where: { id },
    });

    res.json({ success: true, message: "Thread deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error deleting thread" });
  }
});

module.exports = router;
