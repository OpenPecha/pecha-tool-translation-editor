const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/authenticate");
const { diff_match_patch } = require("diff-match-patch");
const Delta = require('quill-delta');

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


    const oldDelta = previousVersion ? new Delta(previousVersion.content?.ops) : new Delta();
    const newDelta = new Delta(currentVersion.content?.ops);
    const diffs1 = markDiff(oldDelta, newDelta);

    const diffs = oldDelta?.compose(new Delta(diffs1));
    return res.json({
      diffs,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});



function markDiff(oldDelta, newDelta) {
  const diff = oldDelta.diff(newDelta);
  const finalDiff = { ops: [] };

  let oldIndex = 0;

  for (let op of diff.ops) {
    if (op.insert) {
      // Style inserted text
      finalDiff.ops.push({
        insert: op.insert,
        attributes: {
          ...(op.attributes || {}),
          background: "#cce8cc",
          color: "#003700",
        },
      });
    } else if (op.delete) {
      // Get deleted text from oldDelta
      let deletedText = "";
      while (op.delete > 0 && oldIndex < oldDelta.ops.length) {
        const oldOp = oldDelta.ops[oldIndex];
        if (typeof oldOp.insert === "string") {
          const take = Math.min(op.delete, oldOp.insert.length);
          deletedText += oldOp.insert.slice(0, take);
          oldDelta.ops[oldIndex].insert = oldOp.insert.slice(take); // trim taken
          op.delete -= take;
          if (oldDelta.ops[oldIndex].insert.length === 0) oldIndex++;
        } else {
          oldIndex++;
        }
      }

      finalDiff.ops.push({
        insert: deletedText,
        attributes: {
          background: "#e8cccc",
          color: "#370000",
          strike: true,
        },
      });
    } else if (op.retain) {
      // Preserve retained ops temporarily (will merge below)
      finalDiff.ops.push({ retain: op.retain, attributes: op.attributes });
    }
  }

  // Handle formatting-only changes
  const formattedDiff = [];
  const oldOps = oldDelta.ops || [];
  const newOps = newDelta.ops || [];
  const len = Math.min(oldOps.length, newOps.length);

  for (let i = 0; i < len; i++) {
    const oldOp = oldOps[i];
    const newOp = newOps[i];

    if (oldOp.insert === newOp.insert) {
      const oldAttrs = oldOp.attributes || {};
      const newAttrs = newOp.attributes || {};

      if (JSON.stringify(oldAttrs) !== JSON.stringify(newAttrs)) {
        formattedDiff.push({
          insert: newOp.insert,
          attributes: {
            background: "#fff3cd",
            color: "#856404",
            ...newAttrs,
          },
        });
      } else {
        formattedDiff.push(newOp);
      }
    } else {
      formattedDiff.push(newOp);
    }
  }

  // Merge step to overwrite unstyled parts with formatted ones
  const mergedOps = finalDiff.ops.map(op => {
    if (op.insert && (!op.attributes || Object.keys(op.attributes).length === 0)) {
      const match = formattedDiff.find(f => f.insert === op.insert);
      return match || op;
    }
    return op;
  });

  return { ops: mergedOps };
}



module.exports = router;
