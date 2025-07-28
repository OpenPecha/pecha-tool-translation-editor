const express = require("express");
const {
  authenticate,
  optionalAuthenticate,
} = require("../middleware/authenticate");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const { WSSharedDoc } = require("../services");
const Y = require("yjs");
const Delta = require("quill-delta");
const {
  sendTranslationRequest,
  getTranslationStatus,
  getHealthWorker,
} = require("../apis/translation_worker");
const {
  createAutoVersion,
  getActiveWorkflow,
  startVersionWorkflow,
  updateWorkflowActivity,
} = require("../utils/versioning");

const prisma = new PrismaClient();
const router = express.Router();

/**
 * Check if a user has permission to access a document
 * @param {Object} document - The document object with rootsProject information
 * @param {string} userId - The ID of the user to check permissions for
 * @returns {boolean} - Whether the user has permission to access the document
 */
async function checkDocumentPermission(document, userId) {
  // If the document doesn't exist, no permission
  if (!document) return false;
  // If the document's project is public, everyone has read access
  if (document.rootsProject && document.rootsProject.isPublic) return true;

  // If no user provided (anonymous), they can only access public documents
  if (!userId) return false;

  // Check if user is the owner of the document
  if (document.ownerId === userId) return true;

  // Check if user is the owner of the project
  if (document.rootsProject && document.rootsProject.ownerId === userId) {
    return true;
  }

  // Check if user has explicit permission in the project
  if (document.rootsProject && document.rootsProject.permissions) {
    const userPermission = document.rootsProject.permissions.find(
      (permission) => permission.userId === userId
    );

    if (userPermission) {
      return true;
    }
  }

  // Check if user has explicit permission on the document
  if (document.permissions) {
    const userPermission = document.permissions.find(
      (permission) => permission.userId === userId
    );

    if (userPermission) {
      return true;
    }
  }

  // No permission found
  return false;
}

/**
 * Check if a user has write permission to a document
 * @param {Object} document - The document object with rootsProject information
 * @param {string} userId - The ID of the user to check permissions for (can be undefined for anonymous users)
 * @returns {boolean} - Whether the user has write permission to the document
 */
async function checkDocumentWritePermission(document, userId) {
  // If the document doesn't exist, no permission
  if (!document) return false;

  // If the document's project is public and allows editing, anyone with a user ID can write
  if (
    userId &&
    document.rootsProject &&
    document.rootsProject.isPublic &&
    document.rootsProject.publicAccess === "editor"
  ) {
    return true;
  }

  // Anonymous users never have write access
  if (!userId) return false;

  // Check if user is the owner of the document
  if (document.ownerId === userId) return true;

  // Check if user is the owner of the project
  if (document.rootsProject && document.rootsProject.ownerId === userId) {
    return true;
  }

  // Check if user has explicit write permission in the project
  if (document.rootsProject && document.rootsProject.permissions) {
    const userPermission = document.rootsProject.permissions.find(
      (permission) => permission.userId === userId && permission.canWrite
    );

    if (userPermission) {
      return true;
    }
  }

  // Check if user has explicit write permission on the document
  if (document.permissions) {
    const userPermission = document.permissions.find(
      (permission) => permission.userId === userId && permission.canWrite
    );

    if (userPermission) {
      return true;
    }
  }

  // No write permission found
  return false;
}

const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage to keep files as buffers
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});

/**
 * GET /documents/public/{id}
 * @summary Get a public document by ID (no authentication required)
 * @tags Documents - Public document access
 * @param {string} id.path.required - Document ID
 * @return {object} 200 - Document details
 * @return {object} 403 - Document is not public
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.get("/public/:id", optionalAuthenticate, async (req, res) => {
  try {
    const document = await prisma.doc.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        identifier: true,
        ownerId: true,
        language: true,
        isRoot: true,
        rootId: true,
        content: true,
        translationStatus: true,
        translationJobId: true,
        createdAt: true,
        updatedAt: true,
        rootProjectId: true,
        permissions: true,
        rootsProject: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!document) return res.status(404).json({ error: "Document not found" });

    // Check if user has permission to access this document
    const hasPermission = await checkDocumentPermission(document, req.user?.id);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "This document is not publicly accessible",
      });
    }

    // Determine access level from project settings
    const publicAccess = document.rootsProject?.publicAccess || "viewer";
    const isReadOnly =
      publicAccess === "viewer" ||
      !req.user ||
      !(await checkDocumentWritePermission(document, req.user.id));

    // Return document with read-only flag for public access
    const responseDocument = {
      ...document,
      isReadOnly,
      publicAccess,
      inheritedFromProject: document.rootsProject?.isPublic || false,
    };

    res.json(responseDocument);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving document" });
  }
});

/**
 * POST /documents
 * @summary Create a new document
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {object} request.body.required - Document information
 * @param {string} request.body.identifier - Unique identifier for the document
 * @param {string} request.body.name - Name of the document
 * @param {string} request.body.language - Language of the document
 * @param {boolean} request.body.isRoot - Whether this is a root document
 * @param {string} request.body.rootId - ID of the root document (if not a root document)
 * @param {file} request.file - Text file to upload (optional)
 * @return {object} 201 - Created document
 * @return {object} 400 - Bad request
 * @return {object} 500 - Server error
 */
router.post("/", authenticate, upload.single("file"), async (req, res) => {
  try {
    const { identifier, isRoot, rootId, language, name } = req.body;

    // Validate required fields
    if (!identifier) {
      return res
        .status(400)
        .json({ error: "Missing identifier in request body" });
    }
    if (!name) {
      return res.status(400).json({ error: "Missing name in request body" });
    }
    if (!language) {
      return res
        .status(400)
        .json({ error: "Missing language in request body" });
    }

    const doc = new WSSharedDoc(identifier, req.user.id);
    // Update the Y.doc with file content
    const prosemirrorText = doc.getText(identifier);
    if (req?.file && req.file.buffer) {
      try {
        const textContent = req.file.buffer.toString("utf-8");
        if (textContent) {
          prosemirrorText.delete(0, prosemirrorText.length);
          prosemirrorText.insert(0, textContent);
        }
      } catch (error) {
        console.error("Error processing file content:", error);
        throw new Error("Invalid file format or encoding");
      }
    }
    const delta = prosemirrorText.toDelta();
    const state = Y.encodeStateAsUpdateV2(doc);

    const document = await prisma.$transaction(async (tx) => {
      let rootProjectId = null;
      if (rootId) {
        const rootDoc = await prisma.doc.findUnique({
          where: { id: rootId },
          select: { rootProjectId: true },
        });
        rootProjectId = rootDoc?.rootProjectId;
      }
      const doc = await tx.doc.create({
        data: {
          id: identifier,
          identifier,
          name,
          ownerId: req.user.id,
          content: prosemirrorText.toString(),
          docs_y_doc_state: state,
          isRoot: isRoot === "true",
          rootId: rootId ?? null,
          language,
          rootProjectId: rootProjectId,
        },
        select: {
          id: true,
          name: true,
        },
      });
      await tx.permission.create({
        data: {
          docId: doc.id,
          userId: req.user.id,
          canRead: true,
          canWrite: true,
          accessLevel: "admin", // Document owner gets admin access
        },
      });
      // Create initial version using enhanced versioning system
      const initialVersion = await tx.version.create({
        data: {
          content: prosemirrorText.toString(),
          docId: doc.id,
          userId: req.user.id,
          label: "Initial version",
          sequenceNumber: 1,
          changeType: "creation",
          changeSummary: "Document created",
          isSnapshot: true,
          snapshotReason: "Initial document creation",
          contentHash: require("crypto")
            .createHash("sha256")
            .update(prosemirrorText.toString())
            .digest("hex"),
          wordCount: prosemirrorText
            .toString()
            .split(/\s+/)
            .filter((word) => word.length > 0).length,
          characterCount: prosemirrorText.toString().length,
        },
        select: { id: true },
      });

      // Update document with initial version tracking
      await tx.doc.update({
        where: { id: doc.id },
        data: {
          currentVersionId: initialVersion.id,
          latestVersionId: initialVersion.id,
          lastContentHash: require("crypto")
            .createHash("sha256")
            .update(prosemirrorText.toString())
            .digest("hex"),
          content: prosemirrorText.toString(),
        },
      });

      return doc;
    });

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ error: "Error creating document: " + error });
  }
});

