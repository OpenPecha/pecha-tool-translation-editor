const express = require("express");
const { authenticate } = require("../middleware/authenticate");
const router = express.Router();
const archiver = require("archiver");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const {
  createDocxBuffer,
  createSideBySideDocx,
  createLineByLineDocx,
  convertMarkdownToDocx,
  createSideBySideDocxTemplate,
  createSourceOnlyDocxTemplate,
} = require("../utils/docx");
const {
  generateMarkdownWithFootnotes,
  extractFootnotesFromDelta,
  getDocumentContent,
} = require("../utils/delta_operations");
const { isPandocAvailable } = require("../utils/system_commands");
const {
  getProjects,
  getProjectsCount,
  getProjectById,
  getUserByEmail,
  updatePermission,
  createPermission,
  getProject,
  getPermission,
  deletePermission,
  getProjectWithPermissions,
  createProject,
  updateProject,
  deleteProject,
  getProjectWithDocuments,
} = require("../utils/model");
const { sendProgress, progressStreams } = require("../utils/progress");

const prisma = new PrismaClient();

// Configuration constants
const TEXT_CHUNK_LENGTH = 300; // Characters per chunk

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
    };

    // Only add status filter if not "all"
    if (status !== "all") {
      whereClause.status = status;
    }

    // Only add name filter if searchQuery is provided
    if (searchQuery) {
      whereClause.name = {
        contains: searchQuery,
        mode: "insensitive",
      };
    }

    const [projects, totalCount] = await Promise.all([
      getProjects(whereClause, skip, limit),
      getProjectsCount(whereClause),
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
    const existingProject = await getProjectById(id);

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
    const userToAdd = await getUserByEmail(email);

    if (!userToAdd) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user already has permission
    const existingPermission = existingProject.permissions.find(
      (permission) => permission.userId === userToAdd.id
    );

    if (existingPermission) {
      // Update existing permission
      const updatedPermission = await updatePermission(
        existingPermission,
        canWrite
      );

      return res.json({
        success: true,
        message: "User permission updated",
        data: updatedPermission,
      });
    }

    // Create new permission
    const newPermission = await createPermission(id, userToAdd, canWrite);

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
    const existingProject = await getProjectWithPermissions(id);

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
    const existingProject = await getProject(id);

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
    const permission = await getPermission(id, userId);

    if (!permission) {
      return res.status(404).json({ error: "Permission not found" });
    }

    // Update the permission
    const updatedPermission = await updatePermission(permission, canWrite);
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
    const existingProject = await getProject(id);

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
    const permission = await getPermission(id, userId);

    if (!permission) {
      return res.status(404).json({ error: "Permission not found" });
    }

    // Delete the permission
    await deletePermission(permission);

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

    const project = await getProjectWithPermissions(id);

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
    const project = await getProjectWithPermissions(id);

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
    const project = await createProject(
      name,
      identifier,
      metadata,
      rootId,
      req.user.id
    );

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
    const existingProject = await getProject(id);

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (existingProject.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this project" });
    }

    const updatedProject = await updateProject(
      id,
      name,
      identifier,
      metadata,
      status
    );

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
    const existingProject = await getProject(id);

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (existingProject.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this project" });
    }

    // Soft delete by updating status
    await deleteProject(id);

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
      const project = await getProjectWithDocuments(id, req.user.id);

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
      const project = await getProjectWithDocuments(id, req.user.id);

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
      const project = await getProjectWithDocuments(id, req.user.id);

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
      sendProgress(
        progressStreams,
        progressId,
        5,
        "Starting docx-template export..."
      );

      // Process all root documents with their translations combined
      let totalDocs = project.roots.length;
      let processedDocs = 0;

      for (const rootDoc of project.roots) {
        sendProgress(
          progressStreams,
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
              console.log(combinedDocx);
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
        sendProgress(progressStreams, progressId, 100, "Export completed!");
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
      console.log("page-view");
      // Export individual DOCX files for each document in page view format (single language mode)
      const { progressId } = req.query;

      // Check if project exists and user has permission
      const project = await getProjectWithDocuments(id, req.user.id);

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
      sendProgress(
        progressStreams,
        progressId,
        5,
        "Starting page view export..."
      );

      // Calculate total documents (roots + translations)
      let totalDocs = project.roots.length;
      for (const root of project.roots) {
        totalDocs += root.translations.length;
      }
      let processedDocs = 0;

      // Helper function to extract footnotes from delta

      // Process all root documents
      for (const rootDoc of project.roots) {
        sendProgress(
          progressStreams,
          progressId,
          Math.round((processedDocs / totalDocs) * 90) + 5,
          `Processing ${rootDoc.name}...`
        );

        const rootDocContent = await getDocumentContent(rootDoc.id);
        if (rootDocContent) {
          // Extract footnotes from root document
          const rootFootnotes = await extractFootnotesFromDelta(rootDocContent);

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
            progressStreams,
            progressId,
            Math.round((processedDocs / totalDocs) * 90) + 5,
            `Processing ${rootDoc.name} - ${translation.language}...`
          );

          const translationContent = await getDocumentContent(translation.id);
          if (translationContent) {
            // Extract footnotes from translation document
            const translationFootnotes = await extractFootnotesFromDelta(
              translationContent
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
        sendProgress(progressStreams, progressId, 100, "Export completed!");
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
      const project = await getProjectWithDocuments(id, req.user.id);

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
      sendProgress(
        progressStreams,
        progressId,
        5,
        "Starting pecha templates export..."
      );

      // Calculate total documents (roots + translations)
      let totalDocs = project.roots.length;
      for (const root of project.roots) {
        totalDocs += root.translations.length;
      }
      let processedDocs = 0;

      // Process all root documents
      for (const rootDoc of project.roots) {
        sendProgress(
          progressStreams,
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
            progressStreams,
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
        sendProgress(progressStreams, progressId, 100, "Export completed!");
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
      const project = await getProjectWithDocuments(id, req.user.id);

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

// Store active progress streams

/**
 * POST /projects/{id}/share
 * @summary Update project sharing settings
 * @tags Projects - Sharing
 * @security BearerAuth
 * @param {string} id.path.required - Project ID
 * @param {object} request.body.required - Sharing settings
 * @param {boolean} request.body.isPublic - Whether project is public
 * @param {string} request.body.publicAccess - Public access level (none, viewer, editor)
 * @return {object} 200 - Updated sharing settings
 * @return {object} 403 - Forbidden - Not project owner
 * @return {object} 404 - Project not found
 * @return {object} 500 - Server error
 */
router.post("/:id/share", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublic, publicAccess } = req.body;

    console.log("Share request received:", { id, isPublic, publicAccess });

    // Check if project exists and get root documents
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        roots: {
          where: { isRoot: true },
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log("Project found:", project ? "Yes" : "No");

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Only owner can update sharing settings
    if (project.ownerId !== req.user.id) {
      return res.status(403).json({
        error: "Not authorized to update sharing settings",
      });
    }

    // Check if project has a root document
    if (!project.roots || project.roots.length === 0) {
      return res.status(400).json({
        error: "Project must have a root document to be shared",
      });
    }

    // Generate share link if making public
    let shareLink = project.shareLink;
    if (isPublic && !shareLink) {
      shareLink = crypto.randomBytes(32).toString("hex");
      console.log("Generated new share link:", shareLink);
    }


    // Update project
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        isPublic: isPublic || false,
        publicAccess: publicAccess || "none",
        shareLink: isPublic ? shareLink : null,
      },
    });


    // Generate direct link to root document instead of project link
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const rootDocument = project.roots[0]; // Get the first root document
    const shareableLink = updatedProject.isPublic
      ? `${baseUrl}/documents/public/${rootDocument.id}`
      : null;
    res.json({
      success: true,
      data: {
        ...updatedProject,
        shareableLink,
        rootDocument,
      },
    });
  } catch (error) {
    console.error("Error updating project sharing:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /projects/{id}/share
 * @summary Get project sharing information
 * @tags Projects - Sharing
 * @security BearerAuth
 * @param {string} id.path.required - Project ID
 * @return {object} 200 - Sharing information
 * @return {object} 403 - Forbidden - No access
 * @return {object} 404 - Project not found
 * @return {object} 500 - Server error
 */
router.get("/:id/share", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get project with permissions and root documents
    const project = await prisma.project.findUnique({
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
        roots: {
          where: { isRoot: true },
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if user has permission to view sharing settings
    const hasPermission =
      project.ownerId === req.user.id ||
      project.permissions.some((p) => p.userId === req.user.id);

    if (!hasPermission) {
      return res.status(403).json({
        error: "Not authorized to view sharing settings",
      });
    }

    // Generate direct link to root document instead of project link
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const rootDocument =
      project.roots && project.roots.length > 0 ? project.roots[0] : null;
    const shareableLink =
      project.isPublic && rootDocument
        ? `${baseUrl}/documents/public/${rootDocument.id}`
        : null;

    res.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        isPublic: project.isPublic,
        publicAccess: project.publicAccess,
        shareableLink,
        isOwner: project.ownerId === req.user.id,
        permissions: project.permissions,
        owner: project.owner,
        rootDocument,
      },
    });
  } catch (error) {
    console.error("Error fetching project sharing info:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /projects/{id}/collaborators
 * @summary Add collaborator to project
 * @tags Projects - Collaboration
 * @security BearerAuth
 * @param {string} id.path.required - Project ID
 * @param {object} request.body.required - Collaborator data
 * @param {string} request.body.email - User email
 * @param {string} request.body.accessLevel - Access level (viewer, editor, admin)
 * @param {string} request.body.message - Optional invitation message
 * @return {object} 200 - Collaborator added
 * @return {object} 403 - Forbidden - Not authorized
 * @return {object} 404 - User or project not found
 * @return {object} 500 - Server error
 */
router.post("/:id/collaborators", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, accessLevel = "viewer", message } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate access level
    if (!["viewer", "editor", "admin"].includes(accessLevel)) {
      return res.status(400).json({ error: "Invalid access level" });
    }

    // Check if project exists
    const project = await getProject(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if user has permission to add collaborators
    const hasPermission = project.ownerId === req.user.id;
    if (!hasPermission) {
      return res.status(403).json({
        error: "Not authorized to add collaborators",
      });
    }

    // Find user by email
    const userToAdd = await getUserByEmail(email);
    if (!userToAdd) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is already a collaborator
    const existingPermission = await prisma.permission.findFirst({
      where: {
        projectId: id,
        userId: userToAdd.id,
      },
    });

    if (existingPermission) {
      // Update existing permission
      const updatedPermission = await prisma.permission.update({
        where: { id: existingPermission.id },
        data: {
          accessLevel,
          canWrite: ["editor", "admin"].includes(accessLevel),
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

      return res.json({
        success: true,
        message: "Collaborator access level updated",
        data: updatedPermission,
      });
    }

    // Create new permission
    const newPermission = await prisma.permission.create({
      data: {
        projectId: id,
        userId: userToAdd.id,
        accessLevel,
        canRead: true,
        canWrite: ["editor", "admin"].includes(accessLevel),
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
      message: "Collaborator added successfully",
      data: newPermission,
    });
  } catch (error) {
    console.error("Error adding collaborator:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /projects/{id}/collaborators/{userId}
 * @summary Update collaborator access level
 * @tags Projects - Collaboration
 * @security BearerAuth
 * @param {string} id.path.required - Project ID
 * @param {string} userId.path.required - User ID
 * @param {object} request.body.required - Update data
 * @param {string} request.body.accessLevel - New access level (viewer, editor, admin)
 * @return {object} 200 - Access level updated
 * @return {object} 403 - Forbidden - Not authorized
 * @return {object} 404 - Permission not found
 * @return {object} 500 - Server error
 */
router.patch("/:id/collaborators/:userId", authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { accessLevel } = req.body;

    if (!accessLevel) {
      return res.status(400).json({ error: "Access level is required" });
    }

    // Validate access level
    if (!["viewer", "editor", "admin"].includes(accessLevel)) {
      return res.status(400).json({ error: "Invalid access level" });
    }

    // Check if project exists
    const project = await getProject(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if user has permission to update collaborators
    const hasPermission = project.ownerId === req.user.id;
    if (!hasPermission) {
      return res.status(403).json({
        error: "Not authorized to update collaborators",
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
      return res.status(404).json({ error: "Collaborator not found" });
    }

    // Update permission
    const updatedPermission = await prisma.permission.update({
      where: { id: permission.id },
      data: {
        accessLevel,
        canWrite: ["editor", "admin"].includes(accessLevel),
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

    res.json({
      success: true,
      message: "Access level updated",
      data: updatedPermission,
    });
  } catch (error) {
    console.error("Error updating collaborator:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /projects/{id}/collaborators/{userId}
 * @summary Remove collaborator from project
 * @tags Projects - Collaboration
 * @security BearerAuth
 * @param {string} id.path.required - Project ID
 * @param {string} userId.path.required - User ID
 * @return {object} 200 - Collaborator removed
 * @return {object} 403 - Forbidden - Not authorized
 * @return {object} 404 - Permission not found
 * @return {object} 500 - Server error
 */
router.delete("/:id/collaborators/:userId", authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if project exists
    const project = await getProject(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if user has permission to remove collaborators
    const hasPermission = project.ownerId === req.user.id;
    if (!hasPermission) {
      return res.status(403).json({
        error: "Not authorized to remove collaborators",
      });
    }

    // Don't allow removing the owner
    if (userId === project.ownerId) {
      return res.status(400).json({
        error: "Cannot remove project owner",
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
      return res.status(404).json({ error: "Collaborator not found" });
    }

    // Delete permission
    await prisma.permission.delete({
      where: { id: permission.id },
    });

    res.json({
      success: true,
      message: "Collaborator removed",
    });
  } catch (error) {
    console.error("Error removing collaborator:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
