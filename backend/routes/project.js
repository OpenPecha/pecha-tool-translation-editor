const express = require("express");
const { PrismaClient } = require("@prisma/client");
const {authenticate} = require("../middleware/authenticate");
const router = express.Router();
const archiver = require("archiver");
const Y = require("yjs");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require("docx");
const path = require("path");

const prisma = new PrismaClient();

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
              userId: req.user.id
            }
          }
        }
      ],
      status: status !== "all" ? status : undefined,
      name: searchQuery ? {
        contains: searchQuery
      } : undefined
    };

    const [projects, totalCount] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        include: {
          owner: {
            select: {
              id: true,
              username: true
            }
          },
          roots: {
            select: {
              id: true,
              name: true,
              updatedAt: true,
              translations: {
                select: {
                  id: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.project.count({ where: whereClause })
    ]);
    const totalPages = Math.ceil(totalCount / limit);
    
    res.json({
      data: projects,
      pagination: {
        page,
        limit,
        totalItems: totalCount,
        totalPages
      }
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
        permissions: true
      }
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Only the owner can add users
    if (existingProject.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to add users to this project" });
    }
    
    // Find the user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!userToAdd) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if user already has permission
    const existingPermission = existingProject.permissions.find(
      permission => permission.userId === userToAdd.id
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
              email: true
            }
          }
        }
      });
      
      return res.json({
        success: true,
        message: "User permission updated",
        data: updatedPermission
      });
    }
    
    // Create new permission
    const newPermission = await prisma.permission.create({
      data: {
        Project: {
          connect: { id }
        },
        user: {
          connect: { id: userToAdd.id }
        },
        canRead: true,
        canWrite
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });
    
    res.status(201).json({
      success: true,
      message: "User added to project",
      data: newPermission
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
            email: true
          }
        },
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if user has permission to view project
    const hasPermission = existingProject.ownerId === req.user.id || 
      existingProject.permissions.some(p => p.userId === req.user.id);
      
    if (!hasPermission) {
      return res.status(403).json({ error: "Not authorized to view this project" });
    }
    
    res.json({
      success: true,
      data: {
        owner: existingProject.owner,
        permissions: existingProject.permissions
      }
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
      where: { id }
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Only the owner can update permissions
    if (existingProject.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to update permissions in this project" });
    }
    
    // Find the permission
    const permission = await prisma.permission.findFirst({
      where: {
        projectId: id,
        userId
      }
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
            email: true
          }
        }
      }
    });
    
    res.json({
      success: true,
      message: "User permission updated",
      data: updatedPermission
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
      where: { id }
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Only the owner can remove users
    if (existingProject.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to remove users from this project" });
    }
    
    // Find the permission
    const permission = await prisma.permission.findFirst({
      where: {
        projectId: id,
        userId
      }
    });
    
    if (!permission) {
      return res.status(404).json({ error: "Permission not found" });
    }
    
    // Delete the permission
    await prisma.permission.delete({
      where: { id: permission.id }
    });
    
    res.json({
      success: true,
      message: "User removed from project"
    });
  } catch (error) {
    console.error("Error removing user from project:", error);
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
            username: true
          }
        },
        roots: true,
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
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
      return res.status(400).json({ error: "Name and identifier are required" });
    }
    // Create project with proper permission structure
    const project = await prisma.project.create({
      data: {
        name,
        identifier:identifier+"_"+Date.now(),
        ownerId: req.user.id,
        metadata,
        roots: rootId ? {
          connect: { id: rootId }
        } : undefined,
        permissions: {
          create: {
            // Now that docId is optional, we don't need to provide it for project-level permissions
            // Connect to the user instead of using userId directly
            user: {
              connect: { id: req.user.id }
            },
            canRead: true,
            canWrite: true
          }
        }
      }
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
      where: { id }
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (existingProject.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to update this project" });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name,
        identifier,
        metadata,
        status
      }
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
      where: { id }
    });

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (existingProject.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to delete this project" });
    }

    // Soft delete by updating status
    await prisma.project.update({
      where: { id },
      data: { status: "deleted" }
    });

    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: error.message });
  }
});



