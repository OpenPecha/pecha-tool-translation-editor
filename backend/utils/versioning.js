const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Utility functions for versioning
const generateContentHash = (content) => {
  // Handle both string content and Delta objects for backward compatibility
  if (typeof content === "string") {
    return crypto.createHash("sha256").update(content).digest("hex");
  }
  // If it's a Delta object, extract text and hash that
  if (content && content.ops) {
    const textContent = content.ops.reduce((text, op) => {
      if (typeof op.insert === "string") {
        return text + op.insert;
      }
      return text;
    }, "");
    return crypto.createHash("sha256").update(textContent).digest("hex");
  }
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
};

const calculateWordCount = (content) => {
  // Handle string content
  if (typeof content === "string") {
    return content.split(/\s+/).filter((word) => word.length > 0).length;
  }
  // Handle Delta objects for backward compatibility
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
  // Handle string content
  if (typeof content === "string") {
    return content.length;
  }
  // Handle Delta objects for backward compatibility
  if (!content || !content.ops) return 0;
  return content.ops.reduce((count, op) => {
    if (typeof op.insert === "string") {
      return count + op.insert.length;
    }
    return count;
  }, 0);
};

const calculateDiff = (oldContent, newContent) => {
  return {
    type: "content_change",
    oldHash: generateContentHash(oldContent),
    newHash: generateContentHash(newContent),
    timestamp: new Date(),
  };
};

/**
 * Check if content has significantly changed to warrant a new version
 * @param {Object} oldContent - Previous content
 * @param {Object} newContent - New content
 * @param {Object} options - Configuration options
 * @returns {boolean} - Whether content change is significant
 */
const isSignificantChange = (oldContent, newContent, options = {}) => {
  const { minWordDiff = 5, minCharDiff = 50, forceCreate = false } = options;

  if (forceCreate) return true;
  if (!oldContent) return true;

  const oldWordCount = calculateWordCount(oldContent);
  const newWordCount = calculateWordCount(newContent);
  const oldCharCount = calculateCharacterCount(oldContent);
  const newCharCount = calculateCharacterCount(newContent);

  const wordDiff = Math.abs(newWordCount - oldWordCount);
  const charDiff = Math.abs(newCharCount - oldCharCount);

  return wordDiff >= minWordDiff || charDiff >= minCharDiff;
};

/**
 * Create a new version automatically when content changes
 * @param {Object} params - Parameters for version creation
 * @returns {Object} - Created version or null if no significant change
 */