router.post("/content", authenticate, async (req, res) => {
  try {
    const { identifier, isRoot, rootId, language, name, content } = req.body;

    console.log(identifier, isRoot, rootId, language, name);

    // Validate required fields
    if (!identifier) {
      return res
        .status(400)
        .json({ error: "Missing identifier in request body" });
    }
    if (!name) {
      return res.status(400).json({ error: "Missing name in request body" });
    }
    if (!language) {
      return res
        .status(400)
        .json({ error: "Missing language in request body" });
    }

    const doc = new WSSharedDoc(identifier, req.user.id);
    const prosemirrorText = doc.getText(identifier);
    if (content) {
      const textContent = content;
      if (textContent) {
        prosemirrorText.delete(0, prosemirrorText.length);
        prosemirrorText.insert(0, textContent);
      }
    }
    const delta = prosemirrorText.toDelta();
    const state = Y.encodeStateAsUpdateV2(doc);
    const document = await prisma.$transaction(async (tx) => {
      let rootProjectId = null;
      if (rootId) {
        const rootDoc = await prisma.doc.findUnique({
          where: { id: rootId },
          select: { rootProjectId: true },
        });
        rootProjectId = rootDoc?.rootProjectId;
      }
      const doc = await tx.doc.create({
        data: {
          id: identifier,
          identifier,
          name,
          ownerId: req.user.id,
          content: prosemirrorText.toString(),
          docs_y_doc_state: state,
          isRoot: isRoot === "true",
          rootId: rootId ?? null,
          language,
          rootProjectId: rootProjectId,
        },
        select: {
          id: true,
          name: true,
        },
      });
      await tx.permission.create({
        data: {
          docId: doc.id,
          userId: req.user.id,
          canRead: true,
          canWrite: true,
          accessLevel: "admin", // Document owner gets admin access
        },
      });
      // Create initial version using enhanced versioning system
      const versionId = await tx.version.create({
        data: {
          content: prosemirrorText.toString(),
          docId: doc.id,
          userId: req.user.id,
          label: "Initial version",
          sequenceNumber: 1,
          changeType: "creation",
          changeSummary: "Document created with content",
          isSnapshot: true,
          snapshotReason: "Initial document creation",
          contentHash: require("crypto")
            .createHash("sha256")
            .update(prosemirrorText.toString())
            .digest("hex"),
          wordCount: prosemirrorText
            .toString()
            .split(/\s+/)
            .filter((word) => word.length > 0).length,
          characterCount: prosemirrorText.toString().length,
        },
        select: { id: true },
      });

      // Update document with initial version tracking
      await tx.doc.update({
        where: { id: doc.id },
        data: {
          currentVersionId: versionId.id,
          latestVersionId: versionId.id,
          lastContentHash: require("crypto")
            .createHash("sha256")
            .update(prosemirrorText.toString())
            .digest("hex"),
          content: prosemirrorText.toString(),
        },
      });

      return doc;
    });

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ error: "Error creating document: " + error });
  }
});

