const express = require("express");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();

/**
 * @typedef {object} GlossaryItem
 * @property {string} original_text.required - Original text content
 * @property {string} translated_text.required - Translated text content
 * @property {object} metadata - Additional metadata for the text pair
 */

/**
 * @typedef {object} GlossaryExtractionRequest
 * @property {array<GlossaryItem>} items.required - Array of text pairs for glossary extraction
 * @property {string} model_name - AI model to use for extraction - enum:claude,claude-haiku,claude-opus,gemini-pro
 * @property {number} batch_size - Number of items to process in each batch (1-10)
 */

/**
 * POST /glossary/extract/stream
 * @summary Stream real-time glossary extraction using external API
 * @tags Glossary - Glossary extraction services
 * @security BearerAuth
 * @param {GlossaryExtractionRequest} request.body.required - Glossary extraction request parameters
 * @return {object} 200 - Streaming glossary extraction response with real-time results
 * @return {object} 400 - Bad request - Invalid parameters or missing required fields
 * @return {object} 401 - Unauthorized - Authentication required
 * @return {object} 403 - Forbidden - Access denied to glossary services
 * @return {object} 500 - Server error - Glossary service unavailable or internal error
 * @example request - Example glossary extraction request
 * {
 *   "items": [
 *     {
 *       "original_text": "བདེ་བར་གཤེགས་པ་དང་བྱང་ཆུབ་སེམས་དཔའ་རྣམས་ལ་ཕྱག་འཚལ་ལོ།",
 *       "translated_text": "Homage to the Tathagatas and Bodhisattvas.",
 *       "metadata": {
 *         "context": "opening salutation",
 *         "text_type": "sutra"
 *       }
 *     },
 *     {
 *       "original_text": "དེ་ནས་བཅོམ་ལྡན་འདས་ཀྱིས་བྱང་ཆུབ་སེམས་དཔའ་སེམས་དཔའ་ཆེན་པོ་འཇམ་དཔལ་གཞོན་ནུར་གྱུར་པ་ལ་འདི་སྐད་ཅེས་བཀའ་སྩལ་ཏོ།",
 *       "translated_text": "Then the Bhagavan spoke these words to the bodhisattva mahāsattva Mañjuśrī Kumārabhūta:",
 *       "metadata": {
 *         "context": "dialogue introduction",
 *         "speaker": "Buddha"
 *       }
 *     }
 *   ],
 *   "model_name": "claude",
 *   "batch_size": 5
 * }
 * @example response - Example streaming response chunks
 * {"type":"initialization","total_items":2,"timestamp":"2024-01-01T00:00:00.000Z","message":"Starting glossary extraction of 2 items..."}
 * {"type":"extraction_start","timestamp":"2024-01-01T00:00:01.000Z","message":"Extracting glossary terms..."}
 * {"type":"item_completed","item_number":1,"total_items":2,"progress_percent":50,"glossary_preview":"བདེ་བར་གཤེགས་པ་ - Tathagata","timestamp":"2024-01-01T00:00:02.000Z"}
 */
