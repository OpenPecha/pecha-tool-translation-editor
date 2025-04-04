const API_ENDPOINT = process.env.OPENPECHA_ENDPOINT;

//filterBy: commentary_of, version_of, translation_of
async function getPechaList(filterBy) {
  let body = { filter: {} };
  const filters = {
    commentary_of: {
      and: [
        { field: "commentary_of", operator: "==", value: null },
        { field: "translation_of", operator: "==", value: null },
      ],
    },
    version_of: {
      and: [
        { field: "commentary_of", operator: "==", value: null },
        { field: "version_of", operator: "==", value: null },
      ],
    },
    translation_of: {
      field: "language",
      operator: "==",
      value: "bo",
    },
  };

  body.filter = filters[filterBy] || {};
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
module.exports = { getPechaList,getPechaLanguages };
