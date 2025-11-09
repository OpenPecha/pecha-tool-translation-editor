const express = require("express");
const { PrismaClient } = require("@prisma/client");
const {
	authenticate,
	optionalAuthenticate,
} = require("../middleware/authenticate");

const prisma = new PrismaClient();
const router = express.Router();

// Get all threads (optional: filter by document)
router.get("/", authenticate, async (req, res) => {
	try {
		const { documentId } = req.query;

		let threads;
		if (documentId) {
			threads = await prisma.thread.findMany({
				where: { documentId },
				include: { 
					createdByUser: {
						select: {
							id: true,
							username: true,
							email: true,
						}
					},
					comments: {
						include: {
							user: true,
						}
					}
				},
				orderBy: {
					createdAt: "desc",
				},
			});
		} else {
			threads = await prisma.thread.findMany({
				include: { 
					createdByUser: {
						select: {
							id: true,
							username: true,
							email: true,
						}
					},
					comments: {
						include: {
							user: true,
						}
					}
				},
				orderBy: {
					createdAt: "desc",
				},
			});
		}

		res.json(threads);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error while fetching threads" });
	}
});

// Get threads for a specific document
router.get("/document/:documentId", optionalAuthenticate, async (req, res) => {
	try {
		const { documentId } = req.params;

		const threads = await prisma.thread.findMany({
			where: { documentId },
			include: { 
				createdByUser: {
					select: {
						id: true,
						username: true,
						email: true,
					}
				},
				comments: {
					include: {
						user: true,
					}
				}
			},
			orderBy: {
				createdAt: "desc",
			},
		});
		res.json(threads);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error fetching document threads" });
	}
});

// Get a specific thread by ID
router.get("/:id", optionalAuthenticate, async (req, res) => {
	try {
		const { id } = req.params;

		const thread = await prisma.thread.findUnique({
			where: { id },
			include: { 
				createdByUser: {
					select: {
						id: true,
						username: true,
						email: true,
					}
				},
				comments: {
					include: {
						user: true,
					},
					orderBy: {
						createdAt: "asc",
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

// Create a new thread
router.post("/", authenticate, async (req, res) => {
	try {
		const {
			documentId,
			initialStartOffset,
			initialEndOffset,
			selectedText,
			isSystemGenerated,
		} = req.body;

		if (
			!documentId ||
			initialStartOffset == null ||
			initialEndOffset == null
		) {
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
					}
				},
				comments: true
			},
		});

		res.status(201).json(newThread);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error creating thread" });
	}
});

// Update a thread
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
			return res.status(403).json({ error: "Only the thread creator can update it" });
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
					}
				},
				comments: {
					include: {
						user: true,
					}
				}
			},
		});

		res.json(updatedThread);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error updating thread" });
	}
});

// Delete a thread
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
			return res.status(403).json({ error: "Only the thread creator can delete it" });
		}

		await prisma.thread.delete({
			where: { id },
		});

		res.json({ message: "Thread deleted successfully" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error deleting thread" });
	}
});

module.exports = router;

