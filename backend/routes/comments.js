const express = require("express");
const { PrismaClient } = require("@prisma/client");
const {
	authenticate,
	optionalAuthenticate,
} = require("../middleware/authenticate");

const prisma = new PrismaClient();
const router = express.Router();

// Get all comments (optional: filter by document)
router.get("/", authenticate, async (req, res) => {
	try {
		const { docId } = req.query;

		let comments;
		if (docId) {
			comments = await prisma.comment.findMany({
				where: { docId },
				include: { user: true },
				orderBy: {
					createdAt: "desc",
				},
			});
		} else {
			comments = await prisma.comment.findMany({
				include: { user: true },
			});
		}

		res.json(comments);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error while fetching comments" });
	}
});

// Get comments for a specific document
router.get("/:docId", optionalAuthenticate, async (req, res) => {
	try {
		const { docId } = req.params;

		const comments = await prisma.comment.findMany({
			where: { docId },
			include: { user: true },
		});
		res.json(comments);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error fetching document comments" });
	}
});
// Get comments for a specific thread
router.get("/thread/:threadId", optionalAuthenticate, async (req, res) => {
	const { threadId } = req.params;
	const comments = await prisma.comment.findMany({
		where: { threadId },
		include: { user: true },
		orderBy: {
			createdAt: "desc",
		},
	});
	res.json(comments);
});
// Create a new comment
router.post("/", authenticate, async (req, res) => {
	try {
		const {
			docId,
			userId,
			content,
			threadId,
			isSuggestion,
			suggestedText,
			isSystemGenerated,
		} = req.body;

		if (!docId || !userId || !content) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		// Validate suggestion data if isSuggestion is true
		if (isSuggestion === true && !suggestedText) {
			return res
				.status(400)
				.json({ error: "Suggested text is required for suggestions" });
		}
		const data = {
			docId,
			userId,
			content,
			threadId: threadId || null,
			isSuggestion: isSuggestion || false,
			suggestedText: suggestedText || null,
			isSystemGenerated: isSystemGenerated || false,
		};
		const newComment = await prisma.comment.create({
			data: data,
			include: { user: true },
		});

		res.status(201).json(newComment);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error creating comment" });
	}
});

// Update a comment (edit text or mark resolved)
router.put("/:id", authenticate, async (req, res) => {
	try {
		const { id } = req.params;
		const { content, isSuggestion, suggestedText } = req.body;

		const existingComment = await prisma.comment.findUnique({
			where: { id },
		});

		if (!existingComment) {
			return res.status(404).json({ error: "Comment not found" });
		}

		// Validate suggestion data if isSuggestion is being updated to true
		if (
			isSuggestion === true &&
			!suggestedText &&
			!existingComment.suggestedText
		) {
			return res
				.status(400)
				.json({ error: "Suggested text is required for suggestions" });
		}

		const updatedComment = await prisma.comment.update({
			where: { id },
			data: {
				content,
				isSuggestion:
					isSuggestion !== undefined
						? isSuggestion
						: existingComment.isSuggestion,
				suggestedText:
					suggestedText !== undefined
						? suggestedText
						: existingComment.suggestedText,
				updatedAt: new Date(),
			},
		});

		res.json(updatedComment);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error updating comment" });
	}
});

// Delete a comment
router.delete("/:id", authenticate, async (req, res) => {
	try {
		const { id } = req.params;

		const comment = await prisma.comment.findUnique({
			where: { id },
		});

		if (!comment) {
			return res.status(404).json({ error: "Comment not found" });
		}

		await prisma.comment.delete({
			where: { id },
		});

		res.json({ message: "Comment deleted successfully" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error deleting comment" });
	}
});

module.exports = router;
