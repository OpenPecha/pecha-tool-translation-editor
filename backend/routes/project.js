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
const fs = require("fs");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

const prisma = new PrismaClient();

// Store active progress streams
const progressStreams = new Map();

// Configuration constants
const TEXT_CHUNK_LENGTH = 300; // Characters per chunk

const TEMPLATE_PATH = path.join(__dirname, "..", "static", "template.docx");

/**
 * Check if Pandoc is available on the system
 * @returns {Promise<boolean>} - True if Pandoc is available
 */
async function isPandocAvailable() {
  try {
    await execAsync("pandoc --version");
    return true;
  } catch (error) {
    console.log("⚠️ Pandoc not available:", error.message);
    return false;
  }
}

/**
 * Generate Markdown with footnotes from delta content
 * @param {Array} delta - The document content as a Delta array
 * @param {Array} footnotes - Array of footnote objects with position and content
 * @returns {string} - Markdown content with footnotes
 */
function generateMarkdownWithFootnotes(delta, footnotes) {
  if (!Array.isArray(delta)) return "";

  let markdown = "";
  let currentPosition = 0;
  let footnoteIndex = 0;

  // Sort footnotes by position
  const sortedFootnotes = [...footnotes].sort(
    (a, b) => a.position - b.position
  );

  for (const op of delta) {
    if (typeof op.insert === "string") {
      let text = op.insert;

      // Check if we need to insert footnotes at this position
      while (
        footnoteIndex < sortedFootnotes.length &&
        currentPosition <= sortedFootnotes[footnoteIndex].position &&
        sortedFootnotes[footnoteIndex].position < currentPosition + text.length
      ) {
        const footnote = sortedFootnotes[footnoteIndex];
        const relativePosition = footnote.position - currentPosition;

        // Split text at footnote position
        const beforeFootnote = text.substring(0, relativePosition);
        const afterFootnote = text.substring(relativePosition);

        // Add text before footnote
        if (beforeFootnote) {
          markdown += beforeFootnote;
        }

        // Add footnote reference
        markdown += `[^${footnote.number}]`;

        // Continue with remaining text
        text = afterFootnote;
        currentPosition = footnote.position;
        footnoteIndex++;
      }

      // Add remaining text
      if (text) {
        markdown += text;
        currentPosition += text.length;
      }
    }
  }

  // Add footnote definitions at the end
  if (sortedFootnotes.length > 0) {
    markdown += "\n\n";
    for (const footnote of sortedFootnotes) {
      markdown += `[^${footnote.number}]: ${footnote.content}\n\n`;
    }
  }

  return markdown;
}

/**
 * Convert Markdown to DOCX using Pandoc
 * @param {string} markdown - Markdown content
 * @param {string} outputPath - Path for the output DOCX file
 * @param {boolean} useTemplate - Whether to use the template (default: true)
 * @returns {Promise<Buffer>} - DOCX file as buffer
 */
async function convertMarkdownToDocx(markdown, outputPath, useTemplate = true) {
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.dirname(outputPath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create temporary markdown file
    const tempMarkdownPath = outputPath.replace(".docx", ".md");
    fs.writeFileSync(tempMarkdownPath, markdown, "utf8");

    // Convert using Pandoc with or without template
    let pandocCommand;
    if (useTemplate) {
      pandocCommand = `pandoc "${tempMarkdownPath}" -o "${outputPath}" --reference-doc="${TEMPLATE_PATH}"`;
    } else {
      pandocCommand = `pandoc "${tempMarkdownPath}" -o "${outputPath}"`;
    }
    console.log(`🔄 Running Pandoc command: ${pandocCommand}`);

    await execAsync(pandocCommand);

    // Read the generated DOCX file
    const docxBuffer = fs.readFileSync(outputPath);

    // Clean up temporary files
    fs.unlinkSync(tempMarkdownPath);
    fs.unlinkSync(outputPath);

    console.log(
      `✅ Successfully converted Markdown to DOCX: ${docxBuffer.length} bytes`
    );
    return docxBuffer;
  } catch (error) {
    console.error("❌ Error converting Markdown to DOCX:", error);
    throw error;
  }
}

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

