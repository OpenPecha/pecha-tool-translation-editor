const express = require("express");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();

/**
 * @typedef {object} TranslationRequest
 * @property {array<string>} texts.required - Array of texts to translate
 * @property {string} target_language.required - Target language for translation - enum:english,french,tibetan,portuguese,chinese
 * @property {string} text_type - Type of text being translated - enum:mantra,sutra,commentary,philosophical treatises
 * @property {string} model_name - AI model to use for translation - enum:claude,claude-haiku,claude-opus,gemini-pro
 * @property {number} batch_size - Number of texts to process in each batch (1-10)
 * @property {string} user_rules - Additional instructions for translation
 */

/**
 * POST /translate
 * @summary Stream real-time translation using external translation API
 * @tags Translation - Translation services
 * @security BearerAuth
 * @param {TranslationRequest} request.body.required - Translation request parameters
 * @return {object} 200 - Streaming translation response with real-time translated chunks
 * @return {object} 400 - Bad request - Invalid parameters or missing required fields
 * @return {object} 401 - Unauthorized - Authentication required
 * @return {object} 403 - Forbidden - Access denied to translation services
 * @return {object} 500 - Server error - Translation service unavailable or internal error
 * @example request - Example translation request
 * {
 *   "texts": [
 *     "ཁོང་གིས་ཨོ་གླིང་ནང་གནས་སྡོད་བྱེད་མཁན་གྱི་བོད་རིགས་མང་ཆེ་ཤོས་ཤིག་སིཌ་ཎེའི་བྱང་ཕྱོགས་མཚོ་འགྲམ་གྱི་མེག་ཀེ་ལར་ནང་གནས་སྡོད་བྱེད་ཀྱི་ཡོད་པ་ནི་ང་ཚོ་སྤོབས་པ་སྐྱེས་འོས་པ་ཞིག་ཡིན། ང་ཚོ་སྤྱི་ཚོགས་འདི་འདྲ་ཡག་པོ་ཞིག་དང་ལྷན་དུ་མཉམ་གནས་བྱེད་རྒྱུ་བྱུང་བ་ནི་ཧ་ཅང་སྐལ་བ་བཟང་པོ་ཡིན། ༸གོང་ས་རྒྱལ་བ་རིན་པོ་ཆེ་མཆོག་དགུང་གྲངས་ ༩༠ ཕེབས་པའི་༸སྐུའི་འཁྲུངས་སྐར་ནི་དགའ་ཚོར་སྐྱེས་འོས་པའི་དུས་ཚིགས་ཁྱད་པར་ཅན་ཞིག་ཡིན་ལ།  དུས་ཚིགས་འདི་ནི་ལྷག་པར་དུ་འཛམ་གླིང་སྤྱི་དང་བཙན་བྱོལ་དུ་གནས་པའི་བོད་མི་རྣམས་ལ་ཆོས་ཕྱོགས་ཀྱི་ཐོག་ནས་གལ་ཆེན་ཆགས་ཡོད། དམིགས་བསལ་གྱིས་༸གོང་ས་རྒྱལ་བ་རིན་པོ་ཆེ་མཆོག་ནས་དགའ་ལྡན་ཕོ་བྲང་དང་སྐུའི་ཡང་སྲིད་རྒྱུན་མཐུད་ཕེབས་ངེས་པའི་གསལ་བསྒྲགས་བསྐྱངས་ཡོད་པར་བརྟེན། "
 *   ],
 *   "target_language": "english",
 *   "text_type": "commentary",
 *   "model_name": "claude",
 *   "batch_size": 2,
 *   "user_rules": "do translation normally"
 * }
 * @example response - Example streaming response chunks
 * "He found that the majority of Tibetans living in Australia"
 * " live in Meckler on the north coast of Sydney, which is something we can be proud of."
 * " We are very fortunate to be able to coexist with such a good society."
 * " His Holiness the Dalai Lama's 90th birthday is a special occasion that should bring joy."
 * " This occasion is particularly significant from a religious perspective for Tibetans around the world and in exile."
 * " In particular, His Holiness the Dalai Lama has made a declaration regarding the continuation of the Ganden Phodrang and his reincarnation."
 */
