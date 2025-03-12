const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticate = require("../middleware/authenticate");

const prisma = new PrismaClient();
const router = express.Router();

// Get all suggestion (optional: filter by document)
router.get("/",authenticate, async (req, res) => {
    try {
        const { docId } = req.query;

        let suggests;
        if (docId) {
            suggests = await prisma.suggestion.findMany({
                where: { docId },
                include: { user: true },
                orderBy:{
                    createdAt:'desc'
                }
            });
        } else {
            suggests = await prisma.suggestion.findMany({ include: { user: true } });
        }

        res.json(suggests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error while fetching comments" });
    }
});

// Get comments for a specific document
router.get("/:docId",authenticate, async (req, res) => {
    try {
        const { docId } = req.params;

        const suggest = await prisma.suggestion.findMany({
            where: { docId },
            include: { user: true }
        });
        res.json(suggest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error fetching document suggest" });
    }
});




router.get("/thread/:threadId", async (req, res) => {
    try {
        const { threadId } = req.params;

        const suggest = await prisma.suggestion.findMany({
            where: { threadId },
            include: { user: true }
        });
        res.json(suggest);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error fetching document suggest" });
    }
});

// Create a new suggestion
router.post("/",authenticate, async (req, res) => {
    try {
        const { docId, userId, content, initial_start_offset, initial_end_offset,threadId } = req.body;

        if (!docId || !userId || !content || initial_start_offset == null || initial_end_offset == null) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newSuggestion = await prisma.suggestion.create({
            data: {
                docId,
                userId,
                content,
                initial_start_offset,
                initial_end_offset,
                threadId
            },
            include: { user: true },
        });

        res.status(201).json(newSuggestion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error creating comment" });
    }
});

// Update a suggestion (edit text or mark resolved)
router.put("/:id",authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        const existingSuggestion = await prisma.suggestion.findUnique({
            where: { id },
        });

        if (!existingSuggestion) {
            return res.status(404).json({ error: "Comment not found" });
        }

        const updatedSuggestion = await prisma.suggestion.update({
            where: { id },
            data: {
                content,
                updatedAt: new Date(),
            },
        });

        res.json(updatedSuggestion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error updating comment" });
    }
});

// Delete a suggestion
router.delete("/:id",authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const suggestion = await prisma.suggestion.findUnique({
            where: { id },
        });

        if (!suggestion) {
            return res.status(404).json({ error: "Comment not found" });
        }

        await prisma.suggestion.delete({
            where: { id },
        });

        res.json({ message: "suggestion deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error deleting suggestion" });
    }
});

module.exports = router;
