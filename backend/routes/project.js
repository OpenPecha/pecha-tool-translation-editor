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
            name: true,
            updatedAt: true,
            translations: {
              select: {
                id:true
              }
            }
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
