const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/authenticate");
const router = express.Router();
const archiver = require("archiver");
const Y = require("yjs");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
} = require("docx");
const path = require("path");
const sharp = require("sharp");
const PDFDocument = require("pdfkit");
const fs = require("fs");

const prisma = new PrismaClient();

// Configuration constants
const TEXT_CHUNK_LENGTH = 300; // Characters per chunk
const FRAME_IMAGE_PATH = path.join(
  __dirname,
  "..",
  "static",
  "pecha-frame.png"
);
const TEXT_AREA = {
  x: 100, // Left margin for text
  y: 120, // Top margin for text
  width: 600, // Text area width
  height: 400, // Text area height
  lineHeight: 30,
  fontSize: 18,
};

// Get all projects
router.get("/", authenticate, async (req, res) => {
  const searchQuery = req.query.search || "";
  const status = req.query.status || "active";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const whereClause = {
      OR: [
        { ownerId: req.user.id },
        {
          permissions: {
            some: {
              userId: req.user.id,
            },
          },
        },
      ],
      status: status !== "all" ? status : undefined,
      name: searchQuery
        ? {
            contains: searchQuery,
            mode: "insensitive",
          }
        : undefined,
    };

    const [projects, totalCount] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
            },
          },
          roots: {
            select: {
              id: true,
              name: true,
              updatedAt: true,
              translations: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.project.count({ where: whereClause }),
    ]);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      data: projects,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add user to project by email
router.post("/:id/users/email", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, canWrite = false } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if project exists and user has permission
    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Only the owner can add users
    if (existingProject.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to add users to this project" });
    }

    // Find the user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToAdd) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user already has permission
    const existingPermission = existingProject.permissions.find(
      (permission) => permission.userId === userToAdd.id
    );

    if (existingPermission) {
      // Update existing permission
      const updatedPermission = await prisma.permission.update({
        where: { id: existingPermission.id },
        data: { canWrite },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      return res.json({
        success: true,
        message: "User permission updated",
        data: updatedPermission,
      });
    }

    // Create new permission
    const newPermission = await prisma.permission.create({
      data: {
        Project: {
          connect: { id },
        },
        user: {
          connect: { id: userToAdd.id },
        },
        canRead: true,
        canWrite,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "User added to project",
      data: newPermission,
    });
  } catch (error) {
    console.error("Error adding user to project:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get project permissions
router.get("/:id/permissions", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists and user has permission
    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if user has permission to view project
    const hasPermission =
      existingProject.ownerId === req.user.id ||
      existingProject.permissions.some((p) => p.userId === req.user.id);

    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Not authorized to view this project" });
    }

    res.json({
      success: true,
      data: {
        owner: existingProject.owner,
        permissions: existingProject.permissions,
      },
    });
  } catch (error) {
    console.error("Error fetching project permissions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update user permissions in project
router.patch("/:id/users/:userId", authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { canWrite } = req.body;

    if (canWrite === undefined) {
      return res.status(400).json({ error: "canWrite is required" });
    }

    // Check if project exists and user has permission
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Only the owner can update permissions
    if (existingProject.ownerId !== req.user.id) {
      return res.status(403).json({
        error: "Not authorized to update permissions in this project",
      });
    }

    // Find the permission
    const permission = await prisma.permission.findFirst({
      where: {
        projectId: id,
        userId,
      },
    });

    if (!permission) {
      return res.status(404).json({ error: "Permission not found" });
    }

    // Update the permission
    const updatedPermission = await prisma.permission.update({
      where: { id: permission.id },
      data: { canWrite },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: "User permission updated",
      data: updatedPermission,
    });
  } catch (error) {
    console.error("Error updating user permission:", error);
    res.status(500).json({ error: error.message });
  }
});

// Remove user from project
router.delete("/:id/users/:userId", authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if project exists and user has permission
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Only the owner can remove users
    if (existingProject.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to remove users from this project" });
    }

    // Find the permission
    const permission = await prisma.permission.findFirst({
      where: {
        projectId: id,
        userId,
      },
    });

    if (!permission) {
      return res.status(404).json({ error: "Permission not found" });
    }

    // Delete the permission
    await prisma.permission.delete({
      where: { id: permission.id },
    });

    res.json({
      success: true,
      message: "User removed from project",
    });
  } catch (error) {
    console.error("Error removing user from project:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get documents list for export options
router.get("/:id/documents", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        roots: {
          select: {
            id: true,
            name: true,
            identifier: true,
            translations: {
              select: {
                id: true,
                language: true,
                name: true,
                identifier: true,
              },
            },
          },
        },
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if user has permission to view this project
    const hasPermission =
      project.ownerId === req.user.id ||
      project.permissions.some((p) => p.userId === req.user.id);

    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Not authorized to view this project" });
    }

    // Format documents for export selection
    const documents = [];

    // Add root documents
    for (const root of project.roots) {
      documents.push({
        id: root.id,
        name: root.name || root.identifier,
        type: "root",
        language: "original",
      });

      // Add translations
      for (const translation of root.translations) {
        documents.push({
          id: translation.id,
          name: `${root.name || root.identifier} (${translation.language})`,
          type: "translation",
          language: translation.language,
          parentName: root.name || root.identifier,
        });
      }
    }

    res.json({
      success: true,
      data: {
        projectName: project.name,
        documents: documents,
      },
    });
  } catch (error) {
    console.error("Error fetching project documents:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get project by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        roots: true,
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create project
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, identifier, metadata, rootId } = req.body;

    if (!name || !identifier) {
      return res
        .status(400)
        .json({ error: "Name and identifier are required" });
    }
    // Create project with proper permission structure
    const project = await prisma.project.create({
      data: {
        name,
        identifier: identifier + "_" + Date.now(),
        ownerId: req.user.id,
        metadata,
        roots: rootId
          ? {
              connect: { id: rootId },
            }
          : undefined,
        permissions: {
          create: {
            // Now that docId is optional, we don't need to provide it for project-level permissions
            // Connect to the user instead of using userId directly
            user: {
              connect: { id: req.user.id },
            },
            canRead: true,
            canWrite: true,
          },
        },
      },
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update project
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, identifier, metadata, status } = req.body;

    // Check if project exists and user has permission
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (existingProject.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this project" });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name,
        identifier,
        metadata,
        status,
      },
    });

    res.json({ success: true, data: updatedProject });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete project (soft delete)
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists and user has permission
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (existingProject.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this project" });
    }

    // Soft delete by updating status
    await prisma.project.update({
      where: { id },
      data: { status: "deleted" },
    });

    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: error.message });
  }
});

