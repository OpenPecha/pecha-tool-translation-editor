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
    console.log(error);
    return error;
  }
};

export const fetchPechas = async ({ filterBy }: { filterBy: string }) => {
  try {
    const response = await fetch(`${server_url}/pecha/`, {
      headers: getHeaders(),
      method: "POST",
      body: JSON.stringify({ filterBy }),
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
