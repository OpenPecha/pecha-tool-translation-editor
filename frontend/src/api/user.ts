import { getHeaders } from "./utils";
const server_url = import.meta.env.VITE_SERVER_URL;

export const getUser = async () => {
  const response = await fetch(`${server_url}/pecha/languages/`, {
    headers: getHeaders(),
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  }
};