// Download all documents in a project as a zip file
router.get("/:id/export", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (type === "side-by-side") {
      // Check if project exists and user has permission
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          roots: {
            include: {
              translations: true,
            },
          },
          permissions: {
            where: { userId: req.user.id },
          },
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Create a zip file
      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      // Set response headers
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${project.name
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()}_side_by_side.zip`
      );

      // Pipe archive data to the response
      archive.pipe(res);

      // Process all root documents and their translations
      for (const rootDoc of project.roots) {
        const rootDocContent = await getDocumentContent(rootDoc.id);

        // Process translations
        for (const translation of rootDoc.translations) {
          const translationContent = await getDocumentContent(translation.id);
          if (rootDocContent && translationContent) {
            // Create a combined document with source and translation side by side
            const combinedDocx = await createSideBySideDocx(
              rootDoc.name,
              rootDocContent,
              translation.language,
              translationContent
            );
            archive.append(combinedDocx, {
              name: `${rootDoc.name}_${translation.language}_side_by_side.docx`,
            });
          }
        }
      }

      // Finalize the archive
      await archive.finalize();
    } else if (type === "line-by-line") {
      // Check if project exists and user has permission
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          roots: {
            include: {
              translations: true,
            },
          },
          permissions: {
            where: { userId: req.user.id },
          },
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Create a zip file
      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      // Set response headers
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${project.name
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()}_line_by_line.zip`
      );

      // Pipe archive data to the response
      archive.pipe(res);

      // Process all root documents and their translations
      for (const rootDoc of project.roots) {
        const rootDocContent = await getDocumentContent(rootDoc.id);

        // Process translations
        for (const translation of rootDoc.translations) {
          const translationContent = await getDocumentContent(translation.id);
          if (rootDocContent && translationContent) {
            // Create a combined document with source and translation line by line
            const combinedDocx = await createLineByLineDocx(
              rootDoc.name,
              rootDocContent,
              translation.language,
              translationContent
            );
            archive.append(combinedDocx, {
              name: `${rootDoc.name}_${translation.language}_line_by_line.docx`,
            });
          }
        }
      }

      // Finalize the archive
      await archive.finalize();
    } else if (type === "pecha-pdf") {
      // Get optional document ID for specific document export
      const { documentId } = req.query;

      // Check if project exists and user has permission
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          roots: {
            include: {
              translations: true,
            },
          },
          permissions: {
            where: { userId: req.user.id },
          },
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Create a zip file
      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      // Set response headers
      const zipFileName = documentId
        ? `${project.name}_selected_document_pecha_pdf.zip`
        : `${project.name}_pecha_pdf.zip`;

      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${zipFileName
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()}`
      );

      // Pipe archive data to the response
      archive.pipe(res);

      if (documentId) {
        // Export specific document only
        await exportSpecificDocument(archive, documentId, project);
      } else {
        // Export all documents (existing behavior)
        await exportAllDocuments(archive, project);
      }

      // Finalize the archive
      await archive.finalize();
    } else {
      // Check if project exists and user has permission
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          roots: {
            include: {
              translations: true,
            },
          },
          permissions: {
            where: { userId: req.user.id },
          },
        },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check if user has permission to access this project
      // const hasPermission = project.ownerId === req.user.id || project.permissions.some(p => p.userId === req.user.id && p.canRead);
      // if (!hasPermission) {
      // return res.status(403).json({ error: "Not authorized to access this project" });
      // }

      // Create a zip file
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Compression level
      });

      // Set response headers
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${project.name
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()}_documents.zip`
      );

      // Pipe archive data to the response
      archive.pipe(res);

      // Process all root documents and their translations
      for (const rootDoc of project.roots) {
        // Get the content of the root document
        const rootDocContent = await getDocumentContent(rootDoc.id);
        if (rootDocContent) {
          // Add root document to the zip
          const rootDocx = await createDocxBuffer(rootDoc.name, rootDocContent);
          archive.append(rootDocx, { name: `${rootDoc.name}.docx` });
        }

        // Process translations
        for (const translation of rootDoc.translations) {
          const translationContent = await getDocumentContent(translation.id);
          if (translationContent) {
            // Add translation document to the zip
            const translationDocx = await createDocxBuffer(
              `${rootDoc.name}_${translation.language}`,
              translationContent
            );
            archive.append(translationDocx, {
              name: `${rootDoc.name}_${translation.language}.docx`,
            });
          }
        }
      }

      // Finalize the archive
      await archive.finalize();
    }
  } catch (error) {
    console.error("Error creating zip file:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export all documents in the project
 * @param {Object} archive - The archiver instance
 * @param {Object} project - The project object
 */
async function exportAllDocuments(archive, project) {
  // Process all root documents and their translations
  for (const rootDoc of project.roots) {
    const rootDocContent = await getDocumentContent(rootDoc.id);
    if (rootDocContent) {
      // Create pecha-style PDF for root document
      const rootPdf = await createPechaPdf(rootDoc.name, rootDocContent);
      archive.append(rootPdf, { name: `${rootDoc.name}_pecha.pdf` });
    }

    // Process translations
    for (const translation of rootDoc.translations) {
      const translationContent = await getDocumentContent(translation.id);
      if (translationContent) {
        // Create pecha-style PDF for translation
        const translationPdf = await createPechaPdf(
          `${rootDoc.name}_${translation.language}`,
          translationContent
        );
        archive.append(translationPdf, {
          name: `${rootDoc.name}_${translation.language}_pecha.pdf`,
        });
      }
    }
  }
}

/**
 * Export a specific document by ID
 * @param {Object} archive - The archiver instance
 * @param {string} documentId - The document ID to export
 * @param {Object} project - The project object
 */
async function exportSpecificDocument(archive, documentId, project) {
  try {
    // First check if it's a root document
    const rootDoc = project.roots.find((root) => root.id === documentId);

    if (rootDoc) {
      // Export the root document
      const rootDocContent = await getDocumentContent(rootDoc.id);
      if (rootDocContent) {
        const rootPdf = await createPechaPdf(rootDoc.name, rootDocContent);
        archive.append(rootPdf, { name: `${rootDoc.name}_pecha.pdf` });
        console.log(`Exported root document: ${rootDoc.name}`);
        return;
      }
    }

    // Check if it's a translation document
    for (const rootDoc of project.roots) {
      const translation = rootDoc.translations.find(
        (trans) => trans.id === documentId
      );
      if (translation) {
        const translationContent = await getDocumentContent(translation.id);
        if (translationContent) {
          const translationPdf = await createPechaPdf(
            `${rootDoc.name}_${translation.language}`,
            translationContent
          );
          archive.append(translationPdf, {
            name: `${rootDoc.name}_${translation.language}_pecha.pdf`,
          });
          console.log(
            `Exported translation: ${rootDoc.name}_${translation.language}`
          );
          return;
        }
      }
    }

    // If document not found in project, try to get it directly
    const docContent = await getDocumentContent(documentId);
    if (docContent) {
      // Get document details from database
      const doc = await prisma.doc.findUnique({
        where: { id: documentId },
        select: { id: true, identifier: true, name: true },
      });

      if (doc) {
        const docName = doc.name || doc.identifier || `document_${documentId}`;
        const pdf = await createPechaPdf(docName, docContent);
        archive.append(pdf, { name: `${docName}_pecha.pdf` });
        console.log(`Exported document: ${docName}`);
      } else {
        console.error(`Document ${documentId} not found`);
      }
    } else {
      console.error(`No content found for document ${documentId}`);
    }
  } catch (error) {
    console.error(`Error exporting specific document ${documentId}:`, error);
  }
}

/**
 * Get the content of a document
 * @param {string} docId - The document ID
 * @returns {Promise<Array|null>} - The document content as a Delta array or null
 */
async function getDocumentContent(docId) {
  try {
    const document = await prisma.doc.findUnique({
      where: { id: docId },
      select: {
        id: true,
        identifier: true,
        docs_prosemirror_delta: true,
        docs_y_doc_state: true,
      },
    });

    if (!document) return null;

    // Get content from ProseMirror delta or Y.js state
    let delta = null;
    if (document.docs_prosemirror_delta) {
      delta = document.docs_prosemirror_delta;
    } else if (document.docs_y_doc_state) {
      const ydoc = new Y.Doc({ gc: true });
      Y.applyUpdate(ydoc, document.docs_y_doc_state);
      delta = ydoc.getText(document.identifier).toDelta();
    }

    return delta;
  } catch (error) {
    console.error("Error getting document content:", error);
    return null;
  }
}
/**
 * Create a DOCX buffer from document content
 * @param {string} docName - The document name
 * @param {Array} delta - The document content as a Delta array
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createDocxBuffer(docName, delta) {
  try {
    if (!Array.isArray(delta) || delta.length === 0) {
      // Create a simple document with the document name if no content
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Document: ${docName} (No content available)`,
                  }),
                ],
              }),
            ],
          },
        ],
      });
      return await Packer.toBuffer(doc);
    }

    // Process the delta to create text runs with proper formatting
    const docxParagraphs = [];
    let currentRuns = [];
    let currentAttributes = {};

    // Process each operation in the delta
    for (let i = 0; i < delta.length; i++) {
      const op = delta[i];

      // Handle text insertions
      if (typeof op.insert === "string") {
        // Split by newlines to handle paragraphs
        const textParts = op.insert.split("\n");

        for (let j = 0; j < textParts.length; j++) {
          const text = textParts[j];

          // Only add non-empty text
          if (text.length > 0) {
            // Create a text run with the current formatting attributes
            // Determine if this is a heading and what level
            const isHeading =
              op.attributes?.header ||
              op.attributes?.h1 === true ||
              op.attributes?.h2 === true ||
              op.attributes?.h === 1 ||
              op.attributes?.h === 2;

            // Determine heading level
            const headingLevel =
              op.attributes?.header ||
              (op.attributes?.h1 === true ? 1 : undefined) ||
              (op.attributes?.h2 === true ? 2 : undefined) ||
              op.attributes?.h;

            // Set font size based on heading level
            let fontSize = 24; // Default size (12pt)
            if (isHeading) {
              if (headingLevel === 1) fontSize = 36; // 18pt for H1
              else if (headingLevel === 2) fontSize = 30; // 15pt for H2
            } else if (op.attributes?.size) {
              fontSize =
                op.attributes?.size === "large"
                  ? 32
                  : op.attributes?.size === "huge"
                  ? 36
                  : op.attributes?.size === "small"
                  ? 20
                  : 24;
            }

            const textRun = new TextRun({
              text: text,
              bold: op.attributes?.bold || currentAttributes.bold || isHeading, // Make headings bold
              italics: op.attributes?.italic || currentAttributes.italic,
              strike: op.attributes?.strike || currentAttributes.strike,
              underline: op.attributes?.underline
                ? { type: "single" }
                : undefined,
              color: op.attributes?.color
                ? op.attributes.color.replace("#", "")
                : undefined,
              highlight: op.attributes?.background ? "yellow" : undefined,
              size: fontSize,
            });

            currentRuns.push(textRun);
          }

          // If not the last part, create a new paragraph
          if (j < textParts.length - 1) {
            // Create paragraph with appropriate formatting
            const paragraph = new Paragraph({
              children: currentRuns,
              heading:
                op.attributes?.header === 1
                  ? HeadingLevel.HEADING_1
                  : op.attributes?.header === 2
                  ? HeadingLevel.HEADING_2
                  : undefined,
              alignment:
                op.attributes?.align === "center"
                  ? AlignmentType.CENTER
                  : op.attributes?.align === "right"
                  ? AlignmentType.RIGHT
                  : op.attributes?.align === "justify"
                  ? AlignmentType.JUSTIFIED
                  : AlignmentType.LEFT,
            });

            docxParagraphs.push(paragraph);
            currentRuns = [];

            // Preserve attributes for the next paragraph if they exist
            if (op.attributes) {
              currentAttributes = { ...op.attributes };
            }
          }
        }
      }
      // Handle embedded content (images, etc.)
      else if (op.insert && typeof op.insert === "object") {
        // Handle image if present (not fully implemented, would need image processing)
        if (op.insert.image) {
          // For now, just add a placeholder text
          currentRuns.push(new TextRun({ text: "[Image]", italics: true }));
        }
      }

      // If this is the last operation or the next one starts a new paragraph,
      // create a paragraph with the current runs
      if (
        i === delta.length - 1 ||
        (delta[i + 1] &&
          typeof delta[i + 1].insert === "string" &&
          delta[i + 1].insert.includes("\n"))
      ) {
        if (currentRuns.length > 0) {
          const paragraph = new Paragraph({
            children: currentRuns,
            heading:
              op.attributes?.header === 1
                ? HeadingLevel.HEADING_1
                : op.attributes?.header === 2
                ? HeadingLevel.HEADING_2
                : op.attributes?.h1
                ? HeadingLevel.HEADING_1
                : op.attributes?.h2
                ? HeadingLevel.HEADING_2
                : op.attributes?.h === 1
                ? HeadingLevel.HEADING_1
                : op.attributes?.h === 2
                ? HeadingLevel.HEADING_2
                : undefined,
            alignment:
              op.attributes?.align === "center"
                ? AlignmentType.CENTER
                : op.attributes?.align === "right"
                ? AlignmentType.RIGHT
                : op.attributes?.align === "justify"
                ? AlignmentType.JUSTIFIED
                : AlignmentType.LEFT,
          });

          docxParagraphs.push(paragraph);
          currentRuns = [];
        }
      }
    }

    // If there are any remaining runs, create a final paragraph
    if (currentRuns.length > 0) {
      docxParagraphs.push(new Paragraph({ children: currentRuns }));
    }

    // If no paragraphs were created, add a default one
    if (docxParagraphs.length === 0) {
      docxParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Document: ${docName} (No content available)`,
            }),
          ],
        })
      );
    }

    // Create the document with all the paragraphs
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docxParagraphs,
        },
      ],
    });

    // Generate the DOCX file as a buffer
    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error("Error creating DOCX buffer:", error);

    // Fallback to simple text if docx generation fails
    try {
      let plainText = "";
      if (Array.isArray(delta)) {
        for (const op of delta) {
          if (typeof op.insert === "string") {
            plainText += op.insert;
          }
        }
      }

      // Create a simple document with the plain text
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun(
                    plainText || `Document: ${docName} (No content available)`
                  ),
                ],
              }),
            ],
          },
        ],
      });

      return await Packer.toBuffer(doc);
    } catch (fallbackError) {
      console.error("Fallback error:", fallbackError);

      // Last resort: return a simple text buffer
      return Buffer.from(`Error processing document ${docName}.`);
    }
  }
}

/**
 * Create a side-by-side DOCX document with source and translation
 * @param {string} docName - The document name
 * @param {Array} sourceDelta - The source document content as a Delta array
 * @param {string} targetLanguage - The target language
 * @param {Array} translationDelta - The translation document content as a Delta array
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createSideBySideDocx(
  docName,
  sourceDelta,
  targetLanguage,
  translationDelta
) {
  try {
    const docxElements = [];

    // Add document title
    docxElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${docName} - Side by Side Comparison`,
            bold: true,
            size: 32,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      })
    );

    // Add some spacing
    docxElements.push(new Paragraph({ children: [new TextRun({ text: "" })] }));

    // Convert deltas to plain text for easier processing
    const sourceText = deltaToPlainText(sourceDelta);
    const translationText = deltaToPlainText(translationDelta);

    // Split by paragraphs (double line breaks) or single line breaks for better granularity
    const sourceParagraphs = sourceText.split(/\n+/).filter((p) => p.trim());
    const translationParagraphs = translationText
      .split(/\n+/)
      .filter((p) => p.trim());

    const maxParagraphs = Math.max(
      sourceParagraphs.length,
      translationParagraphs.length
    );

    // Create table rows
    const tableRows = [];

    // Add header row
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Source",
                    bold: true,
                    color: "FFFFFF",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: {
              fill: "0066CC",
            },
            width: {
              size: 5000,
              type: WidthType.DXA,
            },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: targetLanguage,
                    bold: true,
                    color: "FFFFFF",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: {
              fill: "CC6600",
            },
            width: {
              size: 5000,
              type: WidthType.DXA,
            },
          }),
        ],
      })
    );

    // Add content rows
    for (let i = 0; i < maxParagraphs; i++) {
      const sourcePara = sourceParagraphs[i] || "";
      const translationPara = translationParagraphs[i] || "";

      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: sourcePara || " ",
                    }),
                  ],
                }),
              ],
              width: {
                size: 5000,
                type: WidthType.DXA,
              },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: translationPara || " ",
                    }),
                  ],
                }),
              ],
              width: {
                size: 5000,
                type: WidthType.DXA,
              },
            }),
          ],
        })
      );
    }

    // Create the table
    const table = new Table({
      rows: tableRows,
      width: {
        size: 10000,
        type: WidthType.DXA,
      },
      layout: "fixed",
      columnWidths: [5000, 5000], // Equal widths in DXA units (twentieths of a point)
      borders: {
        top: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        bottom: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        left: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        right: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000",
        },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "CCCCCC",
        },
        insideVertical: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "CCCCCC",
        },
      },
    });

    docxElements.push(table);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docxElements,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error("Error creating side-by-side DOCX:", error);
    throw error;
  }
}

/**
 * Create a line-by-line DOCX document with source and translation
 * @param {string} docName - The document name
 * @param {Array} sourceDelta - The source document content as a Delta array
 * @param {string} targetLanguage - The target language
 * @param {Array} translationDelta - The translation document content as a Delta array
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createLineByLineDocx(
  docName,
  sourceDelta,
  targetLanguage,
  translationDelta
) {
  try {
    const docxParagraphs = [];

    // Add document title
    docxParagraphs.push(
      new Paragraph({
        children: [
          // new TextRun({
          //   text: `${docName} - Line by Line Comparison`,
          //   bold: true,
          //   size: 32,
          // }),
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      })
    );

    // Convert deltas to plain text
    const sourceText = deltaToPlainText(sourceDelta);
    const translationText = deltaToPlainText(translationDelta);

    // Split by lines
    const sourceLines = sourceText
      .split("\n")
      .filter((line) => line.trim() !== "");
    const translationLines = translationText
      .split("\n")
      .filter((line) => line.trim() !== "");

    const maxLines = Math.max(sourceLines.length, translationLines.length);

    for (let i = 0; i < maxLines; i++) {
      const sourceLine = sourceLines[i] || "";
      const translationLine = translationLines[i] || "";

      // Add source line
      if (sourceLine) {
        docxParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sourceLine,
                size: 28,
              }),
            ],
          })
        );
        docxParagraphs.push(
          new Paragraph({ children: [new TextRun({ text: "" })] })
        );
      }

      // Add translation line (on separate line with lighter color)
      if (translationLine) {
        docxParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `    `, // Indentation for translation
              }),
              new TextRun({
                text: translationLine,
                color: "999999", // Lighter gray color (lower opacity effect)
                italics: true, // Make it italic to further distinguish
              }),
            ],
          })
        );
      }
      // Add spacing between line pairs
      if (i < maxLines - 1 && (sourceLine || translationLine)) {
        docxParagraphs.push(
          new Paragraph({ children: [new TextRun({ text: "" })] })
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docxParagraphs,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error("Error creating line-by-line DOCX:", error);
    throw error;
  }
}

/**
 * Convert Delta format to plain text
 * @param {Array} delta - The Delta array
 * @returns {string} - Plain text content
 */
function deltaToPlainText(delta) {
  if (!Array.isArray(delta)) return "";

  let text = "";
  for (const op of delta) {
    if (typeof op.insert === "string") {
      text += op.insert;
    }
  }

  // Preserve original linebreaks, only normalize excessive whitespace
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();
}

/**
 * Create a pecha-style PDF from document content
 * @param {string} docName - The document name
 * @param {Array} delta - The document content as a Delta array
 * @returns {Promise<Buffer>} - The PDF file as a buffer
 */
async function createPechaPdf(docName, delta) {
  try {
    // Convert delta to plain text
    const plainText = deltaToPlainText(delta);

    if (!plainText.trim()) {
      // Create a simple PDF with document name if no content
      const doc = new PDFDocument();
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {});

      doc
        .fontSize(16)
        .text(`Document: ${docName} (No content available)`, 50, 50);
      doc.end();

      return new Promise((resolve) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
      });
    }

    // Chunk the text
    const textChunks = chunkText(plainText, TEXT_CHUNK_LENGTH);

    // Check if frame image exists
    if (!fs.existsSync(FRAME_IMAGE_PATH)) {
      console.warn(
        `Frame image not found at ${FRAME_IMAGE_PATH}, using fallback`
      );
      return createFallbackPdf(textChunks, docName);
    }

    // Create PDF document
    const doc = new PDFDocument({ autoFirstPage: false });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {});

    // Process each chunk
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];

      try {
        // Create pecha frame image with text overlay
        const imageWithText = await createFrameImageWithText(
          chunk,
          i + 1,
          textChunks.length
        );

        // Get image dimensions to ensure proper PDF sizing
        const metadata = await sharp(imageWithText).metadata();
        console.log(
          `Adding PDF page ${i + 1}: ${metadata.width}x${metadata.height}px`
        );

        // Add page with exact image dimensions
        doc.addPage({
          size: [metadata.width, metadata.height],
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        // Add the pecha frame image to PDF (full page)
        doc.image(imageWithText, 0, 0, {
          width: metadata.width,
          height: metadata.height,
          fit: [metadata.width, metadata.height],
        });

        console.log(
          `Successfully added pecha frame page ${i + 1}/${textChunks.length}`
        );
      } catch (imageError) {
        console.error(`Error creating image for chunk ${i + 1}:`, imageError);

        // Fallback to text-only page
        doc.addPage();
        doc
          .fontSize(18) // Increased from 14 to match larger text
          .fillColor("#2c1810")
          .text(chunk, 50, 50, {
            width: doc.page.width - 100,
            align: "left",
            lineGap: 8, // Increased line gap for better readability
          });

        doc
          .fontSize(10)
          .fillColor("#666666")
          .text(
            `${i + 1} / ${textChunks.length}`,
            doc.page.width / 2 - 20,
            doc.page.height - 50,
            { align: "center" }
          );
      }
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });
  } catch (error) {
    console.error("Error creating pecha PDF:", error);
    return createFallbackPdf([plainText || `Error: ${docName}`], docName);
  }
}

