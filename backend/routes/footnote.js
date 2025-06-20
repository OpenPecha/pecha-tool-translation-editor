const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/authenticate");

const prisma = new PrismaClient();
const router = express.Router();

// Get all footnotes (optional: filter by document)
router.get("/", authenticate, async (req, res) => {
  try {
    const { docId } = req.query;

    let footnotes;
    if (docId) {
      footnotes = await prisma.footnote.findMany({
        where: { docId },
        include: { user: true },
        orderBy: {
          order: "asc",
        },
      });
    } else {
      footnotes = await prisma.footnote.findMany({
        include: { user: true },
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

// Get footnotes for a specific document
router.get("/:docId", authenticate, async (req, res) => {
  try {
    const { docId } = req.params;

    const footnotes = await prisma.footnote.findMany({
      where: { docId },
      include: { user: true },
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

// Get footnotes for a specific thread
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

// Create a new footnote
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      docId,
      userId,
      content,
      initial_start_offset,
      initial_end_offset,
      threadId,
      note_on,
    } = req.body;

    if (
      !docId ||
      !userId ||
      !content ||
      !note_on ||
      initial_start_offset == null ||
      initial_end_offset == null
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create the new footnote first with a temporary order
    const tempData = {
      docId,
      userId,
      content,
      initial_start_offset,
      initial_end_offset,
      threadId,
      note_on,
      order: 999999, // Temporary high order number
    };

    const newFootnote = await prisma.footnote.create({
      data: tempData,
      include: { user: true },
    });

    // Get all footnotes for this document ordered by initial_start_offset
    const allFootnotes = await prisma.footnote.findMany({
      where: { docId },
      orderBy: {
        initial_start_offset: "asc",
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

// Update a footnote
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

// Delete a footnote
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