const createAutoVersion = async ({
  docId,
  content,
  userId,
  changeType = "content",
  changeSummary,
  isSnapshot = false,
  workflowId = null,
  forceCreate = false,
}) => {
  try {
    // Get the latest version and document info
    const [latestVersion, document] = await Promise.all([
      prisma.version.findFirst({
        where: { docId },
        orderBy: { sequenceNumber: "desc" },
        select: {
          sequenceNumber: true,
          content: true,
          contentHash: true,
          createdAt: true,
        },
      }),
      prisma.doc.findUnique({
        where: { id: docId },
        select: {
          lastContentHash: true,
          autoSaveInterval: true,
          versioningStrategy: true,
        },
      }),
    ]);

    // Check if change is significant enough to create a version
    if (!isSnapshot && !forceCreate) {
      const contentHash = generateContentHash(content);

      // If content hash is the same, no change
      if (latestVersion && latestVersion.contentHash === contentHash) {
        return null;
      }

      // Check if change is significant
      if (
        !isSignificantChange(latestVersion?.content, content, { forceCreate })
      ) {
        return null;
      }

      // Check auto-save interval (only create if enough time has passed)
      if (latestVersion && document?.autoSaveInterval) {
        const timeSinceLastVersion =
          Date.now() - new Date(latestVersion.createdAt).getTime();
        const intervalMs = document.autoSaveInterval * 1000;

        if (timeSinceLastVersion < intervalMs) {
          return null;
        }
      }
    }

    const sequenceNumber = latestVersion ? latestVersion.sequenceNumber + 1 : 1;
    const contentHash = generateContentHash(content);
    const wordCount = calculateWordCount(content);
    const characterCount = calculateCharacterCount(content);

    // Calculate diff if there's a previous version
    let contentDiff = null;
    let changeCount = 0;
    if (latestVersion) {
      contentDiff = calculateDiff(latestVersion.content, content);
      changeCount = content.ops ? content.ops.length : 0;
    }

    // Auto-generate summary if not provided
    const finalChangeSummary =
      changeSummary ||
      (isSnapshot
        ? `Manual snapshot ${sequenceNumber}`
        : `Auto-save ${sequenceNumber} - ${changeCount} changes`);

    // Create the version in a transaction with timeout
    const result = await prisma.$transaction(
      async (tx) => {
        // Create the version
        const version = await tx.version.create({
          data: {
            docId,
            label: isSnapshot
              ? `Snapshot ${sequenceNumber}`
              : `Auto-save ${sequenceNumber}`,
            content,
            userId,
            sequenceNumber,
            changeType,
            changeSummary: finalChangeSummary,
            changeCount,
            wordCount,
            characterCount,
            contentDiff,
            isSnapshot,
            contentHash,
            isAutosave: !isSnapshot,
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

        // Update workflow if provided
        if (workflowId) {
          await tx.versionWorkflow.update({
            where: { id: workflowId },
            data: {
              endVersionId: version.id,
              lastActivityAt: new Date(),
              autoSaveCount: { increment: 1 },
              totalChanges: { increment: changeCount },
              contentChanges: { increment: changeCount },
            },
          });
        }

        return version;
      },
      {
        timeout: 10000, // 10 second timeout for version creation
      }
    );

    return result;
  } catch (error) {
    console.error("Error creating auto version:", error);
    throw error;
  }
};

/**
 * Start a new version workflow session
 * @param {Object} params - Workflow parameters
 * @returns {Object} - Created workflow
 */
const startVersionWorkflow = async ({
  docId,
  userId,
  workflowType = "editing",
  sessionId = null,
}) => {
  try {
    const finalSessionId = sessionId || crypto.randomUUID();

    const workflow = await prisma.versionWorkflow.create({
      data: {
        docId,
        userId,
        sessionId: finalSessionId,
        workflowType,
        status: "active",
        startedAt: new Date(),
        lastActivityAt: new Date(),
      },
    });

    return workflow;
  } catch (error) {
    console.error("Error starting version workflow:", error);
    throw error;
  }
};

/**
 * Complete a version workflow session
 * @param {string} workflowId - ID of the workflow to complete
 * @returns {Object} - Updated workflow
 */
const completeVersionWorkflow = async (workflowId) => {
  try {
    const workflow = await prisma.versionWorkflow.update({
      where: { id: workflowId },
      data: {
        status: "completed",
        completedAt: new Date(),
        duration: prisma.raw(`EXTRACT(EPOCH FROM (NOW() - "startedAt"))`),
      },
    });

    return workflow;
  } catch (error) {
    console.error("Error completing version workflow:", error);
    throw error;
  }
};

/**
 * Update workflow activity
 * @param {string} workflowId - ID of the workflow
 * @param {Object} updates - Updates to apply
 */
const updateWorkflowActivity = async (workflowId, updates = {}) => {
  try {
    await prisma.versionWorkflow.update({
      where: { id: workflowId },
      data: {
        lastActivityAt: new Date(),
        ...updates,
      },
    });
  } catch (error) {
    console.error("Error updating workflow activity:", error);
  }
};

/**
 * Get active workflow for a document and user
 * @param {string} docId - Document ID
 * @param {string} userId - User ID
 * @returns {Object} - Active workflow or null
 */
const getActiveWorkflow = async (docId, userId) => {
  try {
    const workflow = await prisma.versionWorkflow.findFirst({
      where: {
        docId,
        userId,
        status: "active",
      },
      orderBy: { startedAt: "desc" },
    });

    return workflow;
  } catch (error) {
    console.error("Error getting active workflow:", error);
    return null;
  }
};

module.exports = {
  generateContentHash,
  calculateWordCount,
  calculateCharacterCount,
  calculateDiff,
  isSignificantChange,
  createAutoVersion,
  startVersionWorkflow,
  completeVersionWorkflow,
  updateWorkflowActivity,
  getActiveWorkflow,
};