/**
 * Chunk text by splitting on newlines
 * @param {string} text - The text to chunk
 * @param {number} chunkLength - Not used, kept for compatibility
 * @returns {Array<string>} - Array of text chunks split by newlines
 */
function chunkText(text, chunkLength) {
  // Split text by newlines to create chunks
  const chunks = text.split(/\n+/);

  // Filter out empty chunks but preserve single line breaks
  return chunks.filter((chunk) => chunk.trim().length > 0);
}

/**
 * Create an image with text overlay on the pecha frame
 * @param {string} text - The text to render
 * @param {number} pageNum - Current page number
 * @param {number} totalPages - Total number of pages
 * @returns {Promise<Buffer>} - Image buffer
 */
async function createFrameImageWithText(text, pageNum, totalPages) {
  try {
    // Verify frame image exists
    if (!fs.existsSync(FRAME_IMAGE_PATH)) {
      throw new Error(`Pecha frame image not found at: ${FRAME_IMAGE_PATH}`);
    }

    // Read the pecha frame image
    const frameBuffer = fs.readFileSync(FRAME_IMAGE_PATH);
    const frameImage = sharp(frameBuffer);
    const { width, height } = await frameImage.metadata();
    console.log(`Using pecha frame: ${width}x${height}px for page ${pageNum}`);

    // Detect language for proper text processing
    const language = detectLanguage(text);

    // Create text overlay SVG positioned within the frame
    const textSvg = createTextOverlaySVG(
      text,
      pageNum,
      totalPages,
      width,
      height,
      language
    );

    // Composite text overlay onto the pecha frame
    const result = await frameImage
      .composite([
        {
          input: Buffer.from(textSvg),
          top: 0,
          left: 0,
          blend: "over", // Ensure text is overlaid on top
        },
      ])
      .png()
      .toBuffer();

    console.log(
      `Created frame image with text for page ${pageNum}/${totalPages}`
    );
    return result;
  } catch (error) {
    console.error("Error creating frame image with text:", error);
    throw error;
  }
}