/**
 * GET /documents
 * @summary Get all documents for the authenticated user
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} search.query - Optional search term to filter documents
 * @param {boolean} isRoot.query - Optional filter for root documents only
 * @param {boolean} public.query - Optional filter for public documents
 * @return {array<object>} 200 - List of documents
 * @return {object} 500 - Server error
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const { search, isRoot, public: isPublic } = req.query;

    let whereCondition = {};

    // Filter for public documents not owned by user
    if (isPublic === "true") {
      whereCondition = {
        AND: [
          { ownerId: { not: req.user.id } },
          { rootsProject: { isPublic: true } },
        ],
      };
    } else {
      // Default filter for user's documents
      whereCondition = {
        OR: [
          { ownerId: req.user.id },
          { permissions: { some: { userId: req.user.id, canRead: true } } },
        ],
      };
    }

    // Add search filter if provided
    if (search) {
      if (whereCondition.AND) {
        // For public documents
        whereCondition.AND.push({
          name: { contains: search, mode: "insensitive" },
        });
      } else {
        // For user's documents
        whereCondition.OR = whereCondition.OR.map((condition) => ({
          ...condition,
          name: { contains: search, mode: "insensitive" },
        }));
      }
    }

    // Filter by isRoot if provided
    if (isRoot === "true") {
      whereCondition = {
        ...whereCondition,
        isRoot: true,
      };
    }

    const documents = await prisma.doc.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        identifier: true,
        ownerId: true,
        language: true,
        isRoot: true,
        translations: {
          select: {
            id: true,
            language: true,
            ownerId: true,
            permissions: true,
            updatedAt: true,
          },
        },
        updatedAt: true,
        root: {
          select: {
            name: true,
          },
        },
        rootId: true,
        rootsProject: {
          select: {
            id: true,
            name: true,
            isPublic: true,
            publicAccess: true,
          },
        },
      },
      orderBy: {
        isRoot: "desc",
      },
    });
    res.json(documents);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error fetching documents" });
  }
});
/**
 * GET /documents/{id}
 * @summary Get a specific document by ID
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Document ID
 * @return {object} 200 - Document details
 * @return {object} 403 - Forbidden - No access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const document = await prisma.doc.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        identifier: true,
        ownerId: true,
        language: true,
        isRoot: true,
        rootId: true,
        content: true,
        translationStatus: true,
        translationJobId: true,
        createdAt: true,
        updatedAt: true,
        rootProjectId: true,
        rootsProject: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!document) return res.status(404).json({ error: "Document not found" });

    // Check if user has permission to access this document
    const hasPermission = await checkDocumentPermission(document, req.user.id);

    // If document is not public and user doesn't have permission, deny access
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this document",
      });
    }

    // Decode Y.js state (if stored as Uint8Array) and convert to Delta
    let delta = [];
    if (document.docs_y_doc_state) {
      const ydoc = new Y.Doc({ gc: true });
      // Y.applyUpdate(ydoc, document.docs_y_doc_state);
      delta = ydoc.getText(document.identifier).toDelta(); // Convert to Quill-compatible Delta
    } else if (document.docs_prosemirror_delta) {
      delta = document.docs_prosemirror_delta;
    }
    res.json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving document" });
  }
});

/**
 * GET /documents/{id}/content
 * @summary Get a document's content by ID
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Document ID
 * @return {object} 200 - Document with content
 * @return {object} 403 - Forbidden - No access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.get("/:id/content", optionalAuthenticate, async (req, res) => {
  try {
    const document = await prisma.doc.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        identifier: true,
        ownerId: true,
        permissions: true,
        language: true,
        isRoot: true,
        content: true,
        rootsProject: {
          include: {
            permissions: true,
          },
        },
      },
    });
    if (!document) return res.status(404).json({ error: "Document not found" });

    // Check if user has permission to access this document
    const hasPermission = await checkDocumentPermission(document, req.user.id);

    // If document is not public and user doesn't have permission, deny access
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this document",
      });
    }

    // Decode Y.js state (if stored as Uint8Array) and convert to Delta
    let delta = [];
    if (document.docs_y_doc_state) {
      const ydoc = new Y.Doc({ gc: true });
      // Y.applyUpdate(ydoc, document.docs_y_doc_state);
      delta = ydoc.getText(document.identifier).toDelta(); // Convert to Quill-compatible Delta
    } else if (document.docs_prosemirror_delta) {
      delta = document.docs_prosemirror_delta;
    }
    res.json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving document" });
  }
});

/**
 * GET /documents/{id}/translations
 * @summary Get all translations for a document
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Document ID
 * @return {object} 200 - List of translations
 * @return {object} 403 - Forbidden - No access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.get("/:id/translations", optionalAuthenticate, async (req, res) => {
  try {
    const documentId = req.params.id;

    // First check if the document exists
    const document = await prisma.doc.findUnique({
      where: { id: documentId },
      include: {
        rootsProject: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Check if user has permission to access this document
    const hasPermission = await checkDocumentPermission(document, req.user?.id);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this document",
      });
    }

    // Get all translations for this document
    const translations = await prisma.doc.findMany({
      where: {
        rootId: documentId,
      },
      select: {
        id: true,
        name: true,
        language: true,
        ownerId: true,
        updatedAt: true,
        translationProgress: true,
        translationStatus: true,
        translationJobId: true,
        owner: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return res.json({
      success: true,
      data: translations,
    });
  } catch (error) {
    console.error("Error fetching translations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch translations",
      error: error.message,
    });
  }
});

/**
 * DELETE /documents/{id}
 * @summary Delete a document
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Document ID
 * @return {object} 200 - Success message
 * @return {object} 403 - Forbidden - No delete access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const document = await prisma.doc.findUnique({
      where: { id: req.params.id },
      include: {
        root: {
          select: {
            ownerId: true,
          },
        },
        rootsProject: {
          include: {
            permissions: true,
          },
        },
      },
    });
    if (!document) return res.status(404).json({ error: "Document not found" });

    // Check if user has permission to access this document
    const hasPermission = await checkDocumentPermission(document, req.user.id);

    // Check if user is the owner of the document or the root document
    const isOwner = document.ownerId === req.user.id;
    const isRootOwner = document.root && document.root.ownerId === req.user.id;

    // Only allow deletion by document owner, root document owner, or if user has permission
    if (!isOwner && !isRootOwner && !hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this document",
      });
    }

    // Delete the document and related permissions
    await prisma.doc.delete({ where: { id: document.id } });
    await prisma.permission.deleteMany({ where: { docId: document.id } });

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Error deleting document" });
  }
});

/**
 * POST /documents/{id}/permissions
 * @summary Add or update permissions for a user on a document
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Document ID
 * @param {object} request.body.required - Permission data
 * @param {string} request.body.email - User email
 * @param {boolean} request.body.canRead - Whether user can read the document
 * @param {boolean} request.body.canWrite - Whether user can write to the document
 * @return {object} 200 - Updated permission
 * @return {object} 403 - Forbidden - Not document owner
 * @return {object} 404 - User or document not found
 * @return {object} 500 - Server error
 */
router.post("/:id/permissions", authenticate, async (req, res) => {
  let { email, canRead, canWrite } = req.body;
  const documentId = req.params.id;
  try {
    let user = await prisma.user.findFirst({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const userId = user.id;
    // Check if the document exists
    canRead = canRead === "true" || canRead === true;
    canWrite = canWrite === "true" || canWrite === true;
    const document = await prisma.doc.findUnique({
      where: { id: documentId },
      include: {
        translations: true,
        rootsProject: {
          include: {
            permissions: true,
          },
        },
      },
    });
    if (!document) return res.status(404).json({ error: "Document not found" });

    // Check if user has permission to access this document
    const hasPermission = await checkDocumentPermission(document, req.user.id);

    // Only allow permission changes by document owner
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to modify this document",
      });
    }

    // Check if the user already has permissions
    const existingPermission = await prisma.permission.findFirst({
      where: { docId: documentId, userEmail: email },
    });

    if (existingPermission) {
      // Update existing permission
      await prisma.permission.update({
        where: { id: existingPermission.id },
        data: { canRead, canWrite },
      });
    } else {
      // Create a new permission entry
      try {
        await prisma.permission.create({
          data: {
            docId: documentId,
            userId,
            canRead,
            canWrite,
            accessLevel: canWrite ? "editor" : "viewer",
          },
        });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "user doesnt exist" });
      }
    }

    // If document is root, give same permissions to all translations
    if (document.isRoot && document.translations.length > 0) {
      for (const translation of document.translations) {
        const existingTransPermission = await prisma.permission.findFirst({
          where: { docId: translation.id, userEmail: email },
        });

        if (existingTransPermission) {
          await prisma.permission.update({
            where: { id: existingTransPermission.id },
            data: { canRead, canWrite },
          });
        } else {
          await prisma.permission.create({
            data: {
              docId: translation.id,
              userId,
              canRead,
              canWrite,
              accessLevel: canWrite ? "editor" : "viewer",
            },
          });
        }
      }
    }

    res.json({ message: "Permission granted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error granting permission" });
  }
});

