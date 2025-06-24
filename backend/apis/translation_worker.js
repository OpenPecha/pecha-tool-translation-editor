const translation_endpoint = process.env.TRANSLATION_WORKER_ENDPOINT;

console.log(`Translation worker endpoint: ${translation_endpoint}`);

// Check if the endpoint is properly configured
if (!translation_endpoint || translation_endpoint.trim() === "") {
  console.error("Translation worker endpoint is not configured in .env file");
}

/**
 * Checks if the translation worker is healthy
 * @returns {Promise<boolean>} True if the worker is healthy, false otherwise
 */
async function isTranslationWorkerHealthy() {
  try {
    const response = await fetch(`${translation_endpoint}/`, {
      method: "GET",
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error) {
    console.error("Translation worker health check failed:", error);
    return false;
  }
}

/**
 * Sends a translation request to the translation worker
 * @param {Object} data - Translation request data
 * @param {string} data.api_key - API key for the translation service
 * @param {string} data.content - Content to be translated
 * @param {Object} data.metadata - Metadata for the translation
 * @param {string} data.metadata.domain - Domain of the content
 * @param {string} data.metadata.source_language - Source language code
 * @param {string} data.metadata.target_language - Target language code
 * @param {string} data.model_name - Model to use for translation
 * @param {number} data.priority - Priority of the translation request (1-10)
 * @param {string} data.use_segmentation - Whether to use segmentation for translation
 * @returns {Promise<Object>} Translation job response
 */
async function sendTranslationRequest(data) {
  try {
    // Validate required fields
    if (!data.api_key) throw new Error("API key is required");
    if (!data.content) throw new Error("Content is required");
    if (!data.metadata?.source_language)
      throw new Error("Source language is required");
    if (!data.metadata?.target_language)
      throw new Error("Target language is required");
    if (!data.model_name) throw new Error("Model name is required");
    if (!data.priority || data.priority < 1 || data.priority > 10)
      throw new Error("Valid priority (1-10) is required");
    if (!data.webhook) throw new Error("Webhook URL is required");

    const response = await fetch(`${translation_endpoint}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      timeout: 10000,
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);

    // Check if the response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Received non-JSON response:", text.substring(0, 500));
      throw new Error(
        `Translation API returned non-JSON response: ${response.status} ${response.statusText}`
      );
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Translation request failed: ${
          errorData.message || response.statusText
        } ${JSON.stringify(errorData)}`
      );
    }

    const jsonResponse = await response.json();
    console.log("Translation job created successfully:", jsonResponse);
    return jsonResponse;
  } catch (error) {
    console.error("Translation request failed:", error);
    throw error;
  }
}

/**
 * Gets the status of a translation job
 * @param {string} messageId - ID of the translation job
 * @returns {Promise<Object>} Translation job status
 */
async function getTranslationStatus(messageId) {
  try {
    if (!messageId) throw new Error("Message ID is required");

    const response = await fetch(
      `${translation_endpoint}/messages/${messageId}`,
      {
        method: "GET",
        timeout: 10000,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to get translation status: ${
          errorData.message || response.statusText
        }`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Translation status check failed:", error);
    throw error;
  }
}

/**
 * Gets the status of a translation job
 * @param {string} messageId - ID of the translation job
 * @returns {Promise<Object>} Translation job status
 */
async function getHealthWorker() {
  try {
    const response = await fetch(`${translation_endpoint}`, {
      method: "GET",
      timeout: 10000,
    });

    if (response.status === 502 || !response.ok) {
      return false;
    }
    return true;
  } catch (error) {
    console.error("Translation status check failed:", error);
    return false;
  }
}

module.exports = {
  isTranslationWorkerHealthy,
  sendTranslationRequest,
  getTranslationStatus,
  getHealthWorker,
};
