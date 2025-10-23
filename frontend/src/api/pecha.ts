import { getHeaders } from "./utils";
const server_url = import.meta.env.VITE_SERVER_URL;

export const fetchLanguage = async () => {
  try {
    const response = await fetch(`${server_url}/pecha/languages/`, {
      headers: getHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    return error;
  }
};

export const fetchCategories = async () => {
  const response = await fetch(`${server_url}/pecha/categories/`, {
    headers: getHeaders(),
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  }
};

export const fetchPechas = async ({ type }: { type: string }) => {
  const response = await fetch(`${server_url}/pecha/`, {
    headers: getHeaders(),
    method: "POST",
    body: JSON.stringify({ type }),
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  }
};

export const fetchPechaBase = async (pechaId: string) => {
  const response = await fetch(`${server_url}/pecha/${pechaId}/bases`, {
    headers: getHeaders(),
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  }
};

// New OpenPecha API functions for the text loader
export const fetchExpressions = async (type?: string) => {
  const url = type
    ? `${server_url}/pecha/list?type=${type}`
    : `${server_url}/pecha/list`;
  const response = await fetch(url, {
    headers: getHeaders(),
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  }
};

export const fetchManifestations = async (expressionId: string) => {
  const response = await fetch(`${server_url}/pecha/${expressionId}/texts`, {
    headers: getHeaders(),
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  }
};

export const fetchTextContent = async (textId: string) => {
  const response = await fetch(`${server_url}/pecha/text/${textId}`, {
    headers: getHeaders(),
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  }
};

export const fetchTemplates = async (limit: number = 6) => {
  const response = await fetch(`${server_url}/pecha/templates?limit=${limit}`, {
    headers: getHeaders(),
  });
  const data = await response.json();

  return data;
};
