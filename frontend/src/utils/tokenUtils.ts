/**
 * Utility functions for JWT token operations
 */

/**
 * JWT payload interface
 */
interface JWTPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  aud?: string | string[];
  iss?: string;
  [key: string]: unknown;
}

/**
 * Decode a JWT token payload without verification
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    if (!token) return null;

    // Split the token into parts
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode the payload (second part)
    const payload = parts[1];

    // Add padding if necessary
    const paddedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = atob(paddedPayload);

    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error("Error decoding JWT token:", error);
    return null;
  }
};

/**
 * Check if a JWT token is expired
 * @param token JWT token string
 * @returns true if expired, false if valid, null if cannot determine
 */
export const isTokenExpired = (token: string): boolean | null => {
  try {
    if (!token) return null;

    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return null;

    // Convert exp claim to milliseconds and compare with current time
    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();

    // Add a small buffer (30 seconds) to account for clock skew
    const buffer = 30 * 1000;

    return currentTime >= expirationTime - buffer;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return null;
  }
};

/**
 * Get the expiration time of a JWT token
 * @param token JWT token string
 * @returns Date object of expiration time or null if cannot determine
 */
export const getTokenExpirationTime = (token: string): Date | null => {
  try {
    if (!token) return null;

    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return null;

    return new Date(payload.exp * 1000);
  } catch (error) {
    console.error("Error getting token expiration time:", error);
    return null;
  }
};

/**
 * Get time remaining until token expires
 * @param token JWT token string
 * @returns milliseconds until expiration, 0 if expired, null if cannot determine
 */
export const getTimeUntilExpiration = (token: string): number | null => {
  try {
    if (!token) return null;

    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return null;

    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();
    const timeRemaining = expirationTime - currentTime;

    return Math.max(0, timeRemaining);
  } catch (error) {
    console.error("Error calculating time until expiration:", error);
    return null;
  }
};

/**
 * Check if a token stored in localStorage is expired
 * @param tokenKey localStorage key where token is stored (default: 'access_token')
 * @returns true if expired, false if valid, null if token not found
 */
export const isStoredTokenExpired = (
  tokenKey: string = "access_token"
): boolean | null => {
  try {
    const token = localStorage.getItem(tokenKey);
    if (!token) return null;

    return isTokenExpired(token);
  } catch (error) {
    console.error("Error checking stored token expiration:", error);
    return null;
  }
};
