const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/authenticate");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

/**
 * @typedef {object} SegmentSearchRequest
 * @property {string} segment.required - The text segment to search for in root texts
 */

/**
 * @typedef {object} MatchedEntry
 * @property {string} root_display_text - Root display text from the entry
 * @property {string} commentary_1 - First commentary content
 * @property {string} commentary_2 - Second commentary content
 * @property {string} commentary_3 - Third commentary content
 * @property {string} sanskrit_text - Sanskrit text content
 */

/**
 * @typedef {object} ResourceMatch
 * @property {string} fileName - Name of the matched file (without .json extension)
 * @property {object} metadata - Metadata for the matched file from metadata.json
 * @property {MatchedEntry} matchedEntry - The matched entry content
 */

/**
 * @typedef {object} SegmentSearchResponse
 * @property {boolean} success - Indicates if search was successful
 * @property {string} segment - The segment that was searched for
 * @property {array<ResourceMatch>} matches - List of matching files and entries
 * @property {number} totalMatches - Total number of matches found
 */

/**
 * @typedef {object} ErrorResponse
 * @property {string} error - Error message
 */

/**
 * POST /resources
 * @summary Search for a segment in linked resources
 * @tags Resources
 * @security BearerAuth
 * @param {SegmentSearchRequest} request.body.required - Segment search request
 * @return {SegmentSearchResponse} 200 - Success response
 * @return {ErrorResponse} 400 - Missing segment in body
 * @return {ErrorResponse} 500 - Internal server error
 */
router.post("/", async (req, res) => {
  try {
    const { segment } = req.body;

    if (!segment) {
      return res.status(400).json({ error: "Segment is required" });
    }

    // Path to linked resources directory
    const linkedResourcesPath = path.join(__dirname, "../linked_resources");

    // Load metadata.json
    const metadataPath = path.join(linkedResourcesPath, "metadata.json");
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

    // Get all JSON files except metadata.json
    const files = fs
      .readdirSync(linkedResourcesPath)
      .filter((file) => file.endsWith(".json") && file !== "metadata.json");

    const matchingFiles = [];

    // Search through each file
    for (const fileName of files) {
      const filePath = path.join(linkedResourcesPath, fileName);
      const fileContent = JSON.parse(fs.readFileSync(filePath, "utf8"));

      // Search for segment in root_display_text of each entry
      for (const entry of fileContent) {
        if (
          entry.root_display_text &&
          entry.root_display_text.includes(segment)
        ) {
          // Extract base name without extension for metadata lookup
          const baseName = path.basename(fileName, ".json");

          // Get metadata for this file
          const fileMetadata = metadata[baseName];

          if (fileMetadata) {
            matchingFiles.push({
              fileName: baseName,
              metadata: fileMetadata,
              matchedEntry: {
                root_display_text: entry.root_display_text,
                commentary_1: entry.commentary_1 || "",
                commentary_2: entry.commentary_2 || "",
                commentary_3: entry.commentary_3 || "",
                sanskrit_text: entry.sanskrit_text || "",
              },
            });
          }
          break; // Only need first match per file
        }
      }
    }

    res.json({
      success: true,
      segment: segment,
      matches: matchingFiles,
      totalMatches: matchingFiles.length,
    });
  } catch (error) {
    console.error("Error searching segment:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
