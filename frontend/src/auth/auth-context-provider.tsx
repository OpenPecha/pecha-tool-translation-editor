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
  // Auth0 hook
  const {
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently,
    loginWithRedirect,
    logout: auth0Logout,
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

  const currentUser = { ...user, id: user?.sub };
  // Use useMemo to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      currentUser,
      login: loginWithRedirect,
      logout,
      getToken,
    }),
    [isAuthenticated, isLoading, user, loginWithRedirect, logout, getToken]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