// Update document's root relationship and root status
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const { rootId, isRoot, translations, identifier, name } = req.body;
    const documentId = req.params.id;

    // Check if the document exists
    const document = await prisma.doc.findUnique({
      where: { id: documentId },
      include: {
        root: true,
        rootsProject: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check if user has permission to access this document
    const hasPermission = await checkDocumentPermission(document, req.user.id);

    // If user doesn't have permission, deny access
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to edit this document",
      });
    }

    // If only name is provided, just update the name
    if (name && Object.keys(req.body).length === 1) {
      const updatedDocument = await prisma.doc.update({
        where: { id: documentId },
        data: { name },
      });

      return res.json({
        success: true,
        data: updatedDocument,
      });
    }

    // Validate the request
    if (rootId && isRoot) {
      return res.status(400).json({
        error: "A document cannot be both a root and a translation",
      });
    }

    // If translations array is provided and document is not a root, reject
    if (translations && !document.isRoot && !isRoot) {
      return res.status(400).json({
        error: "Only root documents can have translations",
      });
    }

    // If rootId is provided, verify it exists
    if (rootId) {
      const rootDoc = await prisma.doc.findUnique({
        where: { id: rootId },
      });

      if (!rootDoc) {
        return res.status(404).json({ error: "Root document not found" });
      }

      if (!rootDoc.isRoot) {
        return res.status(400).json({
          error: "Target document is not a root document",
        });
      }
    }

    // If translations array is provided, verify all documents exist
    if (translations && Array.isArray(translations)) {
      const translationDocs = await prisma.doc.findMany({
        where: {
          id: {
            in: translations,
          },
        },
      });

      if (translationDocs.length !== translations.length) {
        return res.status(400).json({
          error: "One or more translation documents not found",
        });
      }

      // Check if any of these documents are roots or already translations
      const invalidDocs = translationDocs.filter(
        (doc) => doc.isRoot || doc.rootId !== null
      );

      if (invalidDocs.length > 0) {
        return res.status(400).json({
          error: "Some documents are already roots or translations",
          invalidDocs: invalidDocs.map((d) => d.id),
        });
      }
    }

    // Prepare the update data
    const updateData = {
      rootId: rootId || null,
      isRoot: isRoot ?? (rootId ? false : document.isRoot),
      // Only update identifier if explicitly provided, otherwise keep the original
      identifier: identifier || document.identifier,
      // Update name if provided
      name: name || document.name,
    };

    // Update the document and its translations in a transaction
    const updatedDocument = await prisma.$transaction(async (tx) => {
      // Update the main document
      const updated = await tx.doc.update({
        where: { id: documentId },
        data: updateData,
        select: {
          root: true,
          translations: {
            select: {
              id: true,
            },
          },
        },
      });

      // If translations array is provided and document is/will be a root,
      // update all translation documents
      if (
        translations &&
        Array.isArray(translations) &&
        (document.isRoot || isRoot)
      ) {
        await tx.doc.updateMany({
          where: {
            id: {
              in: translations,
            },
          },
          data: {
            rootId: documentId,
            isRoot: false,
            // Only update name for translations, keep identifier the same
            name: name || document.name,
          },
        });

        // Fetch the updated document with all relationships
        return await tx.doc.findUnique({
          where: { id: documentId },
          include: {
            root: true,
            translations: {
              select: { id: true },
            },
          },
        });
      }

      return updated;
    });

    res.json({
      success: true,
      data: updatedDocument,
    });
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update document content with automatic versioning
/**
 * PATCH /documents/{id}/content
 * @summary Update document content with automatic versioning
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Document ID
 * @param {object} request.body.required - Content update data
 * @param {object} request.body.docs_prosemirror_delta - ProseMirror delta
 * @param {boolean} request.body.createSnapshot - Whether to create a snapshot version
 * @param {string} request.body.workflowId - Optional workflow ID for tracking
 * @param {string} request.body.changeSummary - Optional summary of changes
 * @return {object} 200 - Success response with updated document and version info
 * @return {object} 403 - Forbidden - No edit access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.patch("/:id/content", authenticate, async (req, res) => {
  const {
    docs_prosemirror_delta,
    content, // Accept plain text content
    createSnapshot = false,
    workflowId,
    changeSummary,
    sessionId,
  } = req.body;

  try {
    // Get document with extended information for versioning
    const document = await prisma.doc.findUnique({
      where: { id: req.params.id },
      select: {
        ownerId: true,
        id: true,
        rootProjectId: true,
        content: true,
        lastContentHash: true,
        versioningStrategy: true,
        autoSaveInterval: true,
        currentVersionId: true,
        latestVersionId: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check permissions
    if (document.ownerId !== req.user.id) {
      const permission = await prisma.permission.findFirst({
        where: {
          projectId: document.rootProjectId,
          userId: req.user.id,
          canWrite: true,
        },
      });
      if (!permission) {
        return res.status(403).json({ error: "No edit access" });
      }
    }

    if (!docs_prosemirror_delta && !content) {
      return res
        .status(400)
        .json({ error: "Missing content or content delta" });
    }

    // Get or create active workflow
    let activeWorkflow = null;
    if (workflowId) {
      activeWorkflow = await prisma.versionWorkflow.findUnique({
        where: { id: workflowId },
      });
    } else {
      activeWorkflow = await getActiveWorkflow(document.id, req.user.id);

      // Start new workflow if none exists
      if (!activeWorkflow) {
        activeWorkflow = await startVersionWorkflow({
          docId: document.id,
          userId: req.user.id,
          workflowType: "editing",
          sessionId,
        });
      }
    }

    // Process the content update in a transaction with increased timeout
    const result = await prisma.$transaction(
      async (tx) => {
        // Extract plain text content
        let plainTextContent = "";
        if (content) {
          // Direct plain text content
          plainTextContent = content;
        } else if (docs_prosemirror_delta && docs_prosemirror_delta.ops) {
          // Extract from Delta format (legacy support)
          plainTextContent = docs_prosemirror_delta.ops.reduce((text, op) => {
            if (typeof op.insert === "string") {
              return text + op.insert;
            }
            return text;
          }, "");
        }

        // Update document content
        const updatedDocument = await tx.doc.update({
          where: { id: document.id },
          data: {
            content: plainTextContent,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            content: true,
            updatedAt: true,
          },
        });

        // Note: Versioning moved outside transaction to prevent timeout
        return {
          document: updatedDocument,
          workflow: activeWorkflow,
        };
      },
      {
        timeout: 15000, // Increase timeout to 15 seconds for complex versioning operations
      }
    );

    // Handle versioning operations outside main transaction to prevent timeout
    let versionResult = null;
    try {
      // Only create versions for snapshots or if significant changes
      if (
        createSnapshot ||
        changeSummary ||
        (docs_prosemirror_delta &&
          docs_prosemirror_delta.annotations &&
          docs_prosemirror_delta.annotations.length > 0)
      ) {
        versionResult = await createAutoVersion({
          docId: document.id,
          content: content || docs_prosemirror_delta, // Use plain content or delta
          userId: req.user.id,
          changeType: createSnapshot ? "snapshot" : "content",
          changeSummary:
            changeSummary ||
            `Content updated${
              content
                ? " (plain text)"
                : ` with ${
                    docs_prosemirror_delta.annotations?.length || 0
                  } annotations`
            }`,
          isSnapshot: createSnapshot,
          workflowId: activeWorkflow?.id,
          forceCreate: createSnapshot,
        });
      }
    } catch (versionError) {
      console.warn(
        "Version creation failed, continuing with content update:",
        versionError
      );
    }

    // Update workflow activity outside main transaction
    if (activeWorkflow) {
      try {
        await updateWorkflowActivity(activeWorkflow.id, {
          contentChanges: { increment: 1 },
          totalChanges: { increment: 1 },
        });
      } catch (workflowError) {
        console.warn("Workflow update failed:", workflowError);
      }
    }

    // Prepare response
    const response = {
      success: true,
      document: result.document,
      versionCreated: !!versionResult,
      workflowId: result.workflow?.id,
    };

    if (versionResult) {
      response.version = {
        id: versionResult.id,
        label: versionResult.label,
        sequenceNumber: versionResult.sequenceNumber,
        isSnapshot: versionResult.isSnapshot,
        changeCount: versionResult.changeCount,
        wordCount: versionResult.wordCount,
        characterCount: versionResult.characterCount,
      };
    }

    res.json(response);
  } catch (error) {
    console.error("Error updating document content:", error);
    res.status(500).json({
      error: "Error updating document content",
      details: error.message,
    });
  }
});

/**
 * Convert ProseMirror delta format to Y.js delta format
 * You'll need to customize this based on your specific delta format
 */
