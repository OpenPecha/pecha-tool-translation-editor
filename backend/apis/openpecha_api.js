const API_ENDPOINT = process.env.OPENPECHA_ENDPOINT;

/**
 * Step 1: Fetch list of root expressions (title + id)
 * GET /texts?type=root
 */
async function getExpressions(type) {
  let url=`${API_ENDPOINT}/texts`;
  if(type){
    url+=`?type=${type}`;
  }
  const response = await fetch(url, {
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
 * GET /texts/{text_id}
 */
async function getExpression(text_id) {
  const response = await fetch(`${API_ENDPOINT}/texts/${text_id}`, {
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch text metadata: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

/**
 * Step 3: Get list of available manifestations for an expression
 * GET /texts/{text_id}/instances
 */
async function getExpressionTexts(text_id) {
  const response = await fetch(
    `${API_ENDPOINT}/texts/${text_id}/instances`,
    {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch text instances: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

/**
 * Step 4: Fetch serialized text for translation
 * GET /instances/{instance_id}
 */
async function getText(instanceId) {
  const response = await fetch(`${API_ENDPOINT}/instances/${instanceId}`, {
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch instance text: ${response.statusText}`
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
  getExpressionTexts,
  getText,

  // Legacy functions for backward compatibility
  getPechaLanguages,
  getPechaCategories,
};
