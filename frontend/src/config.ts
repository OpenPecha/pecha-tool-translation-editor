// API URL configuration
export const API_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:9000";

export const models = {
  options: [
    {
      name: "claude-sonnet-4",
      value: "claude-sonnet-4-20250514",
    },
    {
      name: "claude-3-haiku",
      value: "claude-3-haiku-20240307",
    },
  ],
  default: "claude-sonnet-4-20250514",
};

export const token_limit = 30000;
