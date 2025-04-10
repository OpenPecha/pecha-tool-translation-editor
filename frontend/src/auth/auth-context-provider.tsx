import React, {
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { useAuth0 } from "@auth0/auth0-react";
import type { User } from "./types";
import { AuthContext } from "./auth-context";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auth0 hook
  const {
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently,
    getIdTokenClaims,
    loginWithRedirect,
    logout: auth0Logout,
  } = useAuth0();

  const logout = useCallback(() => {
    // If using Auth0, use their logout function
    auth0Logout({
      logoutParams: { returnTo: window.location.origin, federated: true },
    });

    // Use a synchronous function for the logout action
    if (token) {
      fetch(`${import.meta.env.VITE_SERVER_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .catch((error) => {
          console.error("Logout API error:", error);
        })
        .finally(() => {
          // Clear local storage
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_expires_at");
          localStorage.removeItem("user_profile");

          // Reset state
          setToken(null);

          // Redirect to home page
          window.location.href = "/";
        });
    } else {
      // If no token, just clear storage and reset state
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_expires_at");
      localStorage.removeItem("user_profile");
      setToken(null);
      window.location.href = "/";
    }
  }, [token, auth0Logout]);

  const getToken = useCallback(async (): Promise<string | null> => {
    // If using Auth0, get token from Auth0
    try {
      const access_token = await getAccessTokenSilently();
      return access_token;
    } catch (error) {
      console.error("Error getting Auth0 token:", error);
      return null;
    }
  }, [getAccessTokenSilently]);

  const currentUser = { ...user, id: user?.sub };
  // Use useMemo to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      currentUser,
      token,
      error,
      login: loginWithRedirect,
      logout,
      getToken,
    }),
    [
      isAuthenticated,
      isLoading,
      user,
      token,
      error,
      loginWithRedirect,
      logout,
      getToken,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
