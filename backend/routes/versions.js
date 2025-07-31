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

    // Update the document's currentVersionId to point to the newly created version
    await prisma.doc.update({
      where: { id: docId },
      data: { currentVersionId: newVersion.id }
    });

    res.status(201).json(newVersion);
  } catch (error) {
    console.error("Error creating version:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route GET /versions/version/:id
 * @desc Get a specific version by ID and update document's currentVersionId
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

    // Update the document's currentVersionId to track which version is currently loaded
    await prisma.doc.update({
      where: { id: version.docId },
      data: { currentVersionId: id }
    });

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

    // Prevent deletion of system-generated versions (initial versions)
    if (!existingVersion.userId) {
      return res.status(403).json({ 
        error: "Cannot delete system-generated version" 
      });
    }

    // Check if this version is currently set as the document's current version
    const document = await prisma.doc.findUnique({
      where: { id: existingVersion.docId },
      select: { currentVersionId: true }
    });

    await prisma.version.delete({ where: { id } });

    // If the deleted version was the current version, update currentVersionId
    if (document?.currentVersionId === id) {
      // Find the most recent remaining version for this document
      const latestVersion = await prisma.version.findFirst({
        where: { docId: existingVersion.docId },
        orderBy: { timestamp: "desc" }
      });

      // Update document's currentVersionId to the latest remaining version or null
      await prisma.doc.update({
        where: { id: existingVersion.docId },
        data: { currentVersionId: latestVersion?.id || null }
      });
    }

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

    // Check if the version exists and prevent modification of system-generated versions
    const existingVersion = await prisma.version.findUnique({ where: { id } });
    if (!existingVersion) {
      return res.status(404).json({ error: "Version not found" });
    }
    if (!existingVersion.userId) {
      return res.status(403).json({ 
        error: "Cannot modify system-generated version" 
      });
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

/**
 * @route PUT /versions/version/:id
 * @desc Update a version's content
 */
router.put("/version/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required for update" });
    }

    // Check if the version exists and belongs to the user or is accessible
    const existingVersion = await prisma.version.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!existingVersion) {
      return res.status(404).json({ error: "Version not found" });
    }

    // Prevent modification of system-generated versions
    if (!existingVersion.userId) {
      return res.status(403).json({ 
        error: "Cannot modify system-generated version" 
      });
    }

    const updatedVersion = await prisma.version.update({
      where: { id },
      data: { 
        content,
        timestamp: new Date() // Update timestamp when content is updated
      },
      include: { user: true }
    });

    // Ensure the document's currentVersionId points to this updated version
    await prisma.doc.update({
      where: { id: existingVersion.docId },
      data: { currentVersionId: id }
    });

    res.json(updatedVersion);
  } catch (error) {
    console.error("Error updating version content:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route GET /versions/current/:docId
 * @desc Get the current version of a document
 */
router.get("/current/:docId", authenticate, async (req, res) => {
  try {
    const { docId } = req.params;

    const document = await prisma.doc.findUnique({
      where: { id: docId },
      select: {
        currentVersionId: true,
        currentVersion: {
          include: {
            user: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (!document.currentVersion) {
      return res.status(404).json({ error: "No current version found for this document" });
    }

    res.json(document.currentVersion);
  } catch (error) {
    console.error("Error fetching current version:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