// SSE endpoint for export progress (no authentication needed - progressId acts as unique identifier)
router.get("/:id/export-progress/:progressId", async (req, res) => {
  const { progressId } = req.params;

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // Store the response object for this progress ID
  progressStreams.set(progressId, res);

  // Send initial connection message
  const initialMessage = JSON.stringify({
    progress: 0,
    message: "Connection established...",
  });

  console.log(`📤 Sending initial SSE message: ${initialMessage}`);
  res.write(`data: ${initialMessage}\n\n`);

  // Send a second message to confirm connection and indicate readiness
  setTimeout(() => {
    const readyMessage = JSON.stringify({
      progress: 1,
      message: "Ready for export...",
    });
    res.write(`data: ${readyMessage}\n\n`);
  }, 200);

  // Clean up when client disconnects
  req.on("close", () => {
    progressStreams.delete(progressId);
  });

  req.on("aborted", () => {
    progressStreams.delete(progressId);
  });
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
    } else if (type === "pecha-template") {
      // Get optional progress ID (no document selection needed)
      const { progressId } = req.query;

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

      // Set response headers - always export all documents combined
      const zipFileName = `${project.name}_combined_docx_template.zip`;

      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${zipFileName
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()}`
      );

      // Pipe archive data to the response
      archive.pipe(res);

      // Send initial progress update
      sendProgress(progressId, 5, "Starting docx-template export...");

      // Process all root documents with their translations combined
      let totalDocs = project.roots.length;
      let processedDocs = 0;

      for (const rootDoc of project.roots) {
        sendProgress(
          progressId,
          Math.round((processedDocs / totalDocs) * 90) + 5,
          `Processing ${rootDoc.name} with translations...`
        );

        const rootDocContent = await getDocumentContent(rootDoc.id);
        if (rootDocContent) {
          console.log(
            `🔍 Root document ${rootDoc.name} has ${rootDoc.translations.length} translations`
          );

          // Process each translation separately (like side-by-side export)
          for (const translation of rootDoc.translations) {
            const translationContent = await getDocumentContent(translation.id);

            if (translationContent) {
              // Create side-by-side style DOCX template for this source/translation pair
              const combinedDocx = await createSideBySideDocxTemplate(
                rootDoc.name,
                rootDocContent,
                translation.language,
                translationContent,
                progressId
              );

              const fileName = `${rootDoc.name}_${translation.language}_docx_template.docx`;
              archive.append(combinedDocx, { name: fileName });

              console.log(
                `✅ Created docx-template for ${rootDoc.name} - ${translation.language}`
              );
            } else {
              console.log(
                `❌ No content found for translation ${translation.language} (ID: ${translation.id})`
              );
            }
          }

          // Also create a source-only document if there are no translations
          if (rootDoc.translations.length === 0) {
            const sourceOnlyDocx = await createSourceOnlyDocxTemplate(
              rootDoc.name,
              rootDocContent,
              progressId
            );

            const fileName = `${rootDoc.name}_source_only_docx_template.docx`;
            archive.append(sourceOnlyDocx, { name: fileName });

            console.log(
              `✅ Created source-only docx-template for ${rootDoc.name}`
            );
          }
        }
        processedDocs++;
      }

      // Finalize the archive
      await archive.finalize();

      // Send completion signal
      if (progressId) {
        sendProgress(progressId, 100, "Export completed!");
        // Clean up the progress stream after a short delay
        setTimeout(() => {
          const stream = progressStreams.get(progressId);
          if (stream) {
            try {
              stream.end();
            } catch (error) {
              console.error("Error closing progress stream:", error);
            }
            progressStreams.delete(progressId);
          }
        }, 1000);
      }
    } else if (type === "page-view") {
      // Export individual DOCX files for each document in page view format (single language mode)
      const { progressId } = req.query;

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
          .toLowerCase()}_page_view.zip`
      );

      // Pipe archive data to the response
      archive.pipe(res);

      // Send initial progress update
      sendProgress(progressId, 5, "Starting page view export...");

      // Calculate total documents (roots + translations)
      let totalDocs = project.roots.length;
      for (const root of project.roots) {
        totalDocs += root.translations.length;
      }
      let processedDocs = 0;

      // Helper function to extract footnotes from delta
      async function extractFootnotesFromDelta(delta, docName) {
        if (!Array.isArray(delta)) {
          return [];
        }

        const footnotes = [];
        let currentPosition = 0;
        const footnoteMap = new Map();

        for (let i = 0; i < delta.length; i++) {
          const op = delta[i];

          if (typeof op.insert === "string") {
            if (op.attributes && op.attributes.footnote) {
              let threadId = op.attributes.footnote;
              if (typeof threadId === "object" && threadId !== null) {
                threadId = threadId.id || threadId.threadId;
              }
              if (typeof threadId !== "string") {
                continue;
              }
              if (!footnoteMap.has(threadId)) {
                const footnoteNumber = footnoteMap.size + 1;
                let actualContent = `Footnote ${footnoteNumber}`;
                let deltaContent = "";

                if (op.attributes.footnoteContent) {
                  deltaContent = op.attributes.footnoteContent;
                }
                if (op.attributes.footnoteText) {
                  deltaContent = op.attributes.footnoteText;
                }
                if (op.attributes.note_on) {
                  deltaContent = op.attributes.note_on;
                }
                if (op.attributes.content) {
                  deltaContent = op.attributes.content;
                }
                if (op.attributes.text) {
                  deltaContent = op.attributes.text;
                }
                if (op.attributes.footnote_content) {
                  deltaContent = op.attributes.footnote_content;
                }
                if (op.attributes.footnote_text) {
                  deltaContent = op.attributes.footnote_text;
                }

                try {
                  const footnoteRecord = await prisma.footnote.findFirst({
                    where: { threadId: threadId },
                    select: {
                      id: true,
                      threadId: true,
                      content: true,
                      order: true,
                      docId: true,
                    },
                  });

                  if (footnoteRecord) {
                    if (footnoteRecord.content) {
                      if (
                        deltaContent &&
                        deltaContent !== footnoteRecord.content
                      ) {
                        actualContent = `${footnoteRecord.content}\n\n${deltaContent}`;
                      } else {
                        actualContent = footnoteRecord.content;
                      }
                    } else if (deltaContent) {
                      actualContent = deltaContent;
                    }
                  } else {
                    if (deltaContent) {
                      actualContent = deltaContent;
                    }
                  }
                } catch (error) {
                  if (deltaContent) {
                    actualContent = deltaContent;
                  }
                }

                const footnote = {
                  threadId: threadId,
                  number: footnoteNumber,
                  position: currentPosition,
                  content: actualContent,
                  order: footnoteNumber,
                  operationIndex: i,
                };
                footnoteMap.set(threadId, footnote);
                footnotes.push(footnote);
              }
            }
            currentPosition += op.insert.length;
          }
        }

        return footnotes;
      }

      // Process all root documents
      for (const rootDoc of project.roots) {
        sendProgress(
          progressId,
          Math.round((processedDocs / totalDocs) * 90) + 5,
          `Processing ${rootDoc.name}...`
        );

        const rootDocContent = await getDocumentContent(rootDoc.id);
        if (rootDocContent) {
          // Extract footnotes from root document
          const rootFootnotes = await extractFootnotesFromDelta(
            rootDocContent,
            rootDoc.name
          );

          // Check if Pandoc is available
          const pandocAvailable = await isPandocAvailable();

          let docx;
          if (pandocAvailable && rootFootnotes.length > 0) {
            // Generate Markdown with footnotes
            const markdown = generateMarkdownWithFootnotes(
              rootDocContent,
              rootFootnotes
            );

            // Create temporary file path
            const tempDocxPath = path.join(
              __dirname,
              "..",
              "uploads",
              `temp_${rootDoc.name}_${Date.now()}.docx`
            );

            // Convert Markdown to DOCX using Pandoc without template
            docx = await convertMarkdownToDocx(markdown, tempDocxPath, false);
          } else {
            // Fallback to simple DOCX creation
            docx = await createDocxBuffer(rootDoc.name, rootDocContent);
          }

          archive.append(docx, { name: `${rootDoc.name}.docx` });
        }
        processedDocs++;

        // Process translations for this root document
        for (const translation of rootDoc.translations) {
          sendProgress(
            progressId,
            Math.round((processedDocs / totalDocs) * 90) + 5,
            `Processing ${rootDoc.name} - ${translation.language}...`
          );

          const translationContent = await getDocumentContent(translation.id);
          if (translationContent) {
            // Extract footnotes from translation document
            const translationFootnotes = await extractFootnotesFromDelta(
              translationContent,
              `${rootDoc.name} - ${translation.language}`
            );

            // Check if Pandoc is available
            const pandocAvailable = await isPandocAvailable();

            let translationDocx;
            if (pandocAvailable && translationFootnotes.length > 0) {
              // Generate Markdown with footnotes
              const markdown = generateMarkdownWithFootnotes(
                translationContent,
                translationFootnotes
              );

              // Create temporary file path
              const tempDocxPath = path.join(
                __dirname,
                "..",
                "uploads",
                `temp_${rootDoc.name}_${
                  translation.language
                }_${Date.now()}.docx`
              );

              // Convert Markdown to DOCX using Pandoc without template
              translationDocx = await convertMarkdownToDocx(
                markdown,
                tempDocxPath,
                false
              );
            } else {
              // Fallback to simple DOCX creation
              translationDocx = await createDocxBuffer(
                `${rootDoc.name}_${translation.language}`,
                translationContent
              );
            }

            archive.append(translationDocx, {
              name: `${rootDoc.name}_${translation.language}.docx`,
            });
          }
          processedDocs++;
        }
      }

      // Finalize the archive
      await archive.finalize();

      // Send completion signal
      if (progressId) {
        sendProgress(progressId, 100, "Export completed!");
        setTimeout(() => {
          const stream = progressStreams.get(progressId);
          if (stream) {
            try {
              stream.end();
            } catch (error) {
              console.error("Error closing progress stream:", error);
            }
            progressStreams.delete(progressId);
          }
        }, 1000);
      }
    } else if (type === "single-documents") {
      // Export individual DOCX files for each document (single language mode)
      const { progressId } = req.query;

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
          .toLowerCase()}_documents.zip`
      );

      // Pipe archive data to the response
      archive.pipe(res);

      // Send initial progress update
      sendProgress(progressId, 5, "Starting simple documents export...");

      // Calculate total documents (roots + translations)
      let totalDocs = project.roots.length;
      for (const root of project.roots) {
        totalDocs += root.translations.length;
      }
      let processedDocs = 0;

      // Helper function to extract footnotes from delta
      async function extractFootnotesFromDelta(delta, docName) {
        if (!Array.isArray(delta)) {
          console.log(`📄 ${docName}: No delta found or delta is not an array`);
          return [];
        }

        const footnotes = [];
        let currentPosition = 0;
        const footnoteMap = new Map();

        for (let i = 0; i < delta.length; i++) {
          const op = delta[i];

          if (typeof op.insert === "string") {
            // Check if this operation has footnote attributes
            if (op.attributes && op.attributes.footnote) {
              let threadId = op.attributes.footnote?.id;
              if (typeof threadId === "object" && threadId !== null) {
                threadId = threadId.id || threadId.threadId;
              }
              if (typeof threadId !== "string") {
                continue;
              }
              if (!footnoteMap.has(threadId)) {
                const footnoteNumber = footnoteMap.size + 1;
                // Fetch actual footnote content from database
                let actualContent = ``;
                let startIndex = 0;

                try {
                  const footnoteRecord = await prisma.footnote.findFirst({
                    where: { threadId: threadId },
                    select: {
                      id: true,
                      threadId: true,
                      content: true,
                      order: true,
                      docId: true,
                    },
                  });
                  if (footnoteRecord) {
                    const footnote = {
                      id: threadId,
                      number: footnoteNumber,
                      content: footnoteRecord?.content,
                      order: footnoteRecord?.order,
                      operationIndex: i,
                    };
                    footnoteMap.set(threadId, footnote);
                    footnotes.push(footnote);
                  }
                } catch (error) {
                  console.error(error);
                }
              }
            }
            currentPosition += op.insert.length;
          }
        }

        return footnotes;
      }

      // Process all root documents
      for (const rootDoc of project.roots) {
        sendProgress(
          progressId,
          Math.round((processedDocs / totalDocs) * 90) + 5,
          `Processing ${rootDoc.name}...`
        );

        const rootDocContent = await getDocumentContent(rootDoc.id);

        if (rootDocContent) {
          // Extract and log footnotes from root document
          const rootFootnotes = await extractFootnotesFromDelta(
            rootDocContent,
            rootDoc.name
          );
          console.log("single-documents", rootFootnotes);
          // Create simple DOCX for root document (no templates, no Pandoc)
          const docx = await createDocxBuffer(rootDoc.name, rootDocContent);

          archive.append(docx, { name: `${rootDoc.name}.docx` });
        }
        processedDocs++;

        // Process translations for this root document
        for (const translation of rootDoc.translations) {
          sendProgress(
            progressId,
            Math.round((processedDocs / totalDocs) * 90) + 5,
            `Processing ${rootDoc.name} - ${translation.language}...`
          );

          const translationContent = await getDocumentContent(translation.id);
          if (translationContent) {
            console.log(
              `\n📄 Processing translation: ${rootDoc.name} - ${translation.language}`
            );

            // Extract and log footnotes from translation document
            const translationFootnotes = await extractFootnotesFromDelta(
              translationContent,
              `${rootDoc.name} - ${translation.language}`
            );

            // Create simple DOCX for translation (no templates, no Pandoc)
            const translationDocx = await createDocxBuffer(
              `${rootDoc.name}_${translation.language}`,
              translationContent
            );

            archive.append(translationDocx, {
              name: `${rootDoc.name}_${translation.language}.docx`,
            });

            console.log(
              `✅ Created simple DOCX for ${rootDoc.name} - ${translation.language}`
            );
          }
          processedDocs++;
        }
      }

      // Finalize the archive
      await archive.finalize();

      // Send completion signal
      if (progressId) {
        sendProgress(progressId, 100, "Export completed!");
        setTimeout(() => {
          const stream = progressStreams.get(progressId);
          if (stream) {
            try {
              stream.end();
            } catch (error) {
              console.error("Error closing progress stream:", error);
            }
            progressStreams.delete(progressId);
          }
        }, 1000);
      }
    } else if (type === "single-pecha-templates") {
      // Export individual pecha template DOCX files for each document (single language mode)
      const { progressId } = req.query;

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
          .toLowerCase()}_pecha_templates.zip`
      );

      // Pipe archive data to the response
      archive.pipe(res);

      // Send initial progress update
      sendProgress(progressId, 5, "Starting pecha templates export...");

      // Calculate total documents (roots + translations)
      let totalDocs = project.roots.length;
      for (const root of project.roots) {
        totalDocs += root.translations.length;
      }
      let processedDocs = 0;

      // Process all root documents
      for (const rootDoc of project.roots) {
        sendProgress(
          progressId,
          Math.round((processedDocs / totalDocs) * 90) + 5,
          `Processing ${rootDoc.name} as pecha template...`
        );

        const rootDocContent = await getDocumentContent(rootDoc.id);
        if (rootDocContent) {
          // Create pecha template DOCX for root document
          const pechaDocx = await createSourceOnlyDocxTemplate(
            rootDoc.name,
            rootDocContent,
            progressId
          );

          const fileName = `${rootDoc.name}_pecha_template.docx`;
          archive.append(pechaDocx, { name: fileName });
        }
        processedDocs++;

        // Process translations for this root document
        for (const translation of rootDoc.translations) {
          sendProgress(
            progressId,
            Math.round((processedDocs / totalDocs) * 90) + 5,
            `Processing ${rootDoc.name} - ${translation.language} as pecha template...`
          );

          const translationContent = await getDocumentContent(translation.id);
          if (translationContent) {
            // Create pecha template DOCX for translation
            const translationPechaDocx = await createSourceOnlyDocxTemplate(
              `${rootDoc.name}_${translation.language}`,
              translationContent,
              progressId
            );

            const fileName = `${rootDoc.name}_${translation.language}_pecha_template.docx`;
            archive.append(translationPechaDocx, { name: fileName });
          }
          processedDocs++;
        }
      }

      // Finalize the archive
      await archive.finalize();

      // Send completion signal
      if (progressId) {
        sendProgress(progressId, 100, "Export completed!");
        setTimeout(() => {
          const stream = progressStreams.get(progressId);
          if (stream) {
            try {
              stream.end();
            } catch (error) {
              console.error("Error closing progress stream:", error);
            }
            progressStreams.delete(progressId);
          }
        }, 1000);
      }
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
 * Send progress update via SSE
 * @param {string} progressId - Progress tracking ID
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Progress message
 */
