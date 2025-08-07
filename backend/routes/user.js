const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/authenticate");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const SECRET_KEY = process.env.SECRET_KEY || "super-secret-key";

/**
 * GET /users/me
 * @summary Get current user profile
 * @tags Users - User management operations
 * @security BearerAuth
 * @return {object} 200 - User profile information
 * @return {object} 404 - User not found
 * @return {object} 500 - Server error
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
 * POST /users
 * @summary Create or update user from OAuth login
 * @tags Users - User management operations
 * @param {object} request.body.required - User information
 * @param {string} request.body.username - Username
 * @param {string} request.body.email.required - User email
 * @param {string} request.body.picture - Profile picture URL
 * @return {object} 200 - User created/updated with JWT token
 * @return {object} 400 - Bad request - Email is required
 * @return {object} 500 - Server error
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
 * GET /users/search
 * @summary Search users by email or username
 * @tags Users - User management operations
 * @security BearerAuth
 * @param {string} query.query.required - Search query (email or username)
 * @return {object} 200 - Search results
 * @return {object} 400 - Missing query
 * @return {object} 500 - Server error
 */
router.get("/search", authenticate, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Search users by email or username
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        picture: true,
      },
      take: 10, // Limit results
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /users/{id}
 * @summary Get user by ID
 * @tags Users - User management operations
 * @param {string} id.path.required - User ID
 * @return {object} 200 - User profile
 * @return {object} 404 - User not found
 * @return {object} 500 - Server error
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
 * PUT /users/me
 * @summary Update current user profile
 * @tags Users - User management operations
 * @security BearerAuth
 * @param {object} request.body.required - User profile update
 * @param {string} request.body.username - New username
 * @param {string} request.body.picture - New profile picture URL
 * @return {object} 200 - Updated user profile
 * @return {object} 500 - Server error
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

/**
 * GET /users/translations/{rootId}
 * @summary Get all translations for a root text
 * @tags Users - User management operations
 * @param {string} rootId.path.required - Root document ID
 * @return {object} 200 - List of translations
 * @return {object} 500 - Server error
 */
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



/**
 * GET /users/version-diff/{versionId}
 * @summary Get diff between current and previous version
 * @tags Users - User management operations
 * @param {string} versionId.path.required - Version ID
 * @return {object} 200 - Diff between versions
 * @return {object} 404 - Version not found
 * @return {object} 500 - Server error
 */
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


    const oldDelta = previousVersion ? new Delta(previousVersion.content?.ops) : new Delta();
    const newDelta = new Delta(currentVersion.content?.ops);
    const diffs1 = markDiff(oldDelta, newDelta);

    const diffs = oldDelta?.compose(new Delta(diffs1));
    return res.json({
      diffs,
    });
  } catch (err) {
    console.error("Error getting version diff:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});






module.exports = router;
