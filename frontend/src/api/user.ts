import { getHeaders } from "./utils";
import type { User } from "@/auth/types";
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

export const createUser = async (user: User) => {
  const response = await fetch(`${server_url}/users/`, {
    headers: getHeaders(),
    method: "POST",
    body: JSON.stringify(user),
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  }
};