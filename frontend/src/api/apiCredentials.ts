// API credentials service

import { API_URL } from "@/config";
import { getHeaders } from "./utils";

export interface ApiCredential {
  id: string;
  provider: string;
  apiKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCredentialInput {
  provider: string;
  apiKey: string;
}

// Get all API credentials
export const fetchApiCredentials = async (): Promise<ApiCredential[]> => {
  const response = await fetch(`${API_URL}/api-credentials`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch API credentials");
  }

  const data = await response.json();
  return data.data;
};

// Get a specific API credential
export const fetchApiCredential = async (
  id: string
): Promise<ApiCredential> => {
  const response = await fetch(`${API_URL}/api-credentials/${id}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch API credential");
  }

  const data = await response.json();
  return data.data;
};

// Create a new API credential
export const createApiCredential = async (
  credential: ApiCredentialInput
): Promise<ApiCredential> => {
  const response = await fetch(`${API_URL}/api-credentials`, {
    method: "POST",
    headers: getHeaders(),

    body: JSON.stringify(credential),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create API credential");
  }

  const data = await response.json();
  return data.data;
};

// Update an API credential
export const updateApiCredential = async (
  id: string,
  credential: Partial<ApiCredentialInput>
): Promise<ApiCredential> => {
  const response = await fetch(`${API_URL}/api-credentials/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(credential),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update API credential");
  }

  const data = await response.json();
  return data.data;
};

// Delete an API credential
export const deleteApiCredential = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/api-credentials/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete API credential");
  }
};