// Streaming glossary extraction endpoint
router.post("/extract/stream", authenticate, async (req, res) => {
  try {
    const { items, model_name = "claude", batch_size = 5 } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "items array is required and cannot be empty" });
    }

    // Validate items structure
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.original_text || !item.translated_text) {
        return res.status(400).json({
          error: `Item at index ${i} is missing required fields: original_text and translated_text are required`,
        });
      }
    }

    // Prepare the request payload for the external API
    const requestPayload = {
      items,
      model_name,
      batch_size,
    };

    // Set response headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

    // Helper function to send structured events
    const sendEvent = (eventData) => {
      const data = JSON.stringify(eventData);
      res.write(`data: ${data}\n\n`);
    };

    // Send initialization event
    sendEvent({
      type: "initialization",
      total_items: items.length,
      timestamp: new Date().toISOString(),
      message: `Starting glossary extraction of ${items.length} items...`,
    });

    // Calculate estimated batches
    const totalBatches = Math.ceil(items.length / batch_size);
    sendEvent({
      type: "planning",
      total_batches: totalBatches,
      batch_size: batch_size,
      timestamp: new Date().toISOString(),
      message: `Created ${totalBatches} batches`,
    });

    // Make the streaming request to the external API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for glossary extraction

    try {
      const response = await fetch(
        process.env.TRANSLATE_API_URL + "/glossary/extract/stream",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(
          "External Glossary API error:",
          response.status,
          response.statusText
        );
        const errorText = await response.text();

        sendEvent({
          type: "error",
          error: `External glossary API error: ${response.statusText}`,
          details: errorText,
          timestamp: new Date().toISOString(),
        });

        return res.end();
      }

      // Check if the response is actually streaming
      if (!response.body) {
        sendEvent({
          type: "error",
          error: "No response body received from glossary API",
          timestamp: new Date().toISOString(),
        });

        return res.end();
      }

      // Handle the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let completedItems = 0;
      let currentBatch = 1;
      const batchResults = [];

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode the chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete lines in buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;

            // Extract event data from SSE format
            let eventData = "";
            if (line.trim().startsWith("data: ")) {
              eventData = line.trim().substring(6).trim();
            } else if (line.trim().startsWith("data:")) {
              eventData = line.trim().substring(5).trim();
            }

            if (!eventData) continue;

            // Handle multiple JSON objects or fragments in eventData
            if (eventData.startsWith("{") && eventData.endsWith("}")) {
              try {
                // Single complete JSON object
                const data = JSON.parse(eventData);

                // Transform external API events to our structured format
                if (data.type === "initialization") {
                  // External API initialization - we already sent ours
                  console.log("External Glossary API initialized");
                } else if (data.type === "planning") {
                  // External API planning - we already sent ours
                  console.log("External Glossary API planned batches");
                } else if (data.type === "batch_start") {
                  sendEvent({
                    type: "batch_start",
                    batch_number: data.batch_number || currentBatch,
                    progress_percent:
                      data.progress_percent ||
                      ((currentBatch - 1) / totalBatches) * 100,
                    timestamp: new Date().toISOString(),
                    message: `Processing batch ${
                      data.batch_number || currentBatch
                    }...`,
                  });
                } else if (data.type === "extraction_start") {
                  sendEvent({
                    type: "extraction_start",
                    timestamp: new Date().toISOString(),
                    message: "Extracting glossary terms...",
                  });
                } else if (data.type === "item_completed") {
                  completedItems++;
                  const progressPercent = (completedItems / items.length) * 100;

                  sendEvent({
                    type: "item_completed",
                    item_number: completedItems,
                    total_items: items.length,
                    progress_percent: progressPercent,
                    glossary_preview: data.glossary_preview,
                    timestamp: new Date().toISOString(),
                    message: `Completed ${completedItems}/${items.length} items`,
                  });
                } else if (data.type === "batch_completed") {
                  const cumulativeProgress =
                    (data.batch_number / totalBatches) * 100;

                  sendEvent({
                    type: "batch_completed",
                    batch_number: data.batch_number || currentBatch,
                    batch_id: data.batch_id || `batch_${currentBatch}`,
                    batch_results: data.batch_results || [],
                    cumulative_progress: cumulativeProgress,
                    processing_time: data.processing_time || "0.0",
                    timestamp: new Date().toISOString(),
                    message: `Batch ${
                      data.batch_number || currentBatch
                    } completed in ${data.processing_time || "0.0"}s`,
                  });

                  currentBatch = (data.batch_number || currentBatch) + 1;
                } else if (data.type === "completion") {
                  sendEvent({
                    type: "completion",
                    total_completed:
                      data.successful_extractions || completedItems,
                    total_items: data.total_items || items.length,
                    glossary_terms: data.glossary_terms || [],
                    timestamp: new Date().toISOString(),
                    message: "Glossary extraction completed!",
                  });
                } else if (data.type === "error") {
                  sendEvent({
                    type: "error",
                    error: data.error,
                    details: data.details,
                    timestamp: new Date().toISOString(),
                  });
                } else {
                  // Forward any other structured data as-is
                  sendEvent({
                    ...data,
                    timestamp: data.timestamp || new Date().toISOString(),
                  });
                }
              } catch (parseError) {
                console.error(
                  "Error parsing complete JSON event:",
                  parseError,
                  "Raw eventData:",
                  eventData
                );
              }
            } else {
              // Handle partial or malformed JSON using a more robust approach
              try {
                // Try to fix common SSE formatting issues
                let cleanedData = eventData;

                // Remove duplicate "data: " prefixes that sometimes occur
                if (cleanedData.includes("data: ")) {
                  cleanedData = cleanedData.replace(/data:\s*/g, "");
                }

                // Try to parse after cleaning
                if (cleanedData.startsWith("{")) {
                  const data = JSON.parse(cleanedData);

                  // Transform external API events to our structured format
                  if (data.type === "initialization") {
                    // External API initialization - we already sent ours
                    console.log("External Glossary API initialized");
                  } else if (data.type === "planning") {
                    // External API planning - we already sent ours
                    console.log("External Glossary API planned batches");
                  } else if (data.type === "batch_start") {
                    sendEvent({
                      type: "batch_start",
                      batch_number: data.batch_number || currentBatch,
                      progress_percent:
                        data.progress_percent ||
                        ((currentBatch - 1) / totalBatches) * 100,
                      timestamp: new Date().toISOString(),
                      message: `Processing batch ${
                        data.batch_number || currentBatch
                      }...`,
                    });
                  } else if (data.type === "extraction_start") {
                    sendEvent({
                      type: "extraction_start",
                      timestamp: new Date().toISOString(),
                      message: "Extracting glossary terms...",
                    });
                  } else if (data.type === "item_completed") {
                    completedItems++;
                    const progressPercent =
                      (completedItems / items.length) * 100;

                    sendEvent({
                      type: "item_completed",
                      item_number: completedItems,
                      total_items: items.length,
                      progress_percent: Math.round(progressPercent),
                      glossary_preview:
                        data.glossary_preview || "Glossary preview unavailable",
                      timestamp: new Date().toISOString(),
                      message: `Completed ${completedItems}/${items.length} items`,
                    });
                  } else if (data.type === "batch_completed") {
                    currentBatch++;

                    sendEvent({
                      type: "batch_completed",
                      batch_number: data.batch_number || currentBatch - 1,
                      batch_id: data.batch_id,
                      extracted_glossary: data.extracted_glossary || [],
                      cumulative_progress: Math.round(
                        (completedItems / items.length) * 100
                      ),
                      processing_time:
                        data.processing_time || "Processing time unknown",
                      timestamp: new Date().toISOString(),
                      message: `Batch ${
                        data.batch_number || currentBatch - 1
                      } completed`,
                    });
                  } else if (data.type === "completion") {
                    sendEvent({
                      type: "completion",
                      total_completed: data.total_completed || completedItems,
                      total_items: items.length,
                      complete_glossary: data.complete_glossary || [],
                      processing_time:
                        data.processing_time || "Processing time unknown",
                      timestamp: new Date().toISOString(),
                      message: "Glossary extraction completed successfully!",
                    });
                  } else if (data.type === "error") {
                    sendEvent({
                      type: "error",
                      error: data.error,
                      details: data.details,
                      timestamp: new Date().toISOString(),
                    });
                  } else {
                    // Forward any other structured data as-is
                    sendEvent({
                      ...data,
                      timestamp: data.timestamp || new Date().toISOString(),
                    });
                  }
                } else {
                  console.warn("Skipping non-JSON event data:", eventData);
                }
              } catch (parseError) {
                console.error(
                  "Error parsing SSE event:",
                  parseError,
                  "Raw line:",
                  line,
                  "Extracted eventData:",
                  eventData
                );
                // Continue processing other lines
              }
            }
          }
        }

        // Send final completion if not already sent
        sendEvent({
          type: "completion",
          total_completed: completedItems,
          total_items: items.length,
          timestamp: new Date().toISOString(),
          message: "Glossary extraction stream completed!",
        });

        // End the response
        res.end();
      } catch (streamError) {
        console.error("Error reading glossary stream:", streamError);

        sendEvent({
          type: "error",
          error: "Error processing glossary extraction stream",
          details: streamError.message,
          timestamp: new Date().toISOString(),
        });

        res.end();
      } finally {
        reader.releaseLock();
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("Error connecting to glossary API:", fetchError);

      let errorMessage = "Glossary service unavailable";
      let errorDetails = "Unable to connect to the external glossary API";

      if (fetchError.name === "AbortError") {
        errorMessage = "Glossary API request timed out";
        errorDetails =
          "The external glossary service did not respond within 120 seconds";
      }

      sendEvent({
        type: "error",
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      });

      res.end();
    }
  } catch (error) {
    console.error("Error in streaming glossary extraction:", error);

    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/event-stream");
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          error: "Internal server error during glossary extraction",
          details: error.message,
          timestamp: new Date().toISOString(),
        })}\n\n`
      );
    }

    res.end();
  }
});

module.exports = router;
