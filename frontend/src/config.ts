// API URL configuration
export const API_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:9000";

export const models = {
  options: [
    {
      name: "Claude Sonnet 3.7",
      value: "claude-3-7-sonnet-20250219",
    },
    {
      name: "Gemini 2.5 pro",
      value: "gemini-2.5-pro-exp-06-25",
      disabled: true,
    },
  ],
  default: "claude-3-7-sonnet-20250219",
};

export const token_limit = 100000;

export const DEFAULT_LANGUAGE_SELECTED = "bo";

export const INITIAL_PROJECT_LIMIT = 30;
