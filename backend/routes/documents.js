const express = require("express");
const {
  authenticate,
  optionalAuthenticate,
} = require("../middleware/authenticate");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const { WSSharedDoc } = require("../services");
const { sendEmail } = require("../services/utils");
const {
  documentSharedTemplate,
  documentPermissionUpdatedTemplate,
} = require("../utils/emailTemplates");
const prisma = new PrismaClient();
const router = express.Router();
const { docxToText } = require("../utils/docxToText");
/**
 * Check if a user has permission to access a document
 * @param {Object} document - The document object with rootProject information
 * @param {string} userId - The ID of the user to check permissions for
 * @returns {boolean} - Whether the user has permission to access the document
 */
async function checkDocumentPermission(document, userId) {
  // If the document doesn't exist, no permission
  if (!document) return false;
  // If the document's project is public, everyone has read access
  if (document.rootProject && document.rootProject.isPublic) return true;

  // If no user provided (anonymous), they can only access public documents
  if (!userId) return false;

  // Check if user is the owner of the document
  if (document.ownerId === userId) return true;

  // Check if user is the owner of the project
  if (document.rootProject && document.rootProject.ownerId === userId) {
    return true;
  }

  // Check if user has explicit permission in the project
  if (document.rootProject && document.rootProject.permissions) {
    const userPermission = document.rootProject.permissions.find(
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
 * @param {Object} document - The document object with rootProject information
 * @param {string} userId - The ID of the user to check permissions for (can be undefined for anonymous users)
 * @returns {boolean} - Whether the user has write permission to the document
 */
async function checkDocumentWritePermission(document, userId) {
  // If the document doesn't exist, no permission
  if (!document) return false;

  // If the document's project is public and allows editing, anyone with a user ID can write
  if (
    userId &&
    document.rootProject &&
    document.rootProject.isPublic &&
    document.rootProject.publicAccess === "editor"
  ) {
    return true;
  }

  // Anonymous users never have write access
  if (!userId) return false;

  // Check if user is the owner of the document
  if (document.ownerId === userId) return true;

  // Check if user is the owner of the project
  if (document.rootProject && document.rootProject.ownerId === userId) {
    return true;
  }

  // Check if user has explicit write permission in the project
  if (document.rootProject && document.rootProject.permissions) {
    const userPermission = document.rootProject.permissions.find(
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
        createdAt: true,
        updatedAt: true,
        rootProjectId: true,
        currentVersionId: true,
        currentVersion: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            label: true,
            userId: true,
          },
        },
        permissions: true,
        rootProject: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!document) return res.status(404).json({ error: "Document not found" });
    const isPublic = document.rootProject.isPublic;
    if (!isPublic) {
      return res.status(403).json({
        success: false,
        message: "This document is not publicly accessible",
      });
    }
    // Check if user has permission to access this document
    const hasPermission = await checkDocumentPermission(document, req.user?.id);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "This document is not publicly accessible",
      });
    }

    // Determine access level from project settings
    const publicAccess = document.rootProject?.publicAccess || "viewer";
    const isReadOnly =
      publicAccess === "viewer" ||
      !req.user ||
      !(await checkDocumentWritePermission(document, req.user.id));

    // Return document with read-only flag for public access
    const responseDocument = {
      ...document,
      isReadOnly,
      publicAccess,
      inheritedFromProject: document.rootProject?.isPublic || false,
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
    let textContent = null;
    if (req.file) {
      if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        textContent = await docxToText(req.file.buffer);
      } else if (req.file.mimetype === "text/plain") {
        textContent = req.file.buffer.toString("utf-8");
      } else {
        return res.status(400).json({ error: "Unsupported file type: " + req.file.mimetype });
      }
    }
    const doc = new WSSharedDoc(identifier, req.user.id);
    const text = doc.getText(identifier);
    if (textContent) {
      text.delete(0, text.length);
      text.insert(0, textContent);
    }
    const delta = text.toDelta();

    const document = await prisma.$transaction(async (tx) => {
      let rootProjectId = null;
      if (rootId) {
        const rootDoc = await prisma.doc.findUnique({
          where: { id: rootId },
          select: { rootProjectId: true },
        });
        rootProjectId = rootDoc?.rootProjectId;
      }
      let document = await tx.doc.create({
        data: {
          id: identifier,
          identifier,
          name,
          ownerId: req.user.id,
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
          docId: document.id,
          userId: req.user.id,
          canRead: true,
          canWrite: true,
        },
      });
      const version = await tx.version.create({
        data: {
          content: { ops: delta },
          docId: document.id,
          label: "initial Auto-save",
        },
      });

      await tx.doc.update({
        where: { id: document.id },
        data: {
          currentVersionId: version.id,
        },
      });

      const responseDocument = {
        ...document,
        textContent,
      };
      return responseDocument;
    });
    res.status(201).json(document);
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({ error: "Error creating document: " + error });
  }
});

