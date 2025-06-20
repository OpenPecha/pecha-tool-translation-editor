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
