const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authenticate = require("../middleware/authenticate");
const router = express.Router();

const prisma = new PrismaClient();

// Get all projects
router.get("/", authenticate, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
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
        status: { not: "deleted" }
      },
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
            identifier: true,
            updatedAt: true
          }
        }
      }
    });
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
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
        identifier,
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

module.exports = router;