router.post("/content", authenticate, async (req, res) => {
  try {
    const { identifier, isRoot, rootId, language, name, content, metadata } =
      req.body;

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

    const document = await prisma.$transaction(async (tx) => {
      let rootProjectId = null;
      if (rootId) {
        const rootDoc = await prisma.doc.findUnique({
          where: { id: rootId },
          select: { rootProjectId: true },
        });
        rootProjectId = rootDoc?.rootProjectId;
      }

      // Handle isRoot - accept both boolean and string
      const isRootBool =
        typeof isRoot === "boolean" ? isRoot : isRoot === "true";

      const doc = await tx.doc.create({
        data: {
          id: identifier,
          identifier,
          name,
          ownerId: req.user.id,
          isRoot: isRootBool,
          rootId: rootId ?? null,
          language,
          rootProjectId: rootProjectId,
        },
        select: {
          id: true,
          name: true,
          rootProjectId: true,
          rootId: true,
        },
      });
      if (metadata) {
        const parsedMetadata = JSON.parse(metadata);
        await tx.docMetadata.create({
          data: {
            docId: doc.id,
            text_id: parsedMetadata.text_id,
            instance_id: parsedMetadata.instance_id,
          },
        });
      }
      await tx.permission.create({
        data: {
          docId: doc.id,
          userId: req.user.id,
          canRead: true,
          canWrite: true,
        },
      });
      const version = await tx.version.create({
        data: {
          content: { ops: delta },
          docId: doc.id,
          label: "initial Auto-save",
        },
      });

      await tx.doc.update({
        where: { id: doc.id },
        data: {
          currentVersionId: version.id,
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
          { rootProject: { isPublic: true } },
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
        rootProject: {
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
    console.warn(error);
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
        createdAt: true,
        updatedAt: true,
        rootProjectId: true,
        metadata: true,
        currentVersionId: true,
        currentVersion: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            label: true,
            userId: true,
          },
        },
        rootProject: {
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
        currentVersionId: true,
        currentVersion: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            label: true,
            userId: true,
          },
        },
        rootProject: {
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
        rootProject: {
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
        rootProject: {
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
        rootProject: {
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

    let isUpdate = false;
    if (existingPermission) {
      // Update existing permission
      isUpdate = true;
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

    // Send email notification to the user
    try {
      const accessType = canWrite ? "edit" : "view";
      const emailMessage = isUpdate
        ? documentPermissionUpdatedTemplate({
            documentName: document.name,
            accessType: accessType,
          })
        : documentSharedTemplate({
            documentName: document.name,
            accessType: accessType,
          });
      await sendEmail([email], emailMessage);
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError);
      // Don't fail the request if email fails
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
    const { rootId, isRoot, translations, identifier, name, language } =
      req.body;
    const documentId = req.params.id;

    // Check if the document exists
    const document = await prisma.doc.findUnique({
      where: { id: documentId },
      include: {
        rootProject: {
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

    // If only name and/or language is provided, just update those fields
    const simpleUpdateFields = ["name", "language", "content"];
    const requestKeys = Object.keys(req.body);
    const isSimpleUpdate = requestKeys.every((key) =>
      simpleUpdateFields.includes(key)
    );

    if (isSimpleUpdate && (name || language)) {
      const updateData = {};
      if (name) updateData.name = name;
      if (language) updateData.language = language;

      const updatedDocument = await prisma.doc.update({
        where: { id: documentId },
        data: updateData,
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
      // Update language if provided
      language: language || document.language,
    };

    // Update the document and its translations in a transaction
    const updatedDocument = await prisma.$transaction(async (tx) => {
      // Update the main document
      const updated = await tx.doc.update({
        where: { id: documentId },
        data: updateData,
        select: {
          id: true,
          name: true,
          identifier: true,
          isRoot: true,
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
            translations: {
              select: { id: true },
            },
            rootProject: true,
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
 * @param {object} request.body.content - Document content
 * @return {object} 200 - Success response with updated document
 * @return {object} 403 - Forbidden - No edit access
 * @return {object} 404 - Document not found
 * @return {object} 500 - Server error
 */
router.patch("/:id/content", authenticate, async (req, res) => {
  const { content } = req.body;
  try {
    // First, get the document with its current version
    const document = await prisma.doc.findUnique({
      where: { id: req.params.id },
      select: {
        ownerId: true,
        id: true,

        rootProjectId: true,
        currentVersionId: true,
        currentVersion: {
          select: {
            id: true,
            content: true,
            label: true,
          },
        },
      },
    });

    if (!document) return res.status(404).json({ error: "Document not found" });

    // Check permissions
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

    // Document content is now managed through versions only
    // No direct update to document content field needed

    let currentVersionId = document.currentVersionId;
    if (currentVersionId === null) {
      const currentVersion = await prisma.version.findFirst({
        where: { userId: null },
        orderBy: { createdAt: "desc" },
      });
      currentVersionId = currentVersion.id;
    }
    // First, check if this is a system-generated version (initial auto-save)
    const currentVersion = await prisma.version.findUnique({
      where: { id: currentVersionId },
      select: { userId: true, label: true, content: true },
    });

    let newVersion;
    // Prevent updating system-generated versions (initial auto-save), instead create a new version
    if (!currentVersion?.userId) {
      // Compare new content with current version content
      const currentContent = JSON.stringify(currentVersion.content?.ops);
      const newContent = JSON.stringify(content);
      if (currentContent !== newContent) {
        newVersion = await prisma.version.create({
          data: {
            content: { ops: content },
            docId: document.id,
            label: "Edited Initial Auto-save",
            userId: req.user.id,
          },
        });

        // Update the document's currentVersionId to point to the new version
        await prisma.doc.update({
          where: { id: document.id },
          data: {
            currentVersionId: newVersion.id,
          },
        });

        currentVersionId = newVersion.id;
      } else {
        console.warn("Content is the same, skipping version creation");
      }
      // If content is the same, don't create a new version - keep using the existing one
    } else {
      // Update the existing user version
      await prisma.version.update({
        where: { id: currentVersionId },
        data: {
          content: { ops: content || {} },
        },
      });
    }

    res.json({
      success: true,
      currentVersionId: currentVersionId,
      message: "Version content updated successfully",
    });
  } catch (error) {
    console.error("Error updating version content:", error);
    res.status(500).json({ error: "Error updating version content" });
  }
});

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

    // Create the translation document in the database
    const translationDoc = await prisma.$transaction(async (tx) => {
      // Create the document
      const doc = await tx.doc.create({
        data: {
          id: translationId,
          identifier: translationId,
          name: translationName,
          ownerId: req.user.id,

          isRoot: false,
          rootId: rootId,
          language,
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

    // Extract content from the root document's current version
    let content = "";
    const currentVersion = await prisma.version.findUnique({
      where: { id: rootDoc.currentVersionId },
      select: { content: true },
    });

    if (
      currentVersion?.content?.ops &&
      Array.isArray(currentVersion.content.ops)
    ) {
      content = currentVersion.content.ops
        .filter((op) => op.insert)
        .map((op) => op.insert)
        .join("");
    }

    // Create the webhook URL for receiving translation results
    const serverUrl =
      process.env.SERVER_URL || `http://localhost:${process.env.PORT || 9000}`;
    const webhookUrl = `${serverUrl}/documents/translation-webhook/${translationId}`;

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
    return res.status(201).json({ success: true, data: translationDoc });
  } catch (error) {
    console.error("Error generating translation:", error);
    res
      .status(500)
      .json({ error: "Error generating translation: " + error.message });
  }
});

module.exports = router;