function convertProseMirrorDeltaToYDelta(prosemirrorDelta) {
  // This is a simplified example - your actual conversion will depend on
  // the specific structure of your ProseMirror delta
  const yDelta = [];

  // If prosemirrorDelta is an array of operations
  if (Array.isArray(prosemirrorDelta)) {
    for (const op of prosemirrorDelta) {
      if (op.insert) {
        // Convert insert operations
        yDelta.push({ insert: op.insert });
      } else if (op.delete) {
        // Convert delete operations
        yDelta.push({ delete: op.delete });
      } else if (op.retain) {
        // Convert retain operations
        yDelta.push({ retain: op.retain });
      }
      // Add attributes if they exist
      if (op.attributes) {
        const lastOp = yDelta[yDelta.length - 1];
        if (lastOp) {
          lastOp.attributes = op.attributes;
        }
      }
    }
  } else if (typeof prosemirrorDelta === "object") {
    // If it's a single operation object
    return [prosemirrorDelta];
  }

  return yDelta;
}

// Alternative approach: If you're using prosemirror-y-binding or a similar library
// You might want to use their built-in conversion functions instead

/**
 * POST /documents/generate-translation
 * @summary Create a new empty document and trigger AI translation
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {object} request.body.required - Translation generation information
 * @param {string} request.body.rootId - ID of the root document
 * @param {string} request.body.language - Target language for translation
 * @param {string} request.body.apiKey - API key for the translation service
 * @param {string} request.body.model - AI model to use for translation
 * @param {string} request.body.provider - AI provider (OpenAI, Claude, etc.)
 * @param {string} request.body.instructions - Additional instructions for translation
 * @param {string} request.body.use_segmentation - Additional instructions for translation
 *
 * @return {object} 201 - Created document with job ID
 * @return {object} 400 - Bad request
 * @return {object} 500 - Server error
 */

const api_keys = {
  claude: process.env.CLAUDE_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
};

router.post("/generate-translation", authenticate, async (req, res) => {
  try {
    const { rootId, language, model, use_segmentation } = req.body;
    if (!model || !language) {
      return res.status(400).json({ error: "Model and language are required" });
    }
    const isTranslationWorkerHealthy = await getHealthWorker();
    if (!isTranslationWorkerHealthy) {
      return res
        .status(500)
        .json({ error: "Translation worker is not healthy" });
    }

    const apiKey = api_keys[model.split("-")[0].toLowerCase()] || "";
    if (apiKey === "") {
      return res.status(400).json({ error: "API key is required" });
    }
    if (!rootId || !language) {
      return res
        .status(400)
        .json({ error: "Root document ID and target language are required" });
    }

    // Get the root document to access its content
    const rootDoc = await prisma.doc.findUnique({
      where: { id: rootId },
      select: {
        id: true,
        name: true,
        identifier: true,
        ownerId: true,
        content: true,
        language: true,
      },
    });

    if (!rootDoc) {
      return res.status(404).json({ error: "Root document not found" });
    }

    // Generate a unique identifier for the translation
    const translationId = `${rootDoc.identifier}-${language}-${Date.now()}`;
    const translationName = `${rootDoc.name} (${language})`;

    // Create an empty document for the translation
    const doc = new WSSharedDoc(translationId, req.user.id);
    const prosemirrorText = doc.getText(translationId);
    const delta = prosemirrorText.toDelta();
    const state = Y.encodeStateAsUpdateV2(doc);

    // Create the translation document in the database
    const translationDoc = await prisma.$transaction(async (tx) => {
      // Create the document
      const doc = await tx.doc.create({
        data: {
          id: translationId,
          identifier: translationId,
          name: translationName,
          ownerId: req.user.id,
          content: prosemirrorText.toString(),
          docs_y_doc_state: state,
          isRoot: false,
          rootId: rootId,
          language,
          translationStatus: "pending", // Add status field for tracking
          translationProgress: 0, // Add progress field (0-100)
        },
      });

      // Create permission for the user
      await tx.permission.create({
        data: {
          docId: doc.id,
          userId: req.user.id,
          canRead: true,
          canWrite: true,
          accessLevel: "admin", // Document owner gets admin access
        },
      });

      return doc;
    });

    // Trigger the translation worker

    // Extract content from the root document
    let content = "";
    if (
      rootDoc.docs_prosemirror_delta &&
      Array.isArray(rootDoc.docs_prosemirror_delta)
    ) {
      content = rootDoc.docs_prosemirror_delta
        .filter((op) => op.insert)
        .map((op) => op.insert)
        .join("");
    }

    // Create the webhook URL for receiving translation results
    const serverUrl =
      process.env.SERVER_URL || `http://localhost:${process.env.PORT || 9000}`;
    const webhookUrl = `${serverUrl}/documents/translation-webhook/${translationId}`;

    console.log(`Setting up webhook URL: ${webhookUrl}`);

    // Prepare translation request data
    const translationData = {
      api_key: apiKey,
      content: content,
      metadata: {
        source_language: rootDoc.language,
        target_language: language,
        document_id: translationId, // Pass the document ID for reference
      },
      model_name: model,
      priority: 5,
      webhook: webhookUrl, // Add the webhook URL
    };
    if (typeof use_segmentation === "string") {
      translationData["use_segmentation"] = use_segmentation;
    }
    // Try to send the translation request, but use a mock implementation if it fails
    try {
      const response = await sendTranslationRequest(translationData);

      // Update the document with the translation job ID
      let updated = await prisma.doc.update({
        where: { id: translationId },
        data: {
          translationJobId: response.id,
          translationStatus: "pending",
          translationProgress: 1,
        },
      });

      // Return the created document
      res.status(201).json(updated);
    } catch (error) {
      let updated = await prisma.doc.update({
        where: { id: translationId },
        data: {
          translationJobId: null,
          translationStatus: "failed",
          translationProgress: 0,
        },
      });
      // Return the created document
      res.status(201).json({ error: error.message });
    }
  } catch (error) {
    console.error("Error generating translation:", error);
    res
      .status(500)
      .json({ error: "Error generating translation: " + error.message });
  }
});

