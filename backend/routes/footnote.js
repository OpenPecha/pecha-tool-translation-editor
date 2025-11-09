const express = require("express");
const { PrismaClient } = require("@prisma/client");
const {
	authenticate,
	optionalAuthenticate,
} = require("../middleware/authenticate");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * GET /footnotes
 * @summary Get all footnotes with optional document filter
 * @tags Footnotes - Footnote management operations
 * @security BearerAuth
 * @param {string} docId.query - Optional document ID to filter footnotes - eg: doc-123
 * @return {array<object>} 200 - List of footnotes ordered by position
 * @return {object} 500 - Server error
 */
router.get("/", authenticate, async (req, res) => {
	try {
		const { docId } = req.query;

		let footnotes;
		if (docId) {
			footnotes = await prisma.footnote.findMany({
				where: { docId },
				orderBy: {
					order: "asc",
				},
			});
		} else {
			footnotes = await prisma.footnote.findMany({
				orderBy: {
					order: "asc",
				},
			});
		}

		res.json(footnotes);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error while fetching footnotes" });
	}
});

/**
 * GET /footnotes/{docId}
 * @summary Get all footnotes for a specific document
 * @tags Footnotes - Footnote management operations
 * @param {string} docId.path.required - Document ID - eg: doc-123
 * @return {array<object>} 200 - List of footnotes for the document
 * @return {object} 500 - Server error
 */
router.get("/:docId", optionalAuthenticate, async (req, res) => {
	try {
		const { docId } = req.params;

		const footnotes = await prisma.footnote.findMany({
			where: { docId },
			select: {
				threadId: true,
				content: true,
				id: true,
			},
			orderBy: {
				order: "asc",
			},
		});
		res.json(footnotes);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error fetching document footnotes" });
	}
});

/**
 * GET /footnotes/thread/{threadId}
 * @summary Get all footnotes for a specific thread
 * @tags Footnotes - Footnote management operations
 * @security BearerAuth
 * @param {string} threadId.path.required - Thread ID - eg: thread-123
 * @return {array<object>} 200 - List of footnotes for the thread
 * @return {object} 500 - Server error
 */
router.get("/thread/:threadId", authenticate, async (req, res) => {
	try {
		const { threadId } = req.params;
		const footnotes = await prisma.footnote.findMany({
			where: { threadId },
			include: { user: true },
			orderBy: {
				order: "asc",
			},
		});
		res.json(footnotes);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error fetching thread footnotes" });
	}
});

/**
 * POST /footnotes
 * @summary Create a new footnote
 * @tags Footnotes - Footnote management operations
 * @security BearerAuth
 * @param {object} request.body.required - Footnote information - application/json
 * @param {string} request.body.docId.required - Document ID - eg: doc-123
 * @param {string} request.body.userId.required - User ID - eg: user-456
 * @param {string} request.body.content.required - Footnote content - eg: This is a footnote
 * @param {integer} request.body.initialStartOffset.required - Start offset in document - eg: 100
 * @param {integer} request.body.initialEndOffset.required - End offset in document - eg: 150
 * @param {string} request.body.threadId - Thread ID (optional) - eg: thread-789
 * @param {string} request.body.noteOn.required - What the note is about - eg: Selected text
 * @return {object} 201 - Created footnote with auto-generated order
 * @return {object} 400 - Bad request - Missing required fields
 * @return {object} 500 - Server error
 * @example request - Example request body
 * {
 *   "docId": "doc-123",
 *   "userId": "user-456",
 *   "content": "This is an explanatory footnote",
 *   "initialStartOffset": 100,
 *   "initialEndOffset": 150,
 *   "threadId": "thread-789",
 *   "noteOn": "Selected text that needs explanation"
 * }
 */
router.post("/", authenticate, async (req, res) => {
	try {
		const {
			docId,
			userId,
			content,
			initialStartOffset,
			initialEndOffset,
			threadId,
			noteOn,
		} = req.body;

		if (
			!docId ||
			!userId ||
			!content ||
			!noteOn ||
			initialStartOffset == null ||
			initialEndOffset == null
		) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		// Create the new footnote first with a temporary order
		const tempData = {
			docId,
			userId,
			content,
			initialStartOffset,
			initialEndOffset,
			threadId: threadId || null,
			noteOn,
			order: 999999, // Temporary high order number
		};

		const newFootnote = await prisma.footnote.create({
			data: tempData,
			include: { user: true },
		});

		// Get all footnotes for this document ordered by initialStartOffset
		const allFootnotes = await prisma.footnote.findMany({
			where: { docId },
			orderBy: {
				initialStartOffset: "asc",
			},
		});

		// Update all footnotes with correct order based on their position
		for (let i = 0; i < allFootnotes.length; i++) {
			await prisma.footnote.update({
				where: { id: allFootnotes[i].id },
				data: { order: i + 1 },
			});
		}

		// Fetch the updated footnote with correct order
		const updatedFootnote = await prisma.footnote.findUnique({
			where: { id: newFootnote.id },
			include: { user: true },
		});

		res.status(201).json(updatedFootnote);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error creating footnote" });
	}
});

/**
 * PUT /footnotes/{id}
 * @summary Update a footnote content
 * @tags Footnotes - Footnote management operations
 * @security BearerAuth
 * @param {string} id.path.required - Footnote ID - eg: footnote-123
 * @param {object} request.body.required - Updated footnote information - application/json
 * @param {string} request.body.content.required - Updated footnote content - eg: Updated footnote text
 * @return {object} 200 - Updated footnote
 * @return {object} 404 - Footnote not found
 * @return {object} 500 - Server error
 */
router.put("/:id", authenticate, async (req, res) => {
	try {
		const { id } = req.params;
		const { content } = req.body;

		const existingFootnote = await prisma.footnote.findUnique({
			where: { id },
		});

		if (!existingFootnote) {
			return res.status(404).json({ error: "Footnote not found" });
		}

		const updatedFootnote = await prisma.footnote.update({
			where: { id },
			data: {
				content,
				updatedAt: new Date(),
			},
		});

		res.json(updatedFootnote);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error updating footnote" });
	}
});

/**
 * DELETE /footnotes/{id}
 * @summary Delete a footnote
 * @tags Footnotes - Footnote management operations
 * @security BearerAuth
 * @param {string} id.path.required - Footnote ID - eg: footnote-123
 * @return {object} 200 - Success message
 * @return {object} 404 - Footnote not found
 * @return {object} 500 - Server error
 */
router.delete("/:id", authenticate, async (req, res) => {
	try {
		const { id } = req.params;

		const footnote = await prisma.footnote.findUnique({
			where: { id },
		});

		if (!footnote) {
			return res.status(404).json({ error: "Footnote not found" });
		}

		await prisma.footnote.delete({
			where: { id },
		});

		res.json({ message: "Footnote deleted successfully" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error deleting footnote" });
	}
});

module.exports = router;
