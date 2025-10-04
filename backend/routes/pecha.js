const express = require("express");
const {
  getExpressions,
  getText,
  getExpressionTexts
} = require("../apis/openpecha_api");
const router = express.Router();

// In-memory cache for templates
const templatesCache = {
  data: null,
  timestamp: null,
  ttl: 60 * 60 * 1000, // 1 hour in milliseconds
};

// Cache helper functions
const isCacheValid = () => {
  if (!templatesCache.data || !templatesCache.timestamp) {
    return false;
  }
  const now = Date.now();
  return (now - templatesCache.timestamp) < templatesCache.ttl;
};

const getCachedTemplates = () => {
  return isCacheValid() ? templatesCache.data : null;
};

const setCachedTemplates = (data) => {
  templatesCache.data = data;
  templatesCache.timestamp = Date.now();
};

/**
 * GET /pecha/list
 * @summary Get a list of metadata filtered by type (root, commentary, translations)
 * @tags Pecha - Pecha document operations
 * @param {string} - Filter type: root, commentary, or translations
 * @return {array<object>} 200 - List of metadata filtered by type
 * @return {object} 400 - Bad request - Type parameter is required
 * @return {object} 500 - Server error - Failed to fetch metadata
 * @example response - Example response for type=root
 * [
 *   {
 *     "id": "root_001",
 *     "title": "Prajnaparamita Hridaya Sutra",
 *     "type": "root",
 *     "language": "sanskrit",
 *     "metadata": {
 *       "author": "Buddha",
 *       "category": "sutra",
 *       "period": "classical"
 *     }
 *   },
 *   {
 *     "id": "root_002",
 *     "title": "Vajracchedika Prajnaparamita Sutra",
 *     "type": "root",
 *     "language": "sanskrit",
 *     "metadata": {
 *       "author": "Buddha",
 *       "category": "sutra",
 *       "period": "classical"
 *     }
 *   }
 * ]
 */
router.get("/list", async (req, res) => {
  const { type } = req.query;

 

  // Validate type parameter
  const allowedTypes = ["root", "commentary", "translations"];
  if (type && !allowedTypes.includes(type)) {
    return res.status(400).json({
      error: "Invalid type parameter",
      allowedTypes: allowedTypes,
      provided: type,
    });
  }

  try {
    let metadata;

    // Use getRootExpressions for root type
    metadata = await getExpressions(type);
    let return_data = metadata.map((l) => {
      return {
        alt_title: l?.alt_titles,
        id: l?.id,
        title: l?.title,
        language: l?.language,
      };
    });

    res.json(return_data);
  } catch (error) {
    console.error("Error fetching metadata:", error);
    res.status(500).json({
      error: "Failed to fetch metadata",
      type: type,
      details: error.message,
    });
  }
});

/**
 * GET /pecha/{id}/texts
 * @summary Get manifestations for a specific expression ID
 * @tags Pecha - Pecha document operations
 * @param {string} id.path.required - Expression ID
 * @return {array<object>} 200 - List of manifestations for the expression
 * @return {object} 400 - Bad request - Expression ID is required
 * @return {object} 404 - Not found - Expression not found
 * @return {object} 500 - Server error - Failed to fetch manifestations
 * @example response - Example response
 * [
 *   {
 *     "id": "manifest_001",
 *     "expression_id": "expr_001",
 *     "type": "original",
 *     "language": "tibetan",
 *     "title": "Heart Sutra - Original Tibetan",
 *     "metadata": {
 *       "format": "traditional",
 *       "source": "derge_kangyur",
 *       "volume": 34,
 *       "folio": "144b-146a"
 *     }
 *   },
 *   {
 *     "id": "manifest_002",
 *     "expression_id": "expr_001",
 *     "type": "translation",
 *     "language": "english",
 *     "title": "Heart Sutra - English Translation",
 *     "metadata": {
 *       "translator": "Edward Conze",
 *       "year": 1958,
 *       "publisher": "Buddhist Society"
 *     }
 *   }
 * ]
 */
