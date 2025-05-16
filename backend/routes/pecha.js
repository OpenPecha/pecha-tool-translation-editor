const express = require("express");
const { getPechaList, getPechaLanguages } = require("../apis/openpecha_api");
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
  const { filterBy } = req.body;
  if (!filterBy) {
    return res.status(400).json({ error: "Filter by is required" });
  }
  const pechaList = await getPechaList(filterBy);
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

module.exports = router;
