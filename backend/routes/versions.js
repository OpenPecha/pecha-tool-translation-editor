const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const {authenticate} = require("../middleware/authenticate"); // Assuming authentication middleware exists

const prisma = new PrismaClient();

/**
 * @route GET /versions/:docId
 * @desc Get all versions for a specific document
 */
router.get("/:docId", authenticate, async (req, res) => {
  try {
    const { docId } = req.params;
    const versions = await prisma.version.findMany({
      where: { docId },
      select:{label:true,
        id:true,
        timestamp:true,
        user:true
      },
      orderBy: { timestamp: "desc" },
    });
    res.json(versions);
  } catch (error) {
    console.error("Error fetching versions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /versions
 * @desc Create a new version
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const { docId, label, content } = req.body;

    // Validate input
    if (!docId || !label || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newVersion = await prisma.version.create({
      data: {
        docId,
        label,
        content,
        userId: req.user.id,
      },
    });

    res.status(201).json(newVersion);
  } catch (error) {
    console.error("Error creating version:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route GET /versions/version/:id
 * @desc Get a specific version by ID
 */
router.get("/version/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const version = await prisma.version.findUnique({
      where: { id },
      include:{
        user:true
      }
    });

    if (!version) {
      return res.status(404).json({ error: "Version not found" });
    }

    res.json(version);
  } catch (error) {
    console.error("Error fetching version:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route DELETE /versions/version/:id
 * @desc Delete a specific version
 */
router.delete("/version/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the version exists
    const existingVersion = await prisma.version.findUnique({ where: { id } });
    if (!existingVersion) {
      return res.status(404).json({ error: "Version not found" });
    }

    await prisma.version.delete({ where: { id } });

    res.json({ message: "Version deleted successfully" });
  } catch (error) {
    console.error("Error deleting version:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route PATCH /versions/version/:id
 * @desc Update a version label
 */
router.patch("/version/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { label } = req.body;

    if (!label) {
      return res.status(400).json({ error: "Label is required for update" });
    }

    const updatedVersion = await prisma.version.update({
      where: { id },
      data: { label },
    });

    res.json(updatedVersion);
  } catch (error) {
    console.error("Error updating version:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
