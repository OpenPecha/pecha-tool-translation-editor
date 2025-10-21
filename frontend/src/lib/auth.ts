// Centralized auth token management
let getAccessTokenSilently: (() => Promise<string>) | null = null;

/**
 * Sets the auth token getter function that all API modules will use
 * This should be called once from AuthWrapper when the user is authenticated
 */
export const setAuthTokenGetter = (tokenGetter: () => Promise<string>) => {
  getAccessTokenSilently = tokenGetter;
};

/**
 * Gets auth headers including the authorization token if available
 * @param contentType - Content type: "json" (default), "multipart", or "none"
 * @param includeAuth - Whether to include auth headers (default: true)
 * @returns Headers object with Content-Type (if specified) and Authorization if authenticated
 */
export const getAuthHeaders = async (
  contentType: "json" | "multipart" | "none" = "json",
  includeAuth = true
): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {};

  // Only set Content-Type for JSON requests, FormData will set it automatically for multipart
  if (contentType === "json") {
    headers["Content-Type"] = "application/json";
  }

  if (includeAuth && getAccessTokenSilently) {
    try {
      const token = await getAccessTokenSilently();
      headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error("Error getting access token:", error);
      // Don't include auth header if token retrieval fails
    }
  }

  return headers;
};

/**
 * Gets the access token directly (for special cases where headers aren't needed)
 * @returns The access token string or null if not available
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (getAccessTokenSilently) {
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error("Error getting access token:", error);
      return null;
    }
  }
  return null;
};
