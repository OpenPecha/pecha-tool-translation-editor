const express = require("express");
const { authenticate } = require("../middleware/authenticate");
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

  // No permission found
  return false;
}

const upload = multer({
  storage: multer.memoryStorage(), // Keeps file in memory, not saved on disk
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "text/plain") {
      return cb(new Error("Only .txt files are allowed"));
    }
    cb(null, true);
  },
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
    if (!identifier)
      return res
        .status(400)
        .json({ error: "Missing identifier in query params" });

    const doc = new WSSharedDoc(identifier, req.user.id);
    // Update the Y.doc with file content
    const prosemirrorText = doc.getText(identifier);
    if (req?.file) {
      const textContent = req.file.buffer.toString("utf-8");
      if (textContent) {
        prosemirrorText.delete(0, prosemirrorText.length);
        prosemirrorText.insert(0, textContent);
      }
    }
    const delta = prosemirrorText.toDelta();
    const state = Y.encodeStateAsUpdateV2(doc);

    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.doc.create({
        data: {
          id: identifier,
          identifier,
          name,
          ownerId: req.user.id,
          docs_y_doc_state: state,
          docs_prosemirror_delta: delta,
          isRoot: isRoot === "true",
          rootId: rootId ?? null,
          language,
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
        },
      });
      await tx.version.create({
        data: {
          content: { ops: delta },
          docId: doc.id,
          label: "initail Auto-save",
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
    if (!identifier)
      return res
        .status(400)
        .json({ error: "Missing identifier in query params" });

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
      const doc = await tx.doc.create({
        data: {
          id: identifier,
          identifier,
          name,
          ownerId: req.user.id,
          docs_y_doc_state: state,
          docs_prosemirror_delta: delta,
          isRoot: isRoot === "true",
          rootId: rootId ?? null,
          language,
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
        },
      });
      await tx.version.create({
        data: {
          content: { ops: delta },
          docId: doc.id,
          label: "initail Auto-save",
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
        AND: [{ ownerId: { not: req.user.id } }, { isPublic: true }],
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
        isPublic: true,
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
        isPublic: true,
        docs_prosemirror_delta: true,
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
    const hasPermission = checkDocumentPermission(document, req.user.id);

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
router.get("/:id/content", authenticate, async (req, res) => {
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
        isPublic: true,
        docs_prosemirror_delta: true,
        rootsProject: {
          include: {
            permissions: true,
          },
        },
      },
    });
    if (!document) return res.status(404).json({ error: "Document not found" });

    // Check if user has permission to access this document
    const hasPermission = checkDocumentPermission(document, req.user.id);

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
router.get("/:id/translations", authenticate, async (req, res) => {
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
    const hasPermission = checkDocumentPermission(document, req.user.id);
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
        isPublic: true,
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
 * PUT /documents/{id}
 * @summary Update a document
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Document ID
 * @param {object} request.body.required - Document update data
 * @param {object} request.body.docs_prosemirror_delta - ProseMirror delta
 * @param {object} request.body.docs_y_doc_state - Y.js document state
 * @return {object} 200 - Updated document
 * @return {object} 403 - Forbidden - No edit access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.put("/:id", authenticate, async (req, res) => {
  const { docs_prosemirror_delta, docs_y_doc_state, name } = req.body;
  try {
    const document = await prisma.doc.findUnique({
      where: { id: req.params.id },
      include: {
        rootsProject: {
          include: {
            permissions: true,
          },
        },
      },
    });
    if (!document) return res.status(404).json({ error: "Document not found" });

    // Check if user has permission to access this document
    const hasPermission = checkDocumentPermission(document, req.user.id);

    // If user doesn't have permission, deny access
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to edit this document",
      });
    }

    const updatedDocument = await prisma.doc.update({
      where: { id: document.id },
      data: { docs_prosemirror_delta, docs_y_doc_state },
    });

    res.json(updatedDocument);
  } catch (error) {
    res.status(500).json({ error: "Error updating document" });
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
    const hasPermission = checkDocumentPermission(document, req.user.id);

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
    const hasPermission = checkDocumentPermission(document, req.user.id);

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
            userEmail: email,
            canRead,
            canWrite,
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
              userEmail: email,
              canRead,
              canWrite,
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
    const { rootId, isRoot, translations, identifier, isPublic, name } =
      req.body;
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
    const hasPermission = checkDocumentPermission(document, req.user.id);

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
      isPublic: isPublic ?? document.isPublic,
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

// Update document content
/**
 * PATCH /documents/{id}/content
 * @summary Update document content
 * @tags Documents - Document management operations
 * @security BearerAuth
 * @param {string} id.path.required - Document ID
 * @param {object} request.body.required - Content update data
 * @param {object} request.body.docs_prosemirror_delta - ProseMirror delta
 * @return {object} 200 - Success response with updated document
 * @return {object} 403 - Forbidden - No edit access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.patch("/:id/content", authenticate, async (req, res) => {
  const { docs_prosemirror_delta } = req.body;
  try {
    const document = await prisma.doc.findUnique({
      where: { id: req.params.id },
      select: {
        ownerId: true,
        id: true,
        docs_prosemirror_delta: true,
        rootProjectId: true,
      },
    });
    if (!document) return res.status(404).json({ error: "Document not found" });

    if (document.ownerId !== req.user.id) {
      const permission = await prisma.permission.findFirst({
        where: {
          projectId: document.rootProjectId,
          userId: req.user.id,
          canWrite: true,
        },
      });
      if (!permission) return res.status(403).json({ error: "No edit access" });
    }

    // Approach 1: If we need to merge with existing Y.doc state
    const ydoc = new Y.Doc({ gc: true });

    // If the document already has Y.doc state, we should first apply that
    // if (document.docs_y_doc_state) {
    //   Y.applyUpdateV2(ydoc, document.docs_y_doc_state);
    // }

    // Get the shared text type from the Y.doc
    const ytext = ydoc.getText(req.params.id);

    // Convert ProseMirror delta to Y.js compatible operations
    // This is the critical part that was missing
    if (docs_prosemirror_delta) {
      // Process the delta operations to make them compatible with Y.js
      // You may need a custom conversion function depending on your delta format
      const yDelta = convertProseMirrorDeltaToYDelta(docs_prosemirror_delta);
      ytext.applyDelta(yDelta);
    }

    // Encode the updated Y.doc state

    const docs_y_doc_state = Y.encodeStateAsUpdateV2(ydoc);

    // Validate the state isn't too small/empty
    // if (docs_y_doc_state.length < 100) {
    //   console.log('Y.js state is too small, skipping update');
    //   return res.status(400).json({ error: "Invalid document state" });
    // }

    // Uncomment this to actually update the database
    const updatedDocument = await prisma.doc.update({
      where: { id: document.id },
      data: {
        docs_prosemirror_delta,
      },
      select: {
        id: true,
      },
    });
    res.json({
      success: true,
    });
  } catch (error) {
    console.error("Error updating document content:", error);
    res.status(500).json({ error: "Error updating document content" });
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
router.post("/generate-translation", authenticate, async (req, res) => {
  try {
    const { rootId, language, model, use_segmentation } = req.body;

    const isTranslationWorkerHealthy = await getHealthWorker();
    if (!isTranslationWorkerHealthy) {
      return res
        .status(500)
        .json({ error: "Translation worker is not healthy" });
    }

    const apiKey = model.startsWith("claude") ? process.env.CLAUDE_API_KEY : "";
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
        docs_prosemirror_delta: true,
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
          docs_y_doc_state: state,
          docs_prosemirror_delta: delta,
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
      model_name: model || "claude-3-haiku-20240307",
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

      console.log("Translation job created:", response.id);

      // Return the created document
      res.status(201).json(updated);
    } catch (error) {
      console.error("Translation request failed:", error);

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
          docs_y_doc_state: translatedState,
          docs_prosemirror_delta: translatedDelta,
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
          (translation.translationStatus === "progress" ||
            translation.translationStatus === "started" ||
            translation.translationStatus === "pending" ||
            translation.translationStatus === "failed")
        ) {
          try {
            // Get the latest status directly from the translation worker (Redis-based, faster)
            const status = await getTranslationStatus(
              translation.translationJobId
            );

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
                  docs_prosemirror_delta: translatedDelta,
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
            if (status) {
              // Return the translation with the updated status from the worker
              return {
                ...translation,
                translationStatus:
                  status.status.status_type || translation.translationStatus,
                translationProgress:
                  status.status.progress || translation.translationProgress,
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

module.exports = router;