// Download all documents in a project as a zip file
router.get("/:id/download-zip", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if project exists and user has permission
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        roots: {
          include: {
            translations: true
          }
        },
        permissions: {
          where: { userId: req.user.id }
        }
      }
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
    const archive = archiver('zip', {
      zlib: { level: 9 } // Compression level
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_documents.zip`);

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
            name: `${rootDoc.name}_${translation.language}.docx` 
          });
        }
      }
    }

    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    console.error("Error creating zip file:", error);
    res.status(500).json({ error: error.message });
  }
});

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
        docs_y_doc_state: true
      }
    });

    if (!document) return null;

    // Get content from ProseMirror delta or Y.js state
    let delta = null;
    if (document.docs_prosemirror_delta) {
      delta = document.docs_prosemirror_delta;
    } else if (document.docs_y_doc_state) {
      const ydoc = new Y.Doc({gc: true});
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
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `Document: ${docName} (No content available)` })
              ],
            }),
          ],
        }],
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
      if (typeof op.insert === 'string') {
        // Split by newlines to handle paragraphs
        const textParts = op.insert.split('\n');
        
        for (let j = 0; j < textParts.length; j++) {
          const text = textParts[j];
          
          // Only add non-empty text
          if (text.length > 0) {
            // Create a text run with the current formatting attributes
            // Determine if this is a heading and what level
            const isHeading = op.attributes?.header || 
                            op.attributes?.h1 === true || 
                            op.attributes?.h2 === true || 
                            op.attributes?.h === 1 || 
                            op.attributes?.h === 2;
            
            // Determine heading level
            const headingLevel = op.attributes?.header || 
                              (op.attributes?.h1 === true ? 1 : undefined) || 
                              (op.attributes?.h2 === true ? 2 : undefined) || 
                              op.attributes?.h;
            
            // Set font size based on heading level
            let fontSize = 24; // Default size (12pt)
            if (isHeading) {
              if (headingLevel === 1) fontSize = 36; // 18pt for H1
              else if (headingLevel === 2) fontSize = 30; // 15pt for H2
            } else if (op.attributes?.size) {
              fontSize = op.attributes?.size === 'large' ? 32 : 
                        op.attributes?.size === 'huge' ? 36 : 
                        op.attributes?.size === 'small' ? 20 : 24;
            }
            
            const textRun = new TextRun({
              text: text,
              bold: op.attributes?.bold || currentAttributes.bold || isHeading, // Make headings bold
              italics: op.attributes?.italic || currentAttributes.italic,
              strike: op.attributes?.strike || currentAttributes.strike,
              underline: op.attributes?.underline ? { type: 'single' } : undefined,
              color: op.attributes?.color ? op.attributes.color.replace('#', '') : undefined,
              highlight: op.attributes?.background ? 'yellow' : undefined,
              size: fontSize,
            });
            
            currentRuns.push(textRun);
          }
          
          // If not the last part, create a new paragraph
          if (j < textParts.length - 1) {
            // Create paragraph with appropriate formatting
            const paragraph = new Paragraph({
              children: currentRuns,
              heading: op.attributes?.header === 1 ? HeadingLevel.HEADING_1 :
                      op.attributes?.header === 2 ? HeadingLevel.HEADING_2 : undefined,
              alignment: op.attributes?.align === 'center' ? AlignmentType.CENTER :
                        op.attributes?.align === 'right' ? AlignmentType.RIGHT :
                        op.attributes?.align === 'justify' ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
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
      else if (op.insert && typeof op.insert === 'object') {
        // Handle image if present (not fully implemented, would need image processing)
        if (op.insert.image) {
          // For now, just add a placeholder text
          currentRuns.push(new TextRun({ text: '[Image]', italics: true }));
        }
      }
      
      // If this is the last operation or the next one starts a new paragraph,
      // create a paragraph with the current runs
      if (i === delta.length - 1 || 
          (delta[i+1] && typeof delta[i+1].insert === 'string' && delta[i+1].insert.includes('\n'))) {
        if (currentRuns.length > 0) {
          const paragraph = new Paragraph({
            children: currentRuns,
            heading: op.attributes?.header === 1 ? HeadingLevel.HEADING_1 :
                    op.attributes?.header === 2 ? HeadingLevel.HEADING_2 :
                    op.attributes?.h1 ? HeadingLevel.HEADING_1 :
                    op.attributes?.h2 ? HeadingLevel.HEADING_2 :
                    op.attributes?.h === 1 ? HeadingLevel.HEADING_1 :
                    op.attributes?.h === 2 ? HeadingLevel.HEADING_2 : undefined,
            alignment: op.attributes?.align === 'center' ? AlignmentType.CENTER :
                      op.attributes?.align === 'right' ? AlignmentType.RIGHT :
                      op.attributes?.align === 'justify' ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
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
          children: [new TextRun({ text: `Document: ${docName} (No content available)` })]
        })
      );
    }
    
    // Create the document with all the paragraphs
    const doc = new Document({
      sections: [{
        properties: {},
        children: docxParagraphs
      }]
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
          if (typeof op.insert === 'string') {
            plainText += op.insert;
          }
        }
      }
      
      // Create a simple document with the plain text
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun(plainText || `Document: ${docName} (No content available)`)
              ],
            }),
          ],
        }],
      });
      
      return await Packer.toBuffer(doc);
    } catch (fallbackError) {
      console.error("Fallback error:", fallbackError);
      
      // Last resort: return a simple text buffer
      return Buffer.from(`Error processing document ${docName}.`);
    }
  }
}

module.exports = router;
