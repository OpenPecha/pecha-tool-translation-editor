const API_ENDPOINT = process.env.OPENPECHA_ENDPOINT;
const WORKSPACE_ENDPOINT = process.env.WORKSPACE_ENDPOINT;

//filterBy: commentary_of, version_of, translation_of
async function getPechaList(type) {
  let body = {
    filter: {
      field: "type",
      operator: "==",
      value: type === "pecha" ? "root" : type,
    },
    page: 1,
    limit: 20,
  };

  console.log(body);
  const response = await fetch(`${API_ENDPOINT}/metadata/filter/`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch pecha list: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(data);
  return data;
}

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

async function getPechaBase(pechaId) {
  const response = await fetch(`${WORKSPACE_ENDPOINT}/pecha/${pechaId}/bases`, {
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch pecha base info: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
}

module.exports = {
  getPechaList,
  getPechaLanguages,
  getPechaBase,
  getPechaCategories,
};