router.get("/:id/texts", async (req, res) => {

  const expressionId = req.params.id;
  if (!expressionId) {
    return res.status(400).json({
      error: "Expression ID is required",
    });
  }

  try {
    const manifestations = await getExpressionTexts(expressionId);

    if (!manifestations) {
      return res.status(404).json({
        error: "Expression not found",
        expression_id: expressionId,
      });
    }
    let return_data = manifestations.map((l) => {
      return {
        id: l?.id,
        expression_id: l?.expression,
        annotation: l?.annotations,
        type: l?.type,
      };
    });
    res.json(return_data);
  } catch (error) {
    console.error("Error fetching manifestations:", error);

    // Handle specific error cases
    if (error.message.includes("404") || error.message.includes("not found")) {
      return res.status(404).json({
        error: "Expression not found",
        expression_id: expressionId,
        details: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to fetch manifestations",
      expression_id: expressionId,
      details: error.message,
    });
  }
});

/**
 * GET /pecha/text/{id}
 * @summary Get serialized text content using text ID
 * @tags Pecha - Pecha document operations
 * @param {string} id.path.required - Text expression ID
 * @return {object} 200 - Serialized text content ready for translation
 * @return {object} 400 - Bad request - Text ID is required
 * @return {object} 404 - Not found - Text not found
 * @return {object} 500 - Server error - Failed to fetch text
 * @example response - Example response
 * {
 *   "id": "text_001",
 *   "content": "བཅོམ་ལྡན་འདས་མ་ཤེས་རབ་ཀྱི་ཕ་རོལ་ཏུ་ཕྱིན་པའི་སྙིང་པོ།",
 *   "metadata": {
 *     "language": "tibetan",
 *     "title": "Heart Sutra",
 *     "manifestation_type": "original"
 *   },
 *   "structure": {
 *     "segments": 42,
 *     "format": "plain_text"
 *   }
 * }
 */
router.get("/text/:id", async (req, res) => {
  const textId = req.params.id;

  if (!textId) {
    return res.status(400).json({
      error: "Text ID is required",
    });
  }

  try {
    const textContent = await getText(textId);

    if (!textContent) {
      return res.status(404).json({
        error: "Text not found",
        id: textId,
      });
    }

    res.json(textContent);
  } catch (error) {
    console.error("Error fetching text:", error);

    // Handle specific error cases
    if (error.message.includes("404") || error.message.includes("not found")) {
      return res.status(404).json({
        error: "Text not found",
        id: textId,
        details: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to fetch text content",
      id: textId,
      details: error.message,
    });
  }
});


/**
 * GET /pecha/templates
 * @summary Get processed template data ready for frontend consumption
 * @tags Pecha - Pecha document operations
 * @param {number} limit.query - Number of templates to return (default: 6)
 * @return {array<object>} 200 - List of processed template data
 * @return {object} 500 - Server error - Failed to fetch templates
 * @example response - Example response
 * [
 *   {
 *     "expression_id": "expr_001",
 *     "manifest_id": "manifest_001",
 *     "title": "Heart Sutra",
 *     "text_content": "བཅོམ་ལྡན་འདས་མ་ཤེས་རབ་ཀྱི་ཕ་རོལ་ཏུ་ཕྱིན་པའི་སྙིང་པོ།"
 *   }
 * ]
 */
router.get("/templates", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    
    // Check cache first
    const cachedTemplates = getCachedTemplates();
    if (cachedTemplates) {
      console.log("Returning cached templates");
      const limitedCachedTemplates = cachedTemplates.slice(0, limit);
      return res.json(limitedCachedTemplates);
    }
    
    console.log("Cache miss - fetching fresh templates");
    
    // Step 1: Fetch expressions (root type)
    const expressions = await getExpressions();
    console.log("expressions", expressions);
    const limitedExpressions = expressions.slice(0, limit);
    
    // Step 2: For each expression, fetch manifestations and text content
    const templateData = await Promise.all(
      limitedExpressions.map(async (expression) => {
        try {
          // Get manifestations for this expression
          const manifestations = await getExpressionTexts(expression.id);
          if (!manifestations || manifestations.length === 0) {
            return null;
          }
          
          // Take the first manifestation
          const manifestation = manifestations[0];
          
          // Get text content for this manifestation
          const textContent = await getText(manifestation.id);
          if (!textContent) {
            return null;
          }
          
          // Extract title from expression
          let title = expression.id; // fallback to expression id
          if (expression.title) {
            if (typeof expression.title === 'string') {
              title = expression.title;
            } else if (expression.title.bo) {
              title = expression.title.bo;
            } else if (expression.title.en) {
              title = expression.title.en;
            } else if (Object.keys(expression.title).length > 0) {
              title = Object.values(expression.title)[0];
            }
          }
          
          // Process text content using segmentation annotation (same logic as frontend)
          let text_content = textContent.base || "";
          
          // Try to get segmented text if available (same logic as OpenPechaTranslationLoader)
          const segmentationKeys = Object.keys(textContent.annotations?.segmentation || {});
          if (segmentationKeys.length > 0) {
            const firstSegmentationId = segmentationKeys[0];
            const selectedSegmentation = textContent.annotations.segmentation[firstSegmentationId];
            
            if (selectedSegmentation && Array.isArray(selectedSegmentation)) {
              try {
                // Process segmented text (same logic as frontend)
                const segments = selectedSegmentation.map((seg, index) => {
                  if (seg.Span && typeof seg.Span.start === 'number' && typeof seg.Span.end === 'number') {
                    const segmentText = textContent.base
                      .substring(seg.Span.start, seg.Span.end)
                      .replace(/\n/g, "");
                    return segmentText;
                  }
                  return null;
                }).filter(Boolean);
                
                if (segments.length > 0) {
                  text_content = segments.join('\n');
                }
              } catch (err) {
                console.error('Error processing segmentation:', err);
                // Fallback to base text if segmentation fails
                text_content = textContent.base || "";
              }
            }
          }
          
          return {
            expression_id: expression.id,
            manifest_id: manifestation.id,
            metadata:{
              type:expression.type,
              language:expression.language,
              alternative_title:expression.alt_titles,
            },
            title: title,
            text_content: text_content,
          };
        } catch (error) {
          console.error(`Error processing expression ${expression.id}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null results
    const validTemplates = templateData.filter(Boolean);
    
    // Cache the results for future requests
    setCachedTemplates(validTemplates);
    console.log(`Cached ${validTemplates.length} templates`);
    
    // Return limited results based on query parameter
    const limitedTemplates = validTemplates.slice(0, limit);
    res.json(limitedTemplates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      error: "Failed to fetch templates",
      details: error.message,
    });
  }
});

/**
 * POST /pecha/templates/cache/clear
 * @summary Clear the templates cache
 * @tags Pecha - Pecha document operations
 * @return {object} 200 - Cache cleared successfully
 * @return {object} 500 - Server error
 */
router.post("/templates/cache/clear", async (req, res) => {
  try {
    templatesCache.data = null;
    templatesCache.timestamp = null;
    console.log("Templates cache cleared");
    res.json({ message: "Templates cache cleared successfully" });
  } catch (error) {
    console.error("Error clearing templates cache:", error);
    res.status(500).json({
      error: "Failed to clear templates cache",
      details: error.message,
    });
  }
});


module.exports = router;
