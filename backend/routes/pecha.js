const express = require("express");
const { getPechaList, getPechaLanguages } = require("../apis/openpecha_api");
const router = express.Router();

router.post("/", async (req, res) => {
  const { filterBy } = req.body;
  if (!filterBy) {
    return res.status(400).json({ error: "Filter by is required" });
  }
  const pechaList = await getPechaList(filterBy);
  res.json(pechaList);
});

router.get("/languages", async (req, res) => {
 
  const language_list = await getPechaLanguages();
  res.json(language_list);
});

module.exports = router;
