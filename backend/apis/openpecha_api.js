const API_ENDPOINT = process.env.OPENPECHA_ENDPOINT;
const WORKSPACE_ENDPOINT = process.env.WORKSPACE_ENDPOINT;

/**
 * Step 1: Fetch list of root expressions (title + id)
 * GET /metadata?type=root
 */
async function getExpressions(type) {
  const response = await fetch(`${API_ENDPOINT}/metadata?type=${type}`, {
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch root expressions: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Step 2: Fetch metadata of selected expression
 * GET /metadata/{expression_id}
 */
async function getExpression(expressionId) {
  const response = await fetch(`${API_ENDPOINT}/metadata/${expressionId}`, {
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch expression metadata: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

/**
 * Step 3: Get list of available manifestations for an expression
 * GET /metadata/{expression_id}/manifestations
 */
async function getExpressionManifestations(expressionId) {
  const response = await fetch(
    `${API_ENDPOINT}/metadata/${expressionId}/manifestations`,
    {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch expression manifestations: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

/**
 * Step 4: Fetch serialized text for translation
 * GET /text?id=<manifestation_id>
 */
async function getManifestationText(manifestationId) {
  const response = await fetch(`${API_ENDPOINT}/text/${manifestationId}`, {
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch manifestation text: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

// Legacy functions for backward compatibility
async function getPechaLanguages() {
  const response = await fetch(`${API_ENDPOINT}/languages/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch pecha languages: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
}

async function getPechaCategories() {
  const response = await fetch(`${API_ENDPOINT}/categories/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch pecha categories: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
}

module.exports = {
  // New API flow functions
  getExpressions,
  getExpression,
  getExpressionManifestations,
  getManifestationText,

  // Legacy functions for backward compatibility
  getPechaLanguages,
  getPechaCategories,
};
