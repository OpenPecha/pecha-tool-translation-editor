const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/authenticate");
const crypto = require("crypto");

const prisma = new PrismaClient();

// Utility functions for versioning
const generateContentHash = (content) => {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
};

const calculateWordCount = (content) => {
  if (!content || !content.ops) return 0;
  return content.ops.reduce((count, op) => {
    if (typeof op.insert === "string") {
      return (
        count + op.insert.split(/\s+/).filter((word) => word.length > 0).length
      );
    }
    return count;
  }, 0);
};

const calculateCharacterCount = (content) => {
  if (!content || !content.ops) return 0;
  return content.ops.reduce((count, op) => {
    if (typeof op.insert === "string") {
      return count + op.insert.length;
    }
    return count;
  }, 0);
};

const calculateDiff = (oldContent, newContent) => {
  // Simple diff calculation - in production, you might want to use a more sophisticated diff algorithm
  return {
    type: "content_change",
    oldHash: generateContentHash(oldContent),
    newHash: generateContentHash(newContent),
    timestamp: new Date(),
  };
};

/**
 * @route GET /versions/:docId
 * @desc Get all versions for a specific document with enhanced metadata
 */
router.get("/:docId", authenticate, async (req, res) => {
  try {
    const { docId } = req.params;
    const {
      limit = 50,
      offset = 0,
      includeSnapshots = true,
      branchName,
    } = req.query;

    let whereClause = { docId };

    if (branchName) {
      whereClause.branchName = branchName;
    }

    if (includeSnapshots === "false") {
      whereClause.isSnapshot = false;
    }

    const versions = await prisma.version.findMany({
      where: whereClause,
      select: {
        id: true,
        label: true,
        sequenceNumber: true,
        changeType: true,
        changeSummary: true,
        changeCount: true,
        wordCount: true,
        characterCount: true,
        isAutosave: true,
        isPublished: true,
        isSnapshot: true,
        snapshotReason: true,
        tags: true,
        branchName: true,
        isMerge: true,
        createdAt: true,
        publishedAt: true,
        lastAccessedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            picture: true,
          },
        },
        parentVersionId: true,
        _count: {
          select: {
            children: true,
            annotations: true,
          },
        },
      },
      orderBy: [{ sequenceNumber: "desc" }, { createdAt: "desc" }],
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // Update last accessed time for non-current versions
    const versionIds = versions.map((v) => v.id);
    await prisma.version.updateMany({
      where: { id: { in: versionIds } },
      data: { lastAccessedAt: new Date() },
    });

    res.json({
      versions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: await prisma.version.count({ where: whereClause }),
      },
    });
  } catch (error) {
    console.error("Error fetching versions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /versions
 * @desc Create a new version (enhanced with auto-calculation)
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      docId,
      label,
      content,
      changeType = "content",
      changeSummary,
      isSnapshot = false,
      snapshotReason,
      tags = [],
      branchName,
      parentVersionId,
    } = req.body;

    // Validate input
    if (!docId || !content) {
      return res
        .status(400)
        .json({ error: "Missing required fields: docId, content" });
    }

    // Get the latest version to calculate sequence number and diff
    const latestVersion = await prisma.version.findFirst({
      where: { docId },
      orderBy: { sequenceNumber: "desc" },
      select: { sequenceNumber: true, content: true, contentHash: true },
    });

    const sequenceNumber = latestVersion ? latestVersion.sequenceNumber + 1 : 1;
    const contentHash = generateContentHash(content);
    const wordCount = calculateWordCount(content);
    const characterCount = calculateCharacterCount(content);

    // Calculate diff if there's a previous version
    let contentDiff = null;
    let changeCount = 0;
    if (latestVersion) {
      contentDiff = calculateDiff(latestVersion.content, content);
      // Simple change count - count number of operations that differ
      changeCount = content.ops ? content.ops.length : 0;
    }

    // Auto-generate label if not provided
    const finalLabel =
      label ||
      (isSnapshot
        ? `Snapshot ${sequenceNumber}`
        : `Auto-save ${sequenceNumber}`);

    const newVersion = await prisma.$transaction(async (tx) => {
      // Create the version
      const version = await tx.version.create({
        data: {
          docId,
          label: finalLabel,
          content,
          userId: req.user.id,
          sequenceNumber,
          changeType,
          changeSummary,
          changeCount,
          wordCount,
          characterCount,
          contentDiff,
          isSnapshot,
          snapshotReason,
          tags,
          branchName,
          parentVersionId,
          contentHash,
          isAutosave: !label && !isSnapshot, // Auto-save if no explicit label and not a snapshot
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              picture: true,
            },
          },
        },
      });

      // Update document's latest version tracking
      await tx.doc.update({
        where: { id: docId },
        data: {
          latestVersionId: version.id,
          lastContentHash: contentHash,
          updatedAt: new Date(),
        },
      });

      return version;
    });

    res.status(201).json(newVersion);
  } catch (error) {
    console.error("Error creating version:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route GET /versions/version/:id
 * @desc Get a specific version by ID with full details
 */
router.get("/version/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { includeAnnotations = true } = req.query;

    const selectClause = {
      id: true,
      docId: true,
      label: true,
      content: true,
      sequenceNumber: true,
      changeType: true,
      changeSummary: true,
      changeCount: true,
      wordCount: true,
      characterCount: true,
      contentDiff: true,
      isAutosave: true,
      isPublished: true,
      isSnapshot: true,
      snapshotReason: true,
      tags: true,
      branchName: true,
      isMerge: true,
      mergedFromIds: true,
      contentHash: true,
      createdAt: true,
      publishedAt: true,
      lastAccessedAt: true,
      parentVersionId: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          picture: true,
        },
      },
      parentVersion: {
        select: {
          id: true,
          label: true,
          sequenceNumber: true,
          createdAt: true,
        },
      },
      children: {
        select: {
          id: true,
          label: true,
          sequenceNumber: true,
          createdAt: true,
        },
      },
    };

    if (includeAnnotations === "true") {
      selectClause.annotations = {
        where: { isActive: true },
        select: {
          id: true,
          type: true,
          start: true,
          end: true,
          content: true,
          createdAt: true,
          lastModifiedAt: true,
        },
      };
    }

    const version = await prisma.version.findUnique({
      where: { id },
      select: selectClause,
    });

    if (!version) {
      return res.status(404).json({ error: "Version not found" });
    }

    // Update last accessed time
    await prisma.version.update({
      where: { id },
      data: { lastAccessedAt: new Date() },
    });

    res.json(version);
  } catch (error) {
    console.error("Error fetching version:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /versions/version/:id/restore
 * @desc Restore document to a specific version
 */
router.post("/version/:id/restore", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { createSnapshot = true } = req.body;

    const version = await prisma.version.findUnique({
      where: { id },
      select: {
        docId: true,
        content: true,
        label: true,
        sequenceNumber: true,
      },
    });

    if (!version) {
      return res.status(404).json({ error: "Version not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Optionally create a snapshot of current state before restoring
      let snapshotVersion = null;
      if (createSnapshot) {
        const currentDoc = await tx.doc.findUnique({
          where: { id: version.docId },
          select: { content: true, latestVersionId: true },
        });

        if (currentDoc?.content) {
          const latestSeq = await tx.version.findFirst({
            where: { docId: version.docId },
            orderBy: { sequenceNumber: "desc" },
            select: { sequenceNumber: true },
          });

          snapshotVersion = await tx.version.create({
            data: {
              docId: version.docId,
              label: `Pre-restore snapshot`,
              content: JSON.parse(currentDoc.content),
              userId: req.user.id,
              sequenceNumber: (latestSeq?.sequenceNumber || 0) + 1,
              changeType: "restore_preparation",
              changeSummary: `Snapshot before restoring to version: ${version.label}`,
              isSnapshot: true,
              snapshotReason: "Pre-restore backup",
              contentHash: generateContentHash(JSON.parse(currentDoc.content)),
            },
          });
        }
      }

      // Create new version from the restored content
      const latestSeq = await tx.version.findFirst({
        where: { docId: version.docId },
        orderBy: { sequenceNumber: "desc" },
        select: { sequenceNumber: true },
      });

      const restoredVersion = await tx.version.create({
        data: {
          docId: version.docId,
          label: `Restored from: ${version.label}`,
          content: version.content,
          userId: req.user.id,
          sequenceNumber: (latestSeq?.sequenceNumber || 0) + 1,
          changeType: "restore",
          changeSummary: `Restored from version ${version.sequenceNumber}: ${version.label}`,
          parentVersionId: id,
          contentHash: generateContentHash(version.content),
          wordCount: calculateWordCount(version.content),
          characterCount: calculateCharacterCount(version.content),
        },
      });

      // Update document content and current version
      await tx.doc.update({
        where: { id: version.docId },
        data: {
          content:
            typeof version.content === "string"
              ? version.content
              : version.content && version.content.ops
              ? version.content.ops.reduce((text, op) => {
                  if (typeof op.insert === "string") {
                    return text + op.insert;
                  }
                  return text;
                }, "")
              : JSON.stringify(version.content),
          currentVersionId: restoredVersion.id,
          latestVersionId: restoredVersion.id,
          lastContentHash: generateContentHash(version.content),
          updatedAt: new Date(),
        },
      });

      return {
        restoredVersion,
        snapshotVersion,
        originalVersion: version,
      };
    });

    res.json({
      message: "Version restored successfully",
      ...result,
    });
  } catch (error) {
    console.error("Error restoring version:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route GET /versions/version/:id1/diff/:id2
 * @desc Get diff between two versions
 */
router.get("/version/:id1/diff/:id2", authenticate, async (req, res) => {
  try {
    const { id1, id2 } = req.params;

    const versions = await prisma.version.findMany({
      where: { id: { in: [id1, id2] } },
      select: {
        id: true,
        label: true,
        content: true,
        sequenceNumber: true,
        wordCount: true,
        characterCount: true,
        createdAt: true,
      },
    });

    if (versions.length !== 2) {
      return res.status(404).json({ error: "One or both versions not found" });
    }

    const [version1, version2] = versions.sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber
    );

    // Calculate detailed diff
    const diff = {
      from: {
        id: version1.id,
        label: version1.label,
        sequenceNumber: version1.sequenceNumber,
        wordCount: version1.wordCount,
        characterCount: version1.characterCount,
        createdAt: version1.createdAt,
      },
      to: {
        id: version2.id,
        label: version2.label,
        sequenceNumber: version2.sequenceNumber,
        wordCount: version2.wordCount,
        characterCount: version2.characterCount,
        createdAt: version2.createdAt,
      },
      changes: {
        wordCountDiff: (version2.wordCount || 0) - (version1.wordCount || 0),
        characterCountDiff:
          (version2.characterCount || 0) - (version1.characterCount || 0),
        contentDiff: calculateDiff(version1.content, version2.content),
      },
    };

    res.json(diff);
  } catch (error) {
    console.error("Error calculating diff:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route POST /versions/version/:id/snapshot
 * @desc Create a snapshot from an existing version
 */
router.post("/version/:id/snapshot", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { label, reason, tags = [] } = req.body;

    const sourceVersion = await prisma.version.findUnique({
      where: { id },
      select: {
        docId: true,
        content: true,
        label: true,
        sequenceNumber: true,
      },
    });

    if (!sourceVersion) {
      return res.status(404).json({ error: "Source version not found" });
    }

    const latestSeq = await prisma.version.findFirst({
      where: { docId: sourceVersion.docId },
      orderBy: { sequenceNumber: "desc" },
      select: { sequenceNumber: true },
    });

    const snapshot = await prisma.version.create({
      data: {
        docId: sourceVersion.docId,
        label: label || `Snapshot of: ${sourceVersion.label}`,
        content: sourceVersion.content,
        userId: req.user.id,
        sequenceNumber: (latestSeq?.sequenceNumber || 0) + 1,
        changeType: "snapshot",
        changeSummary: `Snapshot created from version ${sourceVersion.sequenceNumber}`,
        parentVersionId: id,
        isSnapshot: true,
        snapshotReason: reason || "Manual snapshot",
        tags,
        contentHash: generateContentHash(sourceVersion.content),
        wordCount: calculateWordCount(sourceVersion.content),
        characterCount: calculateCharacterCount(sourceVersion.content),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            picture: true,
          },
        },
      },
    });

    res.status(201).json(snapshot);
  } catch (error) {
    console.error("Error creating snapshot:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route GET /versions/:docId/timeline
 * @desc Get version timeline for a document
 */
router.get("/:docId/timeline", authenticate, async (req, res) => {
  try {
    const { docId } = req.params;
    const { startDate, endDate, branchName } = req.query;

    let whereClause = { docId };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    if (branchName) {
      whereClause.branchName = branchName;
    }

    const timeline = await prisma.version.findMany({
      where: whereClause,
      select: {
        id: true,
        label: true,
        sequenceNumber: true,
        changeType: true,
        changeSummary: true,
        changeCount: true,
        isAutosave: true,
        isSnapshot: true,
        isPublished: true,
        branchName: true,
        isMerge: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            picture: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by date for timeline visualization
    const groupedTimeline = timeline.reduce((acc, version) => {
      const date = version.createdAt.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(version);
      return acc;
    }, {});

    res.json({
      timeline: groupedTimeline,
      summary: {
        totalVersions: timeline.length,
        autoSaves: timeline.filter((v) => v.isAutosave).length,
        snapshots: timeline.filter((v) => v.isSnapshot).length,
        published: timeline.filter((v) => v.isPublished).length,
        branches: [
          ...new Set(timeline.map((v) => v.branchName).filter(Boolean)),
        ],
      },
    });
  } catch (error) {
    console.error("Error fetching timeline:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @route DELETE /versions/version/:id
 * @desc Delete a specific version (with safety checks)
 */
router.delete("/version/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;

    // Check if the version exists and get its metadata
    const version = await prisma.version.findUnique({
      where: { id },
      include: {
        children: true,
        doc: {
          select: {
            currentVersionId: true,
            latestVersionId: true,
          },
        },
      },
    });

    if (!version) {
      return res.status(404).json({ error: "Version not found" });
    }

    // Safety checks
    if (!force) {
      if (version.doc.currentVersionId === id) {
        return res.status(400).json({
          error:
            "Cannot delete current version. Please restore to a different version first.",
          code: "CURRENT_VERSION",
        });
      }

      if (version.isPublished) {
        return res.status(400).json({
          error: "Cannot delete published version. Use force=true to override.",
          code: "PUBLISHED_VERSION",
        });
      }

      if (version.children.length > 0) {
        return res.status(400).json({
          error:
            "Cannot delete version with children. Use force=true to override.",
          code: "HAS_CHILDREN",
        });
      }
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
 * @desc Update version metadata (label, tags, etc.)
 */
router.patch("/version/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      label,
      changeSummary,
      tags,
      isSnapshot,
      snapshotReason,
      isPublished,
    } = req.body;

    const updateData = {};
    if (label !== undefined) updateData.label = label;
    if (changeSummary !== undefined) updateData.changeSummary = changeSummary;
    if (tags !== undefined) updateData.tags = tags;
    if (isSnapshot !== undefined) updateData.isSnapshot = isSnapshot;
    if (snapshotReason !== undefined)
      updateData.snapshotReason = snapshotReason;
    if (isPublished !== undefined) {
      updateData.isPublished = isPublished;
      if (isPublished) {
        updateData.publishedAt = new Date();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields provided for update" });
    }

    const updatedVersion = await prisma.version.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            picture: true,
          },
        },
      },
    });

    res.json(updatedVersion);
  } catch (error) {
    console.error("Error updating version:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