/**
 * POST /documents/fix-empty-content
 * @summary Fix documents with null/empty content by extracting from Y.js state
 * @tags Documents - Debug operations
 * @security BearerAuth
 * @return {object} 200 - Fix results
 */
router.post("/fix-empty-content", authenticate, async (req, res) => {
  try {
    const documentsWithoutContent = await prisma.doc.findMany({
      where: {
        OR: [{ content: null }, { content: "" }],
        docs_y_doc_state: { not: null },
      },
      select: {
        id: true,
        name: true,
        content: true,
        docs_y_doc_state: true,
        docs_prosemirror_delta: true,
      },
    });

    console.log(
      `Found ${documentsWithoutContent.length} documents with empty content`
    );

    const fixResults = [];

    for (const doc of documentsWithoutContent) {
      try {
        let newContent = "";

        // Try to extract from Y.js state first
        if (doc.docs_y_doc_state) {
          try {
            const ydoc = new Y.Doc();
            Y.applyUpdate(ydoc, doc.docs_y_doc_state);
            const yText = ydoc.getText(doc.id);
            newContent = yText.toString();
          } catch (yError) {
            console.log(
              `Failed to extract from Y.js for ${doc.id}:`,
              yError.message
            );
          }
        }

        // Fallback to prosemirror delta
        if (!newContent && doc.docs_prosemirror_delta) {
          try {
            if (
              typeof doc.docs_prosemirror_delta === "object" &&
              doc.docs_prosemirror_delta.ops
            ) {
              newContent = doc.docs_prosemirror_delta.ops
                .map((op) => (typeof op.insert === "string" ? op.insert : ""))
                .join("");
            } else if (typeof doc.docs_prosemirror_delta === "string") {
              const parsed = JSON.parse(doc.docs_prosemirror_delta);
              if (parsed.ops) {
                newContent = parsed.ops
                  .map((op) => (typeof op.insert === "string" ? op.insert : ""))
                  .join("");
              }
            }
          } catch (deltaError) {
            console.log(
              `Failed to extract from delta for ${doc.id}:`,
              deltaError.message
            );
          }
        }

        if (newContent && newContent.trim()) {
          await prisma.doc.update({
            where: { id: doc.id },
            data: { content: newContent },
          });

          fixResults.push({
            id: doc.id,
            name: doc.name,
            status: "fixed",
            contentLength: newContent.length,
            contentPreview: newContent.substring(0, 100),
          });
        } else {
          fixResults.push({
            id: doc.id,
            name: doc.name,
            status: "no_extractable_content",
            contentLength: 0,
          });
        }
      } catch (error) {
        fixResults.push({
          id: doc.id,
          name: doc.name,
          status: "error",
          error: error.message,
        });
      }
    }

    res.json({
      message: `Processed ${documentsWithoutContent.length} documents`,
      results: fixResults,
      summary: {
        total: documentsWithoutContent.length,
        fixed: fixResults.filter((r) => r.status === "fixed").length,
        noContent: fixResults.filter(
          (r) => r.status === "no_extractable_content"
        ).length,
        errors: fixResults.filter((r) => r.status === "error").length,
      },
    });
  } catch (error) {
    console.error("Error fixing empty content:", error);
    res.status(500).json({ error: "Failed to fix empty content" });
  }
});

/**
 * POST /documents/translation-webhook/{id}
 * @summary Webhook endpoint for receiving translation results
 * @tags Documents - Document management operations
 * @param {string} id.path.required - Document ID
 * @param {object} request.body.required - Translation result
 * @param {string} request.body.content - Translated content
 * @return {object} 200 - Success
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.post("/translation-webhook/:id", async (req, res) => {
  try {
    const document_id = req.params.id;
    const { content, message_id, status, model_used, progress } = req.body;

    // Find the document
    const document = await prisma.doc.findUnique({
      where: { id: document_id },
      select: {
        id: true,
        identifier: true,
        ownerId: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Create a new Y.Doc to store the translated content
    const translatedDoc = new WSSharedDoc(
      document.identifier,
      document.ownerId
    );
    const translatedText = translatedDoc.getText(document.identifier);

    // Insert the translated content
    if (content) {
      translatedText.insert(0, content);
    }

    // Get the delta and state
    const translatedDelta = translatedText.toDelta();
    const translatedState = Y.encodeStateAsUpdateV2(translatedDoc);

    // Update the document with the translated content
    const data = await prisma.$transaction(async (tx) => {
      // Update the document with the translated content
      let updated = await tx.doc.update({
        where: { id: document_id },
        data: {
          content: translatedText.toString(),
          docs_y_doc_state: translatedState,
          translationStatus: status,
          metadata: {
            model_used,
            message_id,
          },
          translationProgress: progress,
        },
      });

      // Create initial version
      await tx.version.create({
        data: {
          content: { ops: translatedDelta },
          docId: document_id,
          label: "Initial translation",
        },
      });
      return updated;
    });
    console.log(
      `Translation webhook received and processed for document ${document_id}`
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error processing translation webhook:", error);
    res.status(500).json({ error: "Error processing translation webhook" });
  }
});

/**
 * GET /documents/{id}/translations/status
 * @summary Get translation status and progress for all translations of a root document
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Root document ID
 * @return {object} 200 - Translation status information
 * @return {object} 403 - Forbidden - No access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.get("/:id/translations/status", authenticate, async (req, res) => {
  try {
    const rootId = req.params.id;

    // Get all translations for this root document with minimal data - just IDs and job IDs
    const translations = await prisma.doc.findMany({
      where: {
        rootId: rootId,
      },
      select: {
        id: true,
        name: true,
        language: true,
        translationStatus: true,
        translationProgress: true,
        translationJobId: true,
        updatedAt: true,
      },
    });

    // For any translations that are in progress (started, pending, or progress), directly check with the translation worker
    // for the latest status without updating the database first
    const updatedTranslations = await Promise.all(
      translations.map(async (translation) => {
        // Only check status with translation worker if there's a job ID and translation is in progress
        if (
          translation.translationJobId &&
          (translation.translationStatus === "started" ||
            translation.translationStatus === "pending")
        ) {
          try {
            // Get the latest status directly from the translation worker (Redis-based, faster)
            const status = await getTranslationStatus(
              translation.translationJobId
            );
            console.log(status);
            // If the translation is completed, update the database to reflect the final state
            if (status.status.status_type === "completed") {
              // Update the database record to mark the translation as completed

              // Create a new Y.Doc to store the translated content
              const translatedDoc = new WSSharedDoc(
                translation.identifier,
                translation.ownerId
              );
              const translatedText = translatedDoc.getText(
                translation.identifier
              );

              // Insert the translated content
              if (status?.translated_text) {
                translatedText.insert(0, status.translated_text);
              }

              // Get the delta and state
              const translatedDelta = translatedText.toDelta();
              const translatedState = Y.encodeStateAsUpdateV2(translatedDoc);
              await prisma.doc.update({
                where: { id: translation.id },
                data: {
                  translationStatus: "completed",
                  translationProgress: 100,
                  content: translatedText.toString(),
                  docs_y_doc_state: translatedState,
                },
              });

              const newVersion = await prisma.version.create({
                data: {
                  docId: translation.id,
                  label: "auto generated",
                  content: translatedDelta,
                  userId: req.user.id,
                },
              });
            }

            if (status.status.status_type === "failed") {
              await prisma.doc.update({
                where: { id: translation.id },
                data: {
                  translationStatus: "failed",
                  translationProgress: status.status.progress,
                },
              });
            }
            // If we got a valid status, use it directly without updating the database
            if (
              status.status.status_type === "pending" ||
              status.status.status_type === "progress" ||
              status.status.status_type === "started"
            ) {
              // Return the translation with the updated status from the worker
              return {
                ...translation,
                translationStatus:
                  status.status.status_type || translation.translationStatus,
                translationProgress:
                  status.status.progress || translation.translationProgress,
                message: status?.status?.message || "",
              };
            }
          } catch (error) {
            console.error(
              `Error checking translation status for ${translation.id}:`,
              error
            );
            await prisma.doc.update({
              where: { id: translation.id },
              data: {
                translationStatus: "failed",
                translationProgress: 100,
              },
            });
            // Continue with the current status if there's an error
          }
        }
        // Return the original translation if no job ID or error occurred
        return translation;
      })
    );

    res.json(updatedTranslations);
  } catch (error) {
    console.error("Error fetching translation status:", error);
    res.status(500).json({ error: "Error fetching translation status" });
  }
});

/**
 * GET /documents/translation-status/{jobId}
 * @summary Get translation status by job ID
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} jobId.path.required - Translation job ID
 * @return {object} 200 - Translation status information
 * @return {object} 400 - Bad request - Missing job ID
 * @return {object} 500 - Server error
 */
