import { getHeaders } from "./utils";
const server_url = import.meta.env.VITE_SERVER_URL;

// New OpenPecha API functions for the text loader
export const fetchTexts = async ({
  type,
  limit,
  offset,
  language,
}: {
  type?: string;
  limit?: number;
  offset?: number;
  language?: string;
}) => {
  const getUrl = () => {
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    if (language) params.append("language", language);
    return `${server_url}/openpecha/texts?${params.toString()}`;
  };
  const response = await fetch(getUrl(), {
    headers: getHeaders(),
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  }
};

export const fetchInstances = async (textId: string) => {
  const response = await fetch(`${server_url}/openpecha/${textId}/instances`, {
    headers: getHeaders(),
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  }
};

export const fetchTextContent = async (textId: string) => {
  const response = await fetch(`${server_url}/openpecha/instances/${textId}`, {
    headers: getHeaders(),
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  }
};

export const fetchAnnotations = async (annotationId: string) => {
  const response = await fetch(
    `${server_url}/openpecha/annotations/${annotationId}`,
    {
      headers: getHeaders(),
    }
  );
  if (response.ok) {
    const data = await response.json();
    return data;
  }
};

export interface TranslationPayload {
  language: string;
  content: string;
  title: string;
  segmentation: any;
  target_annotation: any;
  alignment_annotation: any;
}

export const uploadTranslationToOpenpecha = async (
  instance_id: string,
  payload: TranslationPayload,
  translation_doc_id: string
) => {
  const response = await fetch(
    `${server_url}/openpecha/instances/${instance_id}/translation/${translation_doc_id}`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to upload translation");
  }
  return response.json();
};
