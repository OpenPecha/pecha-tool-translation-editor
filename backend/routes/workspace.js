const express = require("express");
const { getToolsList } = require("../apis/workspace");
const router = express.Router();

/**
 * GET /workspace/tools
 * @summary Get a list of available tools from the workspace API
 * @tags Workspace - Workspace tools and utilities
 * @return {object} 200 - Success response with tools data
 * @return {object} 500 - Server error - Failed to fetch tools
 * @example response - 200 - Success response example
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "20a2da45-1025-4ad5-9dac-4b1b3d21c41c",
 *       "name": "Annotation Editor",
 *       "description": "Annotate Tibetan Texts",
 *       "category": "",
 *       "price": null,
 *       "link": "https://annotations.pecha.tools",
 *       "demo": "",
 *       "icon": "data:image/jpeg;base64,..."
 *     },
 *     {
 *       "id": "9c56995c-f332-4a2e-bc8c-f7638b260573",
 *       "name": "Translator Editor", 
 *       "description": "Computer-Assisted Translation (CAT) tool for Tibetan texts",
 *       "category": "",
 *       "price": null,
 *       "link": "https://translations.pecha.tools",
 *       "demo": "",
 *       "icon": "data:image/png;base64,..."
 *     }
 *   ],
 *   "count": 4
 * }
 */
router.get("/tools", async (req, res) => {
  try {
    const toolsData = await getToolsList();
    res.json(toolsData);
  } catch (error) {
    console.error("Error fetching tools list:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tools list",
      message: error.message
    });
  }
});

module.exports = router;