router.get("/translation-status/:jobId", authenticate, async (req, res) => {
  try {
    const jobId = req.params.jobId;

    if (!jobId) {
      return res.status(400).json({ error: "Job ID is required" });
    }

    const status = await getTranslationStatus(jobId);
    res.json(status);
  } catch (error) {
    console.error("Error fetching translation status:", error);
    res.status(500).json({
      error: "Error fetching translation status",
      message: error.message,
    });
  }
});

/**
 * GET /documents/translation/{id}/status
 * @summary Get translation status and progress for a single translation
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Translation document ID
 * @return {object} 200 - Translation status information
 * @return {object} 403 - Forbidden - No access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.get("/translation/:id/status", authenticate, async (req, res) => {
  try {
    const translationId = req.params.id;

    // Get the specific translation
    const translation = await prisma.doc.findUnique({
      where: { id: translationId },
      select: {
        id: true,
        name: true,
        language: true,
        translationStatus: true,
        translationProgress: true,
        translationJobId: true,
        updatedAt: true,
        rootId: true,
        rootsProject: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!translation) {
      return res.status(404).json({
        success: false,
        message: "Translation not found",
      });
    }

    // Check if user has permission to access this translation
    const hasPermission = checkDocumentPermission(translation, req.user.id);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this translation",
      });
    }

    // Only check status with translation worker if there's a job ID and translation is in progress
    if (
      translation.translationJobId &&
      (translation.translationStatus === "started" ||
        translation.translationStatus === "pending")
    ) {
      try {
        // Get the latest status directly from the translation worker
        const status = await getTranslationStatus(translation.translationJobId);
        console.log(`Status for ${translationId}:`, status);

        // If the translation is completed, update the database to reflect the final state
        if (status.status.status_type === "completed") {
          // Create a new Y.Doc to store the translated content
          const translatedDoc = new WSSharedDoc(
            translation.identifier,
            translation.ownerId
          );
          const translatedText = translatedDoc.getText(translation.identifier);

          // Insert the translated content
          if (status?.translated_text) {
            translatedText.insert(0, status.translated_text);
          }

          // Get the delta and state
          const translatedDelta = translatedText.toDelta();
          const translatedState = Y.encodeStateAsUpdateV2(translatedDoc);

          await prisma.doc.update({
            where: { id: translation.id },
            data: {
              translationStatus: "completed",
              translationProgress: 100,
              content: translatedText.toString(),
              docs_y_doc_state: translatedState,
            },
          });

          await prisma.version.create({
            data: {
              docId: translation.id,
              label: "auto generated",
              content: translatedDelta,
              userId: req.user.id,
            },
          });

          // Return the updated translation
          return res.json({
            ...translation,
            translationStatus: "completed",
            translationProgress: 100,
          });
        }

        if (status.status.status_type === "failed") {
          await prisma.doc.update({
            where: { id: translation.id },
            data: {
              translationStatus: "failed",
              translationProgress: status.status.progress,
            },
          });

          return res.json({
            ...translation,
            translationStatus: "failed",
            translationProgress: status.status.progress,
          });
        }

        // If we got a valid status, return it directly without updating the database
        if (
          status.status.status_type === "pending" ||
          status.status.status_type === "progress" ||
          status.status.status_type === "started"
        ) {
          return res.json({
            ...translation,
            translationStatus:
              status.status.status_type || translation.translationStatus,
            translationProgress:
              status.status.progress || translation.translationProgress,
            message: status?.status?.message || "",
          });
        }
      } catch (error) {
        console.error(
          `Error checking translation status for ${translationId}:`,
          error
        );
        await prisma.doc.update({
          where: { id: translation.id },
          data: {
            translationStatus: "failed",
            translationProgress: 0,
          },
        });

        return res.json({
          ...translation,
          translationStatus: "failed",
          translationProgress: 0,
        });
      }
    }

    // Return the original translation if no job ID or not in progress
    res.json(translation);
  } catch (error) {
    console.error("Error fetching translation status:", error);
    res.status(500).json({ error: "Error fetching translation status" });
  }
});

/**
 * @route POST /documents/:id/snapshot
 * @summary Create a manual snapshot of the current document state
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Document ID
 * @param {object} request.body.required - Snapshot data
 * @param {string} request.body.label - Snapshot label
 * @param {string} request.body.reason - Reason for creating snapshot
 * @param {array} request.body.tags - Tags for the snapshot
 * @return {object} 201 - Created snapshot version
 * @return {object} 403 - Forbidden - No access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.post("/:id/snapshot", authenticate, async (req, res) => {
  try {
    const { label, reason, tags = [] } = req.body;
    const docId = req.params.id;

    // Check if document exists and user has access
    const document = await prisma.doc.findUnique({
      where: { id: docId },
      select: {
        ownerId: true,
        rootProjectId: true,
        content: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check permissions
    if (document.ownerId !== req.user.id) {
      const permission = await prisma.permission.findFirst({
        where: {
          projectId: document.rootProjectId,
          userId: req.user.id,
          canWrite: true,
        },
      });
      if (!permission) {
        return res.status(403).json({ error: "No access to create snapshots" });
      }
    }

    // Get current content
    const currentContent =
      document.docs_prosemirror_delta ||
      JSON.parse(document.content || '{"ops":[]}');

    // Create snapshot using enhanced versioning
    const snapshot = await createAutoVersion({
      docId,
      content: currentContent,
      userId: req.user.id,
      changeType: "snapshot",
      changeSummary: reason || "Manual snapshot",
      isSnapshot: true,
      forceCreate: true,
    });

    // Update snapshot with custom fields if provided
    if (label || tags.length > 0) {
      const updatedSnapshot = await prisma.version.update({
        where: { id: snapshot.id },
        data: {
          ...(label && { label }),
          ...(tags.length > 0 && { tags }),
          ...(reason && { snapshotReason: reason }),
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
      return res.status(201).json(updatedSnapshot);
    }

    res.status(201).json(snapshot);
  } catch (error) {
    console.error("Error creating snapshot:", error);
    res.status(500).json({
      error: "Error creating snapshot",
      details: error.message,
    });
  }
});

/**
 * @route POST /documents/:id/workflow/start
 * @summary Start a new editing workflow session
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Document ID
 * @param {object} request.body.required - Workflow data
 * @param {string} request.body.workflowType - Type of workflow (editing, review, translation)
 * @param {string} request.body.sessionId - Optional session ID
 * @return {object} 201 - Created workflow
 * @return {object} 403 - Forbidden - No access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.post("/:id/workflow/start", authenticate, async (req, res) => {
  try {
    const { workflowType = "editing", sessionId } = req.body;
    const docId = req.params.id;

    // Check if document exists and user has access
    const document = await prisma.doc.findUnique({
      where: { id: docId },
      select: {
        ownerId: true,
        rootProjectId: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check permissions
    if (document.ownerId !== req.user.id) {
      const permission = await prisma.permission.findFirst({
        where: {
          projectId: document.rootProjectId,
          userId: req.user.id,
          canWrite: true,
        },
      });
      if (!permission) {
        return res.status(403).json({ error: "No access to start workflows" });
      }
    }

    // Complete any existing active workflows for this user and document
    await prisma.versionWorkflow.updateMany({
      where: {
        docId,
        userId: req.user.id,
        status: "active",
      },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    // Start new workflow
    const workflow = await startVersionWorkflow({
      docId,
      userId: req.user.id,
      workflowType,
      sessionId,
    });

    res.status(201).json(workflow);
  } catch (error) {
    console.error("Error starting workflow:", error);
    res.status(500).json({
      error: "Error starting workflow",
      details: error.message,
    });
  }
});

/**
 * @route POST /documents/:id/workflow/:workflowId/complete
 * @summary Complete an editing workflow session
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Document ID
 * @param {string} workflowId.path.required - Workflow ID
 * @return {object} 200 - Completed workflow
 * @return {object} 403 - Forbidden - No access
 * @return {object} 404 - Workflow not found
 * @return {object} 500 - Server error
 */