/**
 * Create SVG overlay for text
 * @param {string} text - Text to render
 * @param {number} pageNum - Page number
 * @param {number} totalPages - Total pages
 * @param {number} imageWidth - Frame image width
 * @param {number} imageHeight - Frame image height
 * @param {string} language - Language code (optional, detects Tibetan automatically)
 * @returns {string} - SVG content
 */
function createTextOverlaySVG(
  text,
  pageNum,
  totalPages,
  imageWidth,
  imageHeight,
  language = null
) {
  // Detect if text is Tibetan (contains Tibetan Unicode characters)
  const isTibetan =
    language === "tibetan" || language === "bo" || /[\u0F00-\u0FFF]/.test(text);

  // Calculate responsive text area based on image size and language
  const textArea = {
    x: Math.floor(imageWidth * 0.08), // 15% margin from left (more space for frame border)
    y: Math.floor(imageHeight * 0.2), // 20% margin from top (more space for frame header)
    width: Math.floor(imageWidth), // Tibetan needs more width
    height: Math.floor(imageHeight * 0.6), // 60% of image height (leaving space for frame footer)
    lineHeight: Math.floor(imageHeight * (isTibetan ? 0.1 : 0.06)), // Tibetan needs more line height
    fontSize: Math.floor(imageHeight * (isTibetan ? 0.06 : 0.045)), // Larger font for Tibetan
  };

  // Process text preserving original line structure - NO MERGING EVER
  let lines = [];

  // Split by existing linebreaks to preserve exact original structure
  const originalLines = text.split(/\n/);

  for (const originalLine of originalLines) {
    if (originalLine.trim() === "") {
      // Preserve empty lines exactly as they are
      lines.push("");
      continue;
    }

    // Check if this single original line fits within width
    // If yes: keep as-is, if no: break into multiple lines
    if (isTibetan) {
      // For Tibetan: check syllable count
      const syllables = originalLine.split("་").filter((s) => s.length > 0);
      const maxSyllablesPerLine = Math.floor(
        textArea.width / (textArea.fontSize * 2.5)
      );

      if (syllables.length <= maxSyllablesPerLine) {
        // Original line fits - keep exactly as-is
        lines.push(originalLine);
      } else {
        // Original line too wide - break it into multiple lines
        const syllablesWithSeparator = syllables.map((s) => s + "་");
        let currentLine = "";

        for (const syllable of syllablesWithSeparator) {
          const currentSyllableCount = currentLine
            ? currentLine.split("་").length - 1
            : 0;
          if (currentSyllableCount < maxSyllablesPerLine) {
            currentLine = currentLine ? currentLine + syllable : syllable;
          } else {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = syllable;
            }
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
      }
    } else {
      // For non-Tibetan: check character count
      const maxCharsPerLine = Math.floor(
        textArea.width / (textArea.fontSize * 0.55)
      );

      if (originalLine.length <= maxCharsPerLine) {
        // Original line fits - keep exactly as-is
        lines.push(originalLine);
      } else {
        // Original line too wide - break it into multiple lines
        const words = originalLine
          .split(/\s+/)
          .filter((word) => word.length > 0);
        let currentLine = "";

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (testLine.length <= maxCharsPerLine) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              // Handle very long words by breaking them
              let remainingWord = word;
              while (remainingWord.length > maxCharsPerLine) {
                lines.push(remainingWord.substring(0, maxCharsPerLine));
                remainingWord = remainingWord.substring(maxCharsPerLine);
              }
              currentLine = remainingWord;
            }
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
      }
    }
  }

  // Limit lines to fit in text area
  const maxLines = Math.floor(textArea.height / textArea.lineHeight);
  const displayLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    displayLines[maxLines - 1] = displayLines[maxLines - 1] + "...";
  }

  // Get font base64 first for Tibetan if needed
  const fontBase64 = isTibetan ? getFontBase64() : "";

  // Select appropriate font family based on language
  const fontFamily = isTibetan
    ? fontBase64
      ? "MonlamTBslim, serif"
      : "serif" // Fall back to serif if custom font not available
    : "serif";
  const fontWeight = isTibetan ? "normal" : "bold"; // Tibetan fonts often don't need bold

  // Create font definition for Tibetan if needed
  const fontDef =
    isTibetan && fontBase64
      ? `
    <defs>
      <style>
        @font-face {
          font-family: 'MonlamTBslim';
          src: url('data:font/woff;base64,${fontBase64}') format('woff');
        }
      </style>
    </defs>`
      : "";

  // Create SVG text elements positioned within the frame
  const textElements = displayLines
    .map((line, index) => {
      const y = textArea.y + (index + 1) * textArea.lineHeight;
      return `<text x="${
        textArea.x
      }" y="${y}" font-family="${fontFamily}" font-size="${
        textArea.fontSize
      }" fill="#2c1810" font-weight="${fontWeight}">${escapeXml(line)}</text>`;
    })
    .join("\n");

  // Page number (always use serif for page numbers)
  const pageNumberY = imageHeight - Math.floor(imageHeight * 0.05);
  const pageNumberX = Math.floor(imageWidth / 2);
  const pageNumberElement = `<text x="${pageNumberX}" y="${pageNumberY}" font-family="serif" font-size="${Math.floor(
    textArea.fontSize * 0.7
  )}" fill="#666666" text-anchor="middle">${pageNum} / ${totalPages}</text>`;

  return `
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      ${fontDef}
      ${textElements}
      ${pageNumberElement}
    </svg>
  `;
}

