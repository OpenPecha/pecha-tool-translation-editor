const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const authenticate = require("../middleware/authenticate");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const SECRET_KEY = process.env.SECRET_KEY || "super-secret-key";

/**
 * @route   GET /users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        picture: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /users
 * @desc    Create or update user from OAuth login
 * @access  Public
 */
router.post("/", async (req, res) => {
  try {
    const { username, email, picture } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required"
      });
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      // Update existing user if needed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: username || user.username,
          picture: picture || user.picture
        }
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          username: username || email.split("@")[0],
          email,
          picture
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      SECRET_KEY,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          picture: user.picture
        },
        token
      }
    });
  } catch (error) {
    console.error("Error creating/updating user:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /users/search
 * @desc    Search for users by email
 * @access  Private
 */
router.get("/search", authenticate, async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required for search" });
    }
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        picture: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error("Error searching for user:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        picture: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put("/me", authenticate, async (req, res) => {
  try {
    const { username, picture } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        username,
        picture
      },
      select: {
        id: true,
        username: true,
        email: true,
        picture: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all translations for a root text
router.get("/translations/:rootId", async (req, res) => {
  try {
    const { rootId } = req.params;
    const translations = await prisma.doc.findMany({
      where: {
        rootId,
        isRoot: false,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: translations,
    });
  } catch (error) {
    console.error("Error fetching translations:", error);
    res.status(500).json({ error: error.message });
  }
});



// Get diff between current and previous version
router.get("/version-diff/:versionId", async (req, res) => {
  const { versionId } = req.params;

  try {
    // Fetch the current version
    const currentVersion = await prisma.version.findUnique({
      where: { id: versionId },
      select: {
        content: true,
        docId: true,
        timestamp: true,
      },
    });
    if (!currentVersion) {
      return res.status(404).json({ error: "Version not found" });
    }

    // Find the previous version of the same doc based on timestamp
    const previousVersion = await prisma.version.findFirst({
      where: {
        docId: currentVersion.docId,
        timestamp: {
          lt: currentVersion.timestamp,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      select: {
        content: true,
      },
    });


    const oldDelta = previousVersion ? new Delta(previousVersion.content?.ops): new Delta();
    const newDelta = new Delta(currentVersion.content?.ops);
    const diffs1 = markDiff(oldDelta, newDelta);

    const diffs=oldDelta?.compose(new Delta(diffs1));
    return res.json({
      diffs,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});






module.exports = router;
