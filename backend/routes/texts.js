const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const authenticate = require("../middleware/authenticate");
const { diff_match_patch } = require("diff-match-patch");

const prisma = new PrismaClient();
const dmp = new diff_match_patch();
// Create a new root text
router.post("/root", authenticate, async (req, res) => {
  try {
    const { title, content, language } = req.body;

    if (!title || !language) {
      return res.status(400).json({
        error: "Title and language are required",
      });
    }

    const rootDoc = await prisma.doc.create({
      data: {
        title,
        identifier: `root-${Date.now()}`,
        language,
        isRoot: true,
        docs_prosemirror_delta: content ? { content } : null,
        ownerId: req.user.id,
      },
    });

    res.json({
      success: true,
      data: rootDoc,
    });
  } catch (error) {
    console.error("Error creating root text:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all root texts
router.get("/root", async (req, res) => {
  try {
    const rootDocs = await prisma.doc.findMany({
      where: {
        isRoot: true,
      },
      include: {
        translations: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: rootDocs,
    });
  } catch (error) {
    console.error("Error fetching root texts:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific root text with its translations
router.get("/root/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rootDoc = await prisma.doc.findUnique({
      where: {
        id,
        isRoot: true,
      },
      include: {
        translations: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!rootDoc) {
      return res.status(404).json({ error: "Root text not found" });
    }

    res.json({
      success: true,
      data: rootDoc,
    });
  } catch (error) {
    console.error("Error fetching root text:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a translation for a root text
router.post("/translation", authenticate, async (req, res) => {
  try {
    const { rootId, title, content, language } = req.body;

    if (!rootId || !title || !language) {
      return res.status(400).json({
        error: "Root ID, title, and language are required",
      });
    }

    // Check if root text exists
    const rootDoc = await prisma.doc.findUnique({
      where: {
        id: rootId,
        isRoot: true,
      },
    });

    if (!rootDoc) {
      return res.status(404).json({ error: "Root text not found" });
    }

    const translation = await prisma.doc.create({
      data: {
        title,
        identifier: `translation-${Date.now()}`,
        language,
        isRoot: false,
        rootId,
        docs_prosemirror_delta: content ? { content } : null,
        ownerId: req.user.id,
      },
    });

    res.json({
      success: true,
      data: translation,
    });
  } catch (error) {
    console.error("Error creating translation:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all translations for a root text
router.get("/translations/:rootId", async (req, res) => {
  try {
    const { rootId } = req.params;
    const translations = await prisma.doc.findMany({
      where: {
        rootId,
        isRoot: false,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: translations,
    });
  } catch (error) {
    console.error("Error fetching translations:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get diff between current and previous version
router.get("/version-diff/:versionId", async (req, res) => {
  const { versionId } = req.params;

  try {
    // Fetch the current version
    const currentVersion = await prisma.version.findUnique({
      where: { id: versionId },
      select: {
        content: true,
        docId: true,
        timestamp: true,
      },
    });

    if (!currentVersion) {
      return res.status(404).json({ error: "Version not found" });
    }

    // Find the previous version of the same doc based on timestamp
    const previousVersion = await prisma.version.findFirst({
      where: {
        docId: currentVersion.docId,
        timestamp: {
          lt: currentVersion.timestamp,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      select: {
        content: true,
      },
    });

    let previousText = "";
    if (previousVersion) {
      previousText =
        previousVersion.content?.ops?.map((op) => op.insert || "").join("") ||
        "";
    }

    if (!previousVersion) {
      previousText = "";
    }

    // Extract text content from version content
    const currentText =
      currentVersion.content?.ops?.map((op) => op.insert || "").join("") || "";

    // Compute the diff
    const diffs = dmp.diff_main(previousText, currentText);
    dmp.diff_cleanupSemantic(diffs);

    // Format diffs into a more readable structure
    // const formattedDiffs = diffs
    //   .map(([type, text]) => ({
    //     type: type === 1 ? "added" : type === -1 ? "removed" : "unchanged",
    //     text,
    //   }))
    //   .filter((diff) => diff.type !== "unchanged" || diff.text.trim());

    return res.json({
      diffs: diffs,
      previousText,
      currentText,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
