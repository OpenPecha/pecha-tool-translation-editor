import React, { useState, ReactNode, useMemo, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { createContext } from "react";
import { AuthContextType } from "./types";
import { useUmamiTracking } from "@/hooks/use-umami-tracking";
import { clearUmamiUser, setUmamiUser } from "@/analytics";

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

  const { trackUserLogin, trackUserLogout } = useUmamiTracking();

  const logout = useCallback(() => {
    // Track logout event
    if (user?.sub) {
      trackUserLogout(user.sub);
    }

    // Clear any stored tokens
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_token");
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("auth_token");

    // If using Auth0, use their logout function with redirect to /logout
    auth0Logout({
      logoutParams: { returnTo: `${window.location.origin}/logout` },
      clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
    });
  }, [auth0Logout, user, trackUserLogout]);

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
  const currentUser: UserType | null =
    user && user.sub && user.email
      ? {
          id: user.sub,
          email: user.email,
          name: user.name || "",
          picture: user.picture || "",
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

  // Track successful login
  React.useEffect(() => {
    if (isAuthenticated && user) {
      // Set user for Umami identification
      setUmamiUser({
        email: user.email,
        id: user.id,
        name: user.name,
        // Add additional properties if available
        sub: user?.sub,
      });
    } else if (!isAuthenticated) {
      // Clear user identification when logged out
      clearUmamiUser();
    }
    if (isAuthenticated && user?.sub && !silentAuthAttempted) {
      trackUserLogin(user.sub);
      setSilentAuthAttempted(true);
    }
  }, [isAuthenticated, user, trackUserLogin, silentAuthAttempted]);

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