// Streaming translation endpoint
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      texts,
      target_language,
      text_type = "mantra",
      model_name = "claude-3-5-sonnet-20241022",
      batch_size = 2,
      user_rules = "do translation normally",
    } = req.body;

    // Validate required fields
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res
        .status(400)
        .json({ error: "texts array is required and cannot be empty" });
    }

    if (!target_language) {
      return res.status(400).json({ error: "target_language is required" });
    }

    // Prepare the request payload for the external API
    const requestPayload = {
      texts,
      target_language,
      text_type,
      model_name,
      batch_size,
      user_rules,
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
      total_texts: texts.length,
      timestamp: new Date().toISOString(),
      message: `Starting translation of ${texts.length} texts...`,
    });

    // Calculate estimated batches
    const totalBatches = Math.ceil(texts.length / batch_size);
    sendEvent({
      type: "planning",
      total_batches: totalBatches,
      batch_size: batch_size,
      timestamp: new Date().toISOString(),
      message: `Created ${totalBatches} batches`,
    });

    // Make the streaming request to the external API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(
        process.env.TRANSLATE_API_URL + "/translate/stream",
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
          "External API error:",
          response.status,
          response.statusText
        );
        const errorText = await response.text();

        sendEvent({
          type: "error",
          error: `External translation API error: ${response.statusText}`,
          details: errorText,
          timestamp: new Date().toISOString(),
        });

        return res.end();
      }

      // Check if the response is actually streaming
      if (!response.body) {
        sendEvent({
          type: "error",
          error: "No response body received from translation API",
          timestamp: new Date().toISOString(),
        });

        return res.end();
      }

      // Handle the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let completedTexts = 0;
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
                  console.info("External API initialized");
                } else if (data.type === "planning") {
                  // External API planning - we already sent ours
                  console.info("External API planned batches");
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
                } else if (data.type === "translation_start") {
                  sendEvent({
                    type: "translation_start",
                    timestamp: new Date().toISOString(),
                    message: "Translating...",
                  });
                } else if (data.type === "text_completed") {
                  completedTexts++;
                  const progressPercent = (completedTexts / texts.length) * 100;

                  sendEvent({
                    type: "text_completed",
                    text_number: completedTexts,
                    total_texts: texts.length,
                    progress_percent: progressPercent,
                    translation_preview: data.translation_preview,
                    timestamp: new Date().toISOString(),
                    message: `Completed ${completedTexts}/${texts.length} texts`,
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
                      data.successful_translations || completedTexts,
                    total_texts: data.total_texts || texts.length,
                    timestamp: new Date().toISOString(),
                    message: "Translation completed!",
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
                    console.info("External API initialized");
                  } else if (data.type === "planning") {
                    // External API planning - we already sent ours
                    console.info("External API planned batches");
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
                  } else if (data.type === "translation_start") {
                    sendEvent({
                      type: "translation_start",
                      timestamp: new Date().toISOString(),
                      message: data.message || "Starting translation...",
                    });
                  } else if (data.type === "batch_completed") {
                    currentBatch++;
                    completedTexts += data.batch_results?.length || 0;

                    sendEvent({
                      type: "batch_completed",
                      batch_number: data.batch_number || currentBatch - 1,
                      batch_id: data.batch_id,
                      batch_results: data.batch_results || [],
                      cumulative_progress: Math.round(
                        (completedTexts / texts.length) * 100
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
                      total_completed: data.total_completed || completedTexts,
                      total_texts: texts.length,
                      processing_time:
                        data.processing_time || "Processing time unknown",
                      timestamp: new Date().toISOString(),
                      message: "Translation completed successfully!",
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
          total_completed: completedTexts,
          total_texts: texts.length,
          timestamp: new Date().toISOString(),
          message: "Translation stream completed!",
        });

        // End the response
        res.end();
      } catch (streamError) {
        console.error("Error reading stream:", streamError);

        sendEvent({
          type: "error",
          error: "Error processing translation stream",
          details: streamError.message,
          timestamp: new Date().toISOString(),
        });

        res.end();
      } finally {
        reader.releaseLock();
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("Error connecting to translation API:", fetchError);

      let errorMessage = "Translation service unavailable";
      let errorDetails = "Unable to connect to the external translation API";

      if (fetchError.name === "AbortError") {
        errorMessage = "Translation API request timed out";
        errorDetails =
          "The external translation service did not respond within 60 seconds";
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
    console.error("Error in streaming translation:", error);

    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/event-stream");
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          error: "Internal server error during translation",
          details: error.message,
          timestamp: new Date().toISOString(),
        })}\n\n`
      );
    }

    res.end();
  }
});

module.exports = router;
