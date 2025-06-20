const express = require("express");
const {
  getPechaList,
  getPechaLanguages,
  getPechaBase,
  getPechaCategories,
} = require("../apis/openpecha_api");
const router = express.Router();

/**
 * POST /pecha
 * @summary Get a list of Pecha documents filtered by criteria
 * @tags Pecha - Pecha document operations
 * @param {object} request.body.required - Filter criteria
 * @param {object} request.body.filterBy.required - Filter parameters
 * @return {array<object>} 200 - List of Pecha documents
 * @return {object} 400 - Bad request - Filter by is required
 * @return {object} 500 - Server error
 */
router.post("/", async (req, res) => {
  const { type } = req.body;
  if (!type) {
    return res.status(400).json({ error: "Filter by is required" });
  }
  const pechaList = await getPechaList(type);
  res.json(pechaList);
});

/**
 * GET /pecha/languages
 * @summary Get a list of available Pecha languages
 * @tags Pecha - Pecha document operations
 * @return {array<string>} 200 - List of available languages
 * @return {object} 500 - Server error
 */
router.get("/languages", async (req, res) => {
  const language_list = await getPechaLanguages();
  res.json(language_list);
});

/**
 * GET /pecha/categories
 * @summary Get a list of available Pecha categories
 * @tags Pecha - Pecha document operations
 * @return {array<string>} 200 - List of available categories
 * @return {object} 500 - Server error
 */
router.get("/categories", async (req, res) => {
  const category_list = await getPechaCategories();
  res.json(category_list);
});

/**
 * GET /pecha/{id}/bases
 * @summary Get a list of Pecha bases
 * @tags Pecha - Pecha document operations
 * @param {string} id.path.required - Pecha ID
 * @return {object} 400 - Bad request - Pecha ID is required
 * @return {object} 500 - Server error
 */
router.get("/:id/bases", async (req, res) => {
  const pechaId = req.params.id;
  try {
    const base = await getPechaBase(pechaId);
    res.json(base);
  } catch (e) {
    res.status(500).json({ error: "Error retrieving pecha base" });
  }
});

module.exports = router;