function sendProgress(progressId, progress, message) {
  const stream = progressStreams.get(progressId);
  if (stream) {
    try {
      const progressData = JSON.stringify({ progress, message });

      stream.write(`data: ${progressData}\n\n`);
    } catch (error) {
      progressStreams.delete(progressId);
    }
  } else {
    console.log(`⚠️ No SSE stream found for progressId: ${progressId}`);
    console.log(`📊 Available streams:`, Array.from(progressStreams.keys()));
    console.log(`📊 Total streams: ${progressStreams.size}`);
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

// Old function removed - functionality moved inline in export route

// Old complex function removed - replaced with simpler side-by-side approach

// Old complex function removed - replaced with simpler side-by-side approach

// Old complex fallback function removed - replaced with simpler side-by-side approach

/**
 * Create fallback DOCX template when frame image is not available
 * @param {Array<string>} textChunks - Text chunks
 * @param {string} docName - Document name
 * @returns {Promise<Buffer>} - DOCX buffer
 */
async function createFallbackDocxTemplate(textChunks, docName) {
  const docxElements = [];

  // Add document title
  docxElements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${docName} - Pecha Template (Fallback)`,
          bold: true,
          size: 32,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    })
  );

  textChunks.forEach((chunk, index) => {
    // Add page title
    docxElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Page ${index + 1}`,
            bold: true,
            size: 24,
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );

    // Add text content
    docxElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: chunk,
            size: 36, // Larger font size for pecha-style appearance
          }),
        ],
      })
    );

    // Add page number
    docxElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${index + 1} / ${textChunks.length}`,
            size: 20,
            color: "666666",
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );

    // Add page break except for the last page
    if (index < textChunks.length - 1) {
      docxElements.push(
        new Paragraph({
          children: [new TextRun({ text: "", break: 1 })],
          pageBreakBefore: true,
        })
      );
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docxElements,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Create a side-by-side style DOCX template from source and translation content
 * @param {string} docName - The document name
 * @param {Array} sourceDelta - The source document content as a Delta array
 * @param {string} targetLanguage - The target language
 * @param {Array} translationDelta - The translation document content as a Delta array
 * @param {string} progressId - Progress tracking ID
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createSideBySideDocxTemplate(
  docName,
  sourceDelta,
  targetLanguage,
  translationDelta,
  progressId
) {
  try {
    sendProgress(
      progressId,
      20,
      `Creating template for ${docName} - ${targetLanguage}...`
    );

    // Convert deltas to plain text
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

    // Create pages array with source/translation pairs (clean format)
    const pages = [];
    for (let i = 0; i < maxParagraphs; i++) {
      const sourcePara = sourceParagraphs[i] || "";
      const translationPara = translationParagraphs[i] || "";
      const pageBreak = i >= 0 ? '<w:br w:type="page"/>' : "";
      // dont push if source and translation are empty
      if (sourcePara.trim() === "") {
        continue;
      }
      const pageNumber = i + 1;
      pages.push({
        source: sourcePara,
        translation: translationPara,
        isLast: i === maxParagraphs - 1, // Flag to identify last page for template
        pageBreak,
        needsPageBreak: i > 0,
        tibetanPageMarker: pageNumber % 2 === 1 ? "༄༅། །" : "",
        isOddPage: pageNumber % 2 === 1,
      });
    }
    // Check if template exists
    if (!fs.existsSync(TEMPLATE_PATH)) {
      console.warn(
        `Template not found at ${TEMPLATE_PATH}, using fallback DOCX`
      );
      return createFallbackSideBySideDocxTemplate(pages);
    }

    sendProgress(progressId, 50, "Processing template...");

    // Read the template file
    const templateContent = fs.readFileSync(TEMPLATE_PATH);

    // Use docxtemplater to populate the template
    const zip = new PizZip(templateContent);

    let doc;
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,

        nullGetter: () => "", // Return empty string for null values
      });
    } catch (templateError) {
      console.error("Template parsing error:", templateError);

      return createFallbackSideBySideDocxTemplate(pages);
    }

    const templateData = {
      docName: docName || "Untitled Document",
      targetLanguage: targetLanguage,
      totalPages: pages.length,
      pages: pages,
    };

    sendProgress(progressId, 70, "Rendering template...");

    // Render the template with data
    try {
      doc.render(templateData);
    } catch (renderError) {
      console.error("Template rendering error:", renderError);
      return createFallbackSideBySideDocxTemplate(pages);
    }

    sendProgress(progressId, 85, "Generating final document...");

    // Get the generated document buffer
    const docBuffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    return docBuffer;
  } catch (error) {
    console.error("Error creating side-by-side DOCX template:", error);
    // Fallback to simple structure
    const pages = [
      {
        source: "Error",
        translation: error.message,
      },
    ];
    return createFallbackSideBySideDocxTemplate(pages);
  }
}

/**
 * Create a source-only DOCX template
 * @param {string} docName - The document name
 * @param {Array} sourceDelta - The source document content as a Delta array
 * @param {string} progressId - Progress tracking ID
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createSourceOnlyDocxTemplate(docName, sourceDelta, progressId) {
  try {
    sendProgress(
      progressId,
      20,
      `Creating source-only template for ${docName}...`
    );

    // Convert delta to plain text
    const sourceText = deltaToPlainText(sourceDelta);

    // Split by paragraphs
    const sourceParagraphs = sourceText.split(/\n+/).filter((p) => p.trim());

    // Create pages array with source only (clean format)
    const pages = [];
    for (let i = 0; i < sourceParagraphs.length; i++) {
      const pageBreak = i >= 0 ? '<w:br w:type="page"/>' : "";
      const pageNumber = i + 1;
      pages.push({
        source: sourceParagraphs[i],
        translation: "", // Empty translation
        isLast: true, // Flag to identify last page for template
        pageBreak,
        needsPageBreak: i > 0,
        tibetanPageMarker: pageNumber % 2 === 1 ? "༄༅། །" : "",
        isOddPage: pageNumber % 2 === 1,
      });
    }

    // Check if template exists
    if (!fs.existsSync(TEMPLATE_PATH)) {
      console.warn(
        `Template not found at ${TEMPLATE_PATH}, using fallback DOCX`
      );
      return createFallbackSideBySideDocxTemplate(pages);
    }

    sendProgress(progressId, 50, "Processing template...");

    // Read the template file
    const templateContent = fs.readFileSync(TEMPLATE_PATH);

    // Use docxtemplater to populate the template
    const zip = new PizZip(templateContent);

    let doc;
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "", // Return empty string for null values
      });
    } catch (templateError) {
      console.error("Template parsing error:", templateError);

      return createFallbackSideBySideDocxTemplate(pages);
    }

    const templateData = {
      docName: docName || "Untitled Document",
      targetLanguage: "Source Only",
      totalPages: pages.length,
      pages: pages,
    };

    console.log(
      `📊 Template data prepared for ${docName} (source only): ${pages.length} pages`
    );

    sendProgress(progressId, 70, "Rendering template...");

    // Render the template with data
    try {
      doc.render(templateData);
    } catch (renderError) {
      console.error("Template rendering error:", renderError);
      return createFallbackSideBySideDocxTemplate(pages);
    }

    sendProgress(progressId, 85, "Generating final document...");

    // Get the generated document buffer
    const docBuffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    return docBuffer;
  } catch (error) {
    console.error("Error creating source-only DOCX template:", error);
    // Fallback to simple structure
    const pages = [{ source: "Error", translation: "" }];
    return createFallbackSideBySideDocxTemplate(pages);
  }
}

/**
 * Create fallback side-by-side DOCX template when template is not available
 * @param {Array} pages - Pages array with source/translation pairs
 * @returns {Promise<Buffer>} - DOCX buffer
 */
async function createFallbackSideBySideDocxTemplate(pages) {
  const docxElements = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    // Add source content (clean format, no labels)
    if (page.source) {
      docxElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: page.source,
              size: 32,
            }),
          ],
        })
      );
    }

    // Add translation content (clean format, no labels)
    if (page.translation) {
      docxElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: page.translation,
              size: 32,
              italics: true,
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch margins
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: docxElements,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Create a simple DOCX buffer from document content
 * @param {string} docName - The document name
 * @param {Array} delta - The document content as a Delta array
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createDocxBuffer(docName, delta) {
  try {
    const docxElements = [];

    // Add document title
    docxElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: docName,
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

    // Extract footnotes from delta with actual content from database
    const footnotes = [];
    let currentPosition = 0;
    const footnoteMap = new Map();

    for (let i = 0; i < delta.length; i++) {
      const op = delta[i];

      if (typeof op.insert === "string") {
        if (op.attributes && op.attributes.footnote) {
          let threadId = op.attributes.footnote;
          if (typeof threadId === "object" && threadId !== null) {
            threadId = threadId.id || threadId.threadId;
          }
          if (typeof threadId !== "string") {
            continue;
          }
          if (!footnoteMap.has(threadId)) {
            const footnoteNumber = footnoteMap.size + 1;
            // Fetch actual footnote content from database
            let actualContent = `Footnote ${footnoteNumber}`;
            let deltaContent = "";
            if (op.attributes.footnoteContent) {
              deltaContent = op.attributes.footnoteContent;
            }
            if (op.attributes.footnoteText) {
              deltaContent = op.attributes.footnoteText;
            }
            if (op.attributes.note_on) {
              deltaContent = op.attributes.note_on;
            }
            if (op.attributes.content) {
              deltaContent = op.attributes.content;
            }
            if (op.attributes.text) {
              deltaContent = op.attributes.text;
            }
            if (op.attributes.footnote_content) {
              deltaContent = op.attributes.footnote_content;
            }
            if (op.attributes.footnote_text) {
              deltaContent = op.attributes.footnote_text;
            }
            try {
              const footnoteRecord = await prisma.footnote.findFirst({
                where: { threadId: threadId },
                select: {
                  id: true,
                  threadId: true,
                  content: true,
                  order: true,
                  docId: true,
                },
              });
              if (footnoteRecord) {
                if (footnoteRecord.content) {
                  if (deltaContent && deltaContent !== footnoteRecord.content) {
                    actualContent = `${footnoteRecord.content}\n\n${deltaContent}`;
                  } else {
                    actualContent = footnoteRecord.content;
                  }
                } else if (deltaContent) {
                  actualContent = deltaContent;
                }
              } else {
                if (deltaContent) {
                  actualContent = deltaContent;
                }
              }
            } catch (error) {
              if (deltaContent) {
                actualContent = deltaContent;
              }
            }
            const footnote = {
              threadId: threadId,
              number: footnoteNumber,
              position: currentPosition,
              content: actualContent,
              order: footnoteNumber,
              operationIndex: i,
            };
            footnoteMap.set(threadId, footnote);
            footnotes.push(footnote);
          } else {
            console.log(
              `📝 ${docName}: Footnote with thread ID ${threadId} already processed`
            );
          }
        }
        currentPosition += op.insert.length;
      }
    }

    // Convert delta to plain text with footnote markers
    const text = deltaToPlainText(delta);
    const paragraphs = text.split(/\n+/).filter((p) => p.trim());

    // Add content paragraphs
    for (const paragraph of paragraphs) {
      docxElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: paragraph,
              size: 24,
            }),
          ],
        })
      );
    }

    // Add footnotes if any exist
    if (footnotes.length > 0) {
      // Add separator
      docxElements.push(
        new Paragraph({
          children: [new TextRun({ text: "" })],
        })
      );
      docxElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Footnotes:",
              bold: true,
              size: 24,
            }),
          ],
        })
      );

      // Add each footnote
      for (const footnote of footnotes) {
        docxElements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${footnote.number}. `,
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: footnote.content,
                size: 20,
              }),
            ],
          })
        );
      }
    }

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
    console.error("Error creating DOCX buffer:", error);
    throw error;
  }
}

