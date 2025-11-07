const server_url = import.meta.env.VITE_SERVER_URL;

export interface Model {
  /** Human-readable model description */
  name: string;
  /** Model ID/identifier used in API calls */
  value: string;
  /** Model provider (e.g., "Anthropic", "Google") */
  provider: string;
  /** Array of model capabilities */
  capabilities: string[];
  /** Context window size */
  contextWindow: number;
}

export interface ModelsResponse {
  success: boolean;
  data: Model[];
  message?: string;
  error?: string;
}

const getModels = async (): Promise<Model[]> => {
  const response = await fetch(`${server_url}/models`);

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }

  const result: ModelsResponse = await response.json();

  if (!result.success) {
    throw new Error(result.message || result.error || "Failed to fetch models");
  }

  return result.data;
};

export default getModels;
