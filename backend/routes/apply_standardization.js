const express = require("express");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();

/**
 * @typedef {object} GlossaryTerm
 * @property {string} source_term.required - Source term in original language
 * @property {string} translated_term.required - Translated term
 */

/**
 * @typedef {object} StandardizationItem
 * @property {string} original_text.required - Original text content
 * @property {string} translated_text.required - Translated text content
 * @property {array<GlossaryTerm>} glossary.required - Array of glossary terms for this text pair
 */

/**
 * @typedef {object} StandardizationPair
 * @property {string} source_word.required - Source word that needs standardization
 * @property {string} standardized_translation.required - The standardized translation to use
 */

/**
 * @typedef {object} ApplyStandardizationRequest
 * @property {array<StandardizationItem>} items.required - Array of text pairs with glossaries for re-translation
 * @property {array<StandardizationPair>} standardization_pairs.required - Standardization rules to apply
 * @property {string} model_name.required - AI model to use for re-translation
 * @property {string} user_rules - Additional user rules for re-translation
 */

/**
 * POST /standardize/apply/stream
 * @summary Apply standardization corrections and re-translate content via streaming
 * @tags Standardization - Apply standardization corrections
 * @security BearerAuth
 * @param {ApplyStandardizationRequest} request.body.required - Standardization application request parameters
 * @return {object} 200 - Streaming response with re-translation progress and results
 * @return {object} 400 - Bad request - Invalid parameters or missing required fields
 * @return {object} 401 - Unauthorized - Authentication required
 * @return {object} 403 - Forbidden - Access denied to standardization services
 * @return {object} 500 - Server error - Standardization service unavailable or internal error
 * @example request - Example standardization application request
 * {
 *   "items": [
 *     {
 *       "original_text": "བྱང་ཆུབ་སེམས་དང་སེམས་དཔའ་རྣམས་ལ་ཕྱག་འཚལ་ལོ།",
 *       "translated_text": "Homage to the mind of enlightenment and the bodhisattvas.",
 *       "glossary": [
 *         {
 *           "source_term": "བྱང་ཆུབ་སེམས",
 *           "translated_term": "mind of enlightenment"
 *         },
 *         {
 *           "source_term": "སེམས་དཔའ",
 *           "translated_term": "bodhisattva"
 *         }
 *       ]
 *     }
 *   ],
 *   "standardization_pairs": [
 *     {
 *       "source_word": "བྱང་ཆུབ་སེམས",
 *       "standardized_translation": "bodhicitta"
 *     }
 *   ],
 *   "model_name": "claude",
 *   "user_rules": "Apply standardization consistently and maintain natural flow"
 * }
 * @example response - Example streaming response events
 * data: {"timestamp":"2025-01-10T10:30:00.000Z","type":"initialization","total_items":1,"message":"Starting standardization application..."}
 *
 * data: {"timestamp":"2025-01-10T10:30:01.000Z","type":"retranslation_start","index":0,"message":"Re-translating item 1 of 1..."}
 *
 * data: {"timestamp":"2025-01-10T10:30:05.000Z","type":"retranslation_completed","status":"item_updated","index":0,"updated_item":{"original_text":"...","translated_text":"Homage to bodhicitta and the bodhisattvas.","glossary":[...]}}
 *
 * data: {"timestamp":"2025-01-10T10:30:06.000Z","type":"completion","total_completed":1,"message":"Standardization application completed!"}
 */