/**
 * Escape XML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Detect language from text content
 * @param {string} text - Text to analyze
 * @returns {string} - Language code ('tibetan' or 'other')
 */
function detectLanguage(text) {
  // Check for Tibetan Unicode range (U+0F00-U+0FFF)
  if (/[\u0F00-\u0FFF]/.test(text)) {
    return "tibetan";
  }
  return "other";
}

/**
 * Get Tibetan font as base64 string
 * @returns {string} - Base64 encoded font data
 */
function getFontBase64() {
  try {
    const fontPath = path.join(__dirname, "..", "static", "MonlamTBslim.woff");
    if (fs.existsSync(fontPath)) {
      const fontBuffer = fs.readFileSync(fontPath);
      return fontBuffer.toString("base64");
    } else {
      console.warn(`Tibetan font not found at: ${fontPath}`);
      return "";
    }
  } catch (error) {
    console.error("Error loading Tibetan font:", error);
    return "";
  }
}

/**
 * Create fallback PDF when frame image is not available
 * @param {Array<string>} textChunks - Text chunks
 * @param {string} docName - Document name
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function createFallbackPdf(textChunks, docName) {
  const doc = new PDFDocument();
  const chunks = [];

  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => {});

  textChunks.forEach((chunk, index) => {
    if (index > 0) doc.addPage();

    // Add pecha-style styling
    doc
      .fontSize(18) // Increased from 14 to match larger text
      .fillColor("#2c1810")
      .text(chunk, 50, 50, {
        width: doc.page.width - 100,
        align: "left",
        lineGap: 8, // Increased line gap for better readability
      });

    // Add page number
    doc
      .fontSize(10)
      .fillColor("#666666")
      .text(
        `${index + 1} / ${textChunks.length}`,
        doc.page.width / 2 - 20,
        doc.page.height - 50,
        { align: "center" }
      );
  });

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

module.exports = router;