router.post(
  "/:id/workflow/:workflowId/complete",
  authenticate,
  async (req, res) => {
    try {
      const { workflowId } = req.params;

      // Check if workflow exists and belongs to user
      const workflow = await prisma.versionWorkflow.findUnique({
        where: { id: workflowId },
        include: {
          doc: {
            select: {
              ownerId: true,
              rootProjectId: true,
            },
          },
        },
      });

      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      if (workflow.userId !== req.user.id) {
        return res
          .status(403)
          .json({ error: "No access to complete this workflow" });
      }

      // Complete workflow
      const completedWorkflow = await prisma.versionWorkflow.update({
        where: { id: workflowId },
        data: {
          status: "completed",
          completedAt: new Date(),
          duration: Math.floor(
            (Date.now() - new Date(workflow.startedAt).getTime()) / 1000
          ),
        },
      });

      res.json(completedWorkflow);
    } catch (error) {
      console.error("Error completing workflow:", error);
      res.status(500).json({
        error: "Error completing workflow",
        details: error.message,
      });
    }
  }
);

/**
 * @route GET /documents/:id/versions
 * @summary Get version history for a document
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Document ID
 * @param {number} limit.query - Number of versions to return (default: 20)
 * @param {number} offset.query - Offset for pagination (default: 0)
 * @param {boolean} includeSnapshots.query - Whether to include snapshots (default: true)
 * @return {object} 200 - Version history
 * @return {object} 403 - Forbidden - No access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.get("/:id/versions", authenticate, async (req, res) => {
  try {
    const { limit = 20, offset = 0, includeSnapshots = "true" } = req.query;
    const docId = req.params.id;

    // Check if document exists and user has access
    const hasAccess = await checkDocumentPermission(
      await prisma.doc.findUnique({
        where: { id: docId },
        include: {
          rootsProject: {
            include: {
              permissions: true,
            },
          },
          permissions: true,
        },
      }),
      req.user?.id
    );

    if (!hasAccess) {
      return res.status(403).json({ error: "No access to view versions" });
    }

    let whereClause = { docId };
    if (includeSnapshots === "false") {
      whereClause.isSnapshot = false;
    }

    const [versions, total] = await Promise.all([
      prisma.version.findMany({
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
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              picture: true,
            },
          },
        },
        orderBy: [{ sequenceNumber: "desc" }, { createdAt: "desc" }],
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.version.count({ where: whereClause }),
    ]);

    res.json({
      versions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching versions:", error);
    res.status(500).json({
      error: "Error fetching versions",
      details: error.message,
    });
  }
});

/**
 * @route GET /documents/:id/workflows
 * @summary Get workflow history for a document
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Document ID
 * @return {object} 200 - Workflow history
 * @return {object} 403 - Forbidden - No access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.get("/:id/workflows", authenticate, async (req, res) => {
  try {
    const docId = req.params.id;

    // Check if document exists and user has access
    const hasAccess = await checkDocumentPermission(
      await prisma.doc.findUnique({
        where: { id: docId },
        include: {
          rootsProject: {
            include: {
              permissions: true,
            },
          },
          permissions: true,
        },
      }),
      req.user?.id
    );

    if (!hasAccess) {
      return res.status(403).json({ error: "No access to view workflows" });
    }

    const workflows = await prisma.versionWorkflow.findMany({
      where: { docId },
      select: {
        id: true,
        sessionId: true,
        workflowType: true,
        status: true,
        totalChanges: true,
        contentChanges: true,
        annotationChanges: true,
        autoSaveCount: true,
        checkpointCount: true,
        startedAt: true,
        completedAt: true,
        duration: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            picture: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    res.json({ workflows });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    res.status(500).json({
      error: "Error fetching workflows",
      details: error.message,
    });
  }
});

module.exports = router;
