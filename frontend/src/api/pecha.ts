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
  try {
    const response = await fetch(`${server_url}/pecha/categories/`, {
      headers: getHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const fetchPechas = async ({ type }: { type: string }) => {
  try {
    const response = await fetch(`${server_url}/pecha/`, {
      headers: getHeaders(),
      method: "POST",
      body: JSON.stringify({ type }),
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const fetchPechaBase = async (pechaId: string) => {
  try {
    const response = await fetch(`${server_url}/pecha/${pechaId}/bases`, {
      headers: getHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
    return error;
  }
};

// New OpenPecha API functions for the text loader
export const fetchExpressions = async (type?: string) => {
  try {
    const url = type ? `${server_url}/pecha/list?type=${type}` : `${server_url}/pecha/list`;
    const response = await fetch(url, {
      headers: getHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const fetchManifestations = async (expressionId: string) => {
  try {
    const response = await fetch(`${server_url}/pecha/${expressionId}/texts`, {
      headers: getHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const fetchTextContent = async (textId: string) => {
  try {
    const response = await fetch(`${server_url}/pecha/text/${textId}`, {
      headers: getHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};