router.post("/apply/stream", authenticate, async (req, res) => {
  try {
    const { items, standardization_pairs, model_name, user_rules } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "items array is required and cannot be empty" });
    }

    if (
      !standardization_pairs ||
      !Array.isArray(standardization_pairs) ||
      standardization_pairs.length === 0
    ) {
      return res.status(400).json({
        error: "standardization_pairs array is required and cannot be empty",
      });
    }

    if (!model_name || typeof model_name !== "string") {
      return res
        .status(400)
        .json({ error: "model_name is required and must be a string" });
    }

    // Validate items structure
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.original_text || !item.translated_text || !item.glossary) {
        return res.status(400).json({
          error: `Item at index ${i} is missing required fields: original_text, translated_text, and glossary are required`,
        });
      }

      if (!Array.isArray(item.glossary)) {
        return res.status(400).json({
          error: `Item at index ${i} has invalid glossary field: must be an array`,
        });
      }

      // Validate glossary terms
      for (let j = 0; j < item.glossary.length; j++) {
        const term = item.glossary[j];
        if (!term.source_term || !term.translated_term) {
          return res.status(400).json({
            error: `Item at index ${i}, glossary term at index ${j} is missing required fields: source_term and translated_term are required`,
          });
        }
      }
    }

    // Validate standardization pairs structure
    for (let i = 0; i < standardization_pairs.length; i++) {
      const pair = standardization_pairs[i];
      if (!pair.source_word || !pair.standardized_translation) {
        return res.status(400).json({
          error: `Standardization pair at index ${i} is missing required fields: source_word and standardized_translation are required`,
        });
      }
    }

    // Set up Server-Sent Events
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

    // Helper function to send SSE events
    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initialization event
    sendEvent({
      timestamp: new Date().toISOString(),
      type: "initialization",
      total_items: items.length,
      message: `Starting standardization application for ${items.length} items...`,
    });

    // Prepare the request payload for the external API
    const requestPayload = {
      items,
      standardization_pairs,
      model_name,
      user_rules:
        user_rules ||
        "Apply standardization consistently while maintaining natural translation flow",
    };

    try {
      // Set up timeout for the entire request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      const response = await fetch(
        process.env.TRANSLATE_API_URL + "/standardize/apply/stream",
        {
          method: "POST",
          headers: {
            accept: "text/event-stream",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(
          "External Standardization Apply API error:",
          response.status,
          response.statusText
        );

        sendEvent({
          timestamp: new Date().toISOString(),
          type: "error",
          message: `External standardization API error: ${response.statusText}`,
          status: "failed",
        });

        return res.end();
      }

      if (!response.body) {
        console.error("No response body received from standardization API");

        sendEvent({
          timestamp: new Date().toISOString(),
          type: "error",
          message: "No response received from standardization service",
          status: "failed",
        });

        return res.end();
      }

      // Process the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep the last incomplete line in buffer

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Extract event data from SSE format
            let eventData = "";
            if (trimmedLine.startsWith("data: ")) {
              eventData = trimmedLine.substring(6).trim();
            } else if (trimmedLine.startsWith("data:")) {
              eventData = trimmedLine.substring(5).trim();
            }

            if (!eventData) continue;

            // Handle multiple JSON objects or fragments in eventData
            if (eventData.startsWith("{") && eventData.endsWith("}")) {
              try {
                // Single complete JSON object
                const parsedEvent = JSON.parse(eventData);

                // Transform external API events to our internal format
                let transformedEvent = {
                  timestamp: parsedEvent.timestamp || new Date().toISOString(),
                  type: parsedEvent.type,
                  message: parsedEvent.message,
                };

                // Add specific fields based on event type
                switch (parsedEvent.type) {
                  case "initialization":
                    transformedEvent.total_items = parsedEvent.total_items;
                    break;

                  case "planning":
                    transformedEvent.total_batches = parsedEvent.total_batches;
                    transformedEvent.batch_size = parsedEvent.batch_size;
                    break;

                  case "retranslation_start":
                    transformedEvent.index = parsedEvent.index;
                    transformedEvent.status = "processing";
                    break;

                  case "retranslation_completed":
                    transformedEvent.status = "item_updated";
                    transformedEvent.index = parsedEvent.index;
                    transformedEvent.updated_item = parsedEvent.updated_item;
                    break;

                  case "completion":
                    transformedEvent.total_completed =
                      parsedEvent.total_completed || items.length;
                    transformedEvent.status = "completed";
                    break;

                  case "error":
                    transformedEvent.status = "failed";
                    transformedEvent.error = parsedEvent.error;
                    break;
                }

                // Send the transformed event to the client
                sendEvent(transformedEvent);
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
                  const parsedEvent = JSON.parse(cleanedData);

                  // Transform external API events to our internal format
                  let transformedEvent = {
                    timestamp:
                      parsedEvent.timestamp || new Date().toISOString(),
                    type: parsedEvent.type,
                    message: parsedEvent.message,
                  };

                  // Add specific fields based on event type
                  switch (parsedEvent.type) {
                    case "initialization":
                      transformedEvent.total_items = parsedEvent.total_items;
                      break;

                    case "planning":
                      transformedEvent.total_batches =
                        parsedEvent.total_batches;
                      transformedEvent.batch_size = parsedEvent.batch_size;
                      break;

                    case "retranslation_start":
                      transformedEvent.index = parsedEvent.index;
                      transformedEvent.status = "processing";
                      break;

                    case "retranslation_completed":
                      transformedEvent.status = "item_updated";
                      transformedEvent.index = parsedEvent.index;
                      transformedEvent.updated_item = parsedEvent.updated_item;
                      break;

                    case "completion":
                      transformedEvent.total_completed =
                        parsedEvent.total_completed || items.length;
                      transformedEvent.status = "completed";
                      break;

                    case "error":
                      transformedEvent.status = "failed";
                      transformedEvent.error = parsedEvent.error;
                      break;
                  }

                  // Send the transformed event to the client
                  sendEvent(transformedEvent);
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
      } finally {
        reader.releaseLock();
      }

      // Send final completion event if not already sent
      sendEvent({
        timestamp: new Date().toISOString(),
        type: "completion",
        total_completed: items.length,
        message: "Standardization application stream completed!",
        status: "completed",
      });
    } catch (fetchError) {
      console.error(
        "Error connecting to standardization apply API:",
        fetchError
      );

      let errorMessage = "Standardization service unavailable";
      let errorDetails =
        "Unable to connect to the external standardization API";

      if (fetchError.name === "AbortError") {
        errorMessage = "Standardization API request timed out";
        errorDetails =
          "The external standardization service did not respond in time";
      }

      sendEvent({
        timestamp: new Date().toISOString(),
        type: "error",
        message: errorMessage,
        details: errorDetails,
        status: "failed",
      });
    }

    res.end();
  } catch (error) {
    console.error("Error in standardization application:", error);

    // If headers haven't been sent yet, send JSON error
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error during standardization application",
        details: error.message,
      });
    } else {
      // If SSE has started, send error event
      try {
        res.write(
          `data: ${JSON.stringify({
            timestamp: new Date().toISOString(),
            type: "error",
            message: "Internal server error during standardization application",
            details: error.message,
            status: "failed",
          })}\n\n`
        );
      } catch (writeError) {
        console.error("Error writing error event:", writeError);
      }
      res.end();
    }
  }
});

module.exports = router;
