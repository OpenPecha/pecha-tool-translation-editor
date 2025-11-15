const API_ENDPOINT = process.env.OPENPECHA_ENDPOINT;

async function getTexts(type, limit, offset, language) {
  const url = new URL(`${API_ENDPOINT}/texts`);
  if (type) url.searchParams.append("type", type);
  if (limit) url.searchParams.append("limit", limit);
  if (offset) url.searchParams.append("offset", offset);
  if (language) url.searchParams.append("language", language);
  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch texts from openpecha: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

async function getText(text_id) {
  const response = await fetch(`${API_ENDPOINT}/texts/${text_id}`, {
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  return response.json();
}

async function getTextInstances(text_id) {
  const response = await fetch(`${API_ENDPOINT}/texts/${text_id}/instances`, {
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch text instances from openpecha: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

async function getInstanceContent(instanceId) {
  const response = await fetch(
    `${API_ENDPOINT}/instances/${instanceId}?annotation=true&content=true`,
    {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch instance content from openpecha: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

async function getAnnotations(annotation_id) {
  const response = await fetch(`${API_ENDPOINT}/annotations/${annotation_id}`, {
    header: {
      accept: "application/json",
      "Content-Type": "applicaton/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch annotations from openpecha: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

const uploadTranslationToOpenpecha = async (instanceId, translationData) => {
  const response = await fetch(
    `${API_ENDPOINT}/instances/${instanceId}/translation`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(translationData),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to upload translation to openpecha: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
};

async function getSegmentRelated(
  instanceId,
  spanStart,
  spanEnd,
  transfer = false
) {
  const response = await fetch(
    `${API_ENDPOINT}/instances/${instanceId}/segment-related?span_start=${spanStart}&span_end=${spanEnd}&transfer=${transfer}`,
    {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch segment related from openpecha: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

async function getSegmentsContent(instanceId, seg_ids) {
  const url = `${API_ENDPOINT}/instances/${instanceId}/segment-content?segment_id=${seg_ids}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch segment content from openpecha: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

module.exports = {
  getTexts,
  getText,
  getTextInstances,
  getInstanceContent,
  getAnnotations,
  uploadTranslationToOpenpecha,
  getSegmentRelated,
  getSegmentsContent,
};
