import React, { useState, ReactNode, useMemo, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { createContext } from "react";
import { AuthContextType } from "./types";

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

type UserType = {
  id: string;
  email: string;
  name: string;
  picture: string;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Auth0 hook
  const {
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently,
    loginWithRedirect,
    logout: auth0Logout,
    error,
  } = useAuth0();
  const logout = useCallback(() => {
    // If using Auth0, use their logout function
    auth0Logout({
      logoutParams: { returnTo: window.location.origin },
    });
    // If no token, just clear storage and reset state
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_expires_at");
    localStorage.removeItem("user_profile");
  }, [auth0Logout]);

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

  // Ensure user object matches the User interface requirements
  const currentUser: UserType | null = user
    ? {
        id: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
      }
    : null;
  // Track silent auth attempts to prevent infinite loops
  const [silentAuthAttempted, setSilentAuthAttempted] = useState(false);

  const login = useCallback(
    (auto: boolean) => {
      // If this is a silent auth attempt (auto=true)
      if (auto) {
        // If we've already tried silent auth and it failed, don't try again
        if (silentAuthAttempted) {
          console.log(
            "Silent authentication already attempted, not retrying to prevent loop"
          );
          return;
        }

        // Mark that we've attempted silent auth
        setSilentAuthAttempted(true);
      } else {
        // If this is an explicit login, reset the silent auth flag
        setSilentAuthAttempted(false);
      }

      loginWithRedirect({
        authorizationParams: {
          prompt: auto ? "none" : "login",
        },
      });
    },
    [loginWithRedirect, silentAuthAttempted]
  );
  // Convert error to string | null to match AuthContextType
  const errorMessage = error ? error.message || "Authentication error" : null;

  // Use useMemo to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      currentUser,
      login,
      logout,
      getToken,
      error: errorMessage,
    }),
    [
      isAuthenticated,
      isLoading,
      currentUser,
      login,
      logout,
      getToken,
      errorMessage,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
