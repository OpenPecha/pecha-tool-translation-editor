const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/authenticate"); // Assuming authentication middleware exists

const prisma = new PrismaClient();

/**
 * GET /versions/{docId}
 * @summary Get all versions for a specific document
 * @tags Versions - Document version management
 * @security BearerAuth
 * @param {string} docId.path.required - Document ID - eg: doc-123
 * @return {array<object>} 200 - List of versions with current version marked
 * @return {object} 500 - Server error
 * @example response - 200 - Success response
 * [
 *   {
 *     "id": "version-123",
 *     "label": "Auto-save v1",
 *     "createdAt": "2024-01-01T00:00:00.000Z",
 *     "updatedAt": "2024-01-01T00:00:00.000Z",
 *     "isCurrent": true,
 *     "user": {
 *       "id": "user-456",
 *       "username": "John Doe"
 *     }
 *   }
 * ]
 */
router.get("/:docId", authenticate, async (req, res) => {
	try {
		const { docId } = req.params;

		// Get the document's current version ID
		const document = await prisma.doc.findUnique({
			where: { id: docId },
			select: { currentVersionId: true },
		});

		const versions = await prisma.version.findMany({
			where: { docId },
			select: {
				label: true,
				id: true,
				user: true,
				createdAt: true,
				updatedAt: true,
			},
			orderBy: { createdAt: "desc" },
		});

		// Mark the current version
		const versionsWithCurrentFlag = versions.map((version) => ({
			...version,
			isCurrent: version.id === document?.currentVersionId,
		}));

		res.json(versionsWithCurrentFlag);
	} catch (error) {
		console.error("Error fetching versions:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

/**
 * POST /versions
 * @summary Create a new version
 * @tags Versions - Document version management
 * @security BearerAuth
 * @param {object} request.body.required - Version information - application/json
 * @param {string} request.body.docId.required - Document ID - eg: doc-123
 * @param {string} request.body.label.required - Version label - eg: Manual save v2
 * @param {object} request.body.content.required - Document content (Delta format) - eg: {"ops":[{"insert":"Hello world"}]}
 * @return {object} 201 - Created version
 * @return {object} 400 - Bad request - Missing required fields
 * @return {object} 500 - Server error
 * @example request - Example request body
 * {
 *   "docId": "doc-123",
 *   "label": "Manual save v2",
 *   "content": {"ops": [{"insert": "Hello world\n"}]}
 * }
 */
router.post("/", authenticate, async (req, res) => {
	try {
		const { docId, label, content } = req.body;

		// Validate input
		if (!docId || !label || !content) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		const newVersion = await prisma.version.create({
			data: {
				docId,
				label,
				content,
				userId: req.user.id,
			},
		});
		// Update document's currentVersionId to this version
		await prisma.doc.update({
			where: { id: docId },
			data: { currentVersionId: newVersion.id },
		});

		res.status(201).json(newVersion);
	} catch (error) {
		console.error("Error creating version:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

/**
 * GET /versions/version/{id}
 * @summary Get a specific version by ID
 * @tags Versions - Document version management
 * @security BearerAuth
 * @param {string} id.path.required - Version ID - eg: version-123
 * @return {object} 200 - Version details with content
 * @return {object} 404 - Version not found
 * @return {object} 500 - Server error
 */
router.get("/version/:id", authenticate, async (req, res) => {
	try {
		const { id } = req.params;
		const version = await prisma.version.findUnique({
			where: { id },
			include: {
				user: true,
			},
		});

		if (!version) {
			return res.status(404).json({ error: "Version not found" });
		}
		// Update document's currentVersionId to this version
		await prisma.doc.update({
			where: { id: version.docId },
			data: { currentVersionId: version.id },
		});

		res.json(version);
	} catch (error) {
		console.error("Error fetching version:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

/**
 * DELETE /versions/version/{id}
 * @summary Delete a specific version
 * @tags Versions - Document version management
 * @security BearerAuth
 * @param {string} id.path.required - Version ID - eg: version-123
 * @return {object} 200 - Success message
 * @return {object} 404 - Version not found
 * @return {object} 500 - Server error
 */
router.delete("/version/:id", authenticate, async (req, res) => {
	try {
		const { id } = req.params;

		// Check if the version exists
		const existingVersion = await prisma.version.findUnique({ where: { id } });
		if (!existingVersion) {
			return res.status(404).json({ error: "Version not found" });
		}

		// Prevent deletion of system-generated versions (initial versions)
		if (!existingVersion.userId) {
			return res.status(403).json({
				error: "Cannot delete system-generated version",
			});
		}

		// Check if this version is currently set as the document's current version
		// Delete the version - currentVersionId tracking temporarily disabled
		await prisma.version.delete({ where: { id } });

		// If this version was the current version, update the document to use the most recent remaining version
		if (existingVersion.id === existingVersion.doc?.currentVersionId) {
			const latestVersion = await prisma.version.findFirst({
				where: {
					docId: existingVersion.docId,
					id: { not: existingVersion.id },
				},
				orderBy: { createdAt: "desc" },
			});

			await prisma.doc.update({
				where: { id: existingVersion.docId },
				data: { currentVersionId: latestVersion?.id || null },
			});
		}

		res.json({ message: "Version deleted successfully" });
	} catch (error) {
		console.error("Error deleting version:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

/**
 * PATCH /versions/version/{id}
 * @summary Update a version label
 * @tags Versions - Document version management
 * @security BearerAuth
 * @param {string} id.path.required - Version ID - eg: version-123
 * @param {object} request.body.required - Updated version information - application/json
 * @param {string} request.body.label.required - New version label - eg: Updated label
 * @return {object} 200 - Updated version
 * @return {object} 400 - Bad request - Label is required
 * @return {object} 500 - Server error
 */
router.patch("/version/:id", authenticate, async (req, res) => {
	try {
		const { id } = req.params;
		const { label } = req.body;

		if (!label) {
			return res.status(400).json({ error: "Label is required for update" });
		}

		// Check if the version exists and prevent modification of system-generated versions
		const existingVersion = await prisma.version.findUnique({ where: { id } });
		if (!existingVersion) {
			return res.status(404).json({ error: "Version not found" });
		}
		if (!existingVersion.userId) {
			return res.status(403).json({
				error: "Cannot modify system-generated version",
			});
		}

		const updatedVersion = await prisma.version.update({
			where: { id },
			data: { label },
		});

		res.json(updatedVersion);
	} catch (error) {
		console.error("Error updating version:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

/**
 * PUT /versions/version/{id}
 * @summary Update version content
 * @tags Versions - Document version management
 * @security BearerAuth
 * @param {string} id.path.required - Version ID - eg: version-123
 * @param {object} request.body.required - Updated version content - application/json
 * @param {object} request.body.content.required - New document content (Delta format) - eg: {"ops":[{"insert":"Updated content"}]}
 * @return {object} 200 - Updated version
 * @return {object} 400 - Bad request - Content is required
 * @return {object} 404 - Version not found
 * @return {object} 500 - Server error
 */
router.put("/version/:id", authenticate, async (req, res) => {
	try {
		const { id } = req.params;
		const { content } = req.body;

		if (!content) {
			return res.status(400).json({ error: "Content is required for update" });
		}

		// Check if the version exists and belongs to the user or is accessible
		const existingVersion = await prisma.version.findUnique({
			where: { id },
			include: { user: true },
		});

		if (!existingVersion) {
			return res.status(404).json({ error: "Version not found" });
		}

		// Prevent modification of system-generated versions
		if (!existingVersion.userId) {
			return res.status(403).json({
				error: "Cannot modify system-generated version",
			});
		}

		const updatedVersion = await prisma.version.update({
			where: { id },
			data: {
				content,
			},
			include: { user: true },
		});

		// Note: currentVersionId update temporarily disabled due to Prisma client sync issues
		// Version will be identified as current by timestamp when needed

		res.json(updatedVersion);
	} catch (error) {
		console.error("Error updating version content:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