/**
 * Create a page view DOCX buffer from document content (simple page-based format)
 * @param {string} docName - The document name
 * @param {Array} delta - The document content as a Delta array
 * @returns {Promise<Buffer>} - The DOCX file as a buffer
 */
async function createPageViewDocxBuffer(docName, delta) {
  try {
    const docxElements = [];

    // Add document title
    docxElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: docName,
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

    // Extract footnotes from delta with actual content from database
    const footnotes = [];
    let currentPosition = 0;
    const footnoteMap = new Map();

    for (let i = 0; i < delta.length; i++) {
      const op = delta[i];

      if (typeof op.insert === "string") {
        if (op.attributes && op.attributes.footnote) {
          let threadId = op.attributes.footnote;
          if (typeof threadId === "object" && threadId !== null) {
            threadId = threadId.id || threadId.threadId;
          }
          if (typeof threadId !== "string") {
            continue;
          }
          if (!footnoteMap.has(threadId)) {
            const footnoteNumber = footnoteMap.size + 1;
            // Fetch actual footnote content from database
            let actualContent = `Footnote ${footnoteNumber}`;
            let deltaContent = "";
            if (op.attributes.footnoteContent) {
              deltaContent = op.attributes.footnoteContent;
            }
            if (op.attributes.footnoteText) {
              deltaContent = op.attributes.footnoteText;
            }
            if (op.attributes.note_on) {
              deltaContent = op.attributes.note_on;
            }
            if (op.attributes.content) {
              deltaContent = op.attributes.content;
            }
            if (op.attributes.text) {
              deltaContent = op.attributes.text;
            }
            if (op.attributes.footnote_content) {
              deltaContent = op.attributes.footnote_content;
            }
            if (op.attributes.footnote_text) {
              deltaContent = op.attributes.footnote_text;
            }
            try {
              const footnoteRecord = await prisma.footnote.findFirst({
                where: { threadId: threadId },
                select: {
                  id: true,
                  threadId: true,
                  content: true,
                  order: true,
                  docId: true,
                },
              });
              if (footnoteRecord) {
                if (footnoteRecord.content) {
                  if (deltaContent && deltaContent !== footnoteRecord.content) {
                    actualContent = `${footnoteRecord.content}\n\n${deltaContent}`;
                  } else {
                    actualContent = footnoteRecord.content;
                  }
                } else if (deltaContent) {
                  actualContent = deltaContent;
                }
              } else {
                if (deltaContent) {
                  actualContent = deltaContent;
                }
              }
            } catch (error) {
              if (deltaContent) {
                actualContent = deltaContent;
              }
            }
            const footnote = {
              threadId: threadId,
              number: footnoteNumber,
              position: currentPosition,
              content: actualContent,
              order: footnoteNumber,
              operationIndex: i,
            };
            footnoteMap.set(threadId, footnote);
            footnotes.push(footnote);
          } else {
            console.log(
              `📝 ${docName}: Footnote with thread ID ${threadId} already processed`
            );
          }
        }
        currentPosition += op.insert.length;
      }
    }

    // Convert delta to plain text
    const text = deltaToPlainText(delta);
    const paragraphs = text.split(/\n+/).filter((p) => p.trim());

    // Add content paragraphs with page breaks for page view format
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];

      // Add paragraph content
      docxElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: paragraph,
              size: 28, // Larger font for page view
            }),
          ],
        })
      );

      // Add page break after each paragraph (except the last one)
      if (i < paragraphs.length - 1) {
        docxElements.push(
          new Paragraph({
            children: [new TextRun({ text: "", break: 1 })],
            pageBreakBefore: true,
          })
        );
      }
    }

    // Add footnotes if any exist
    if (footnotes.length > 0) {
      // Add separator
      docxElements.push(
        new Paragraph({
          children: [new TextRun({ text: "" })],
        })
      );
      docxElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Footnotes:",
              bold: true,
              size: 24,
            }),
          ],
        })
      );

      // Add each footnote
      for (const footnote of footnotes) {
        docxElements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${footnote.number}. `,
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: footnote.content,
                size: 20,
              }),
            ],
          })
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch margins
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: docxElements,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error("Error creating page view DOCX buffer:", error);
    throw error;
  }
}

module.exports = router;
