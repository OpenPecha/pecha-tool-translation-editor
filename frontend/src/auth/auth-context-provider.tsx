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
import { AuthProvider as AuthProviderEnum } from "./types";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<AuthProviderEnum | null>(
    null
  );

  // Auth0 hook
  const {
    isAuthenticated: isAuth0Authenticated,
    isLoading: isAuth0Loading,
    user: auth0User,
    getAccessTokenSilently,
    loginWithRedirect,
    logout: auth0Logout,
  } = useAuth0();

  // Handle Auth0 authentication
  useEffect(() => {
    if (isAuth0Authenticated && auth0User) {
      // Convert Auth0 user to our User format
      const mappedUser: User = {
        id: auth0User.sub ?? "",
        email: auth0User.email ?? "",
        name: auth0User.name,
        picture: auth0User.picture,
      };

      setUser(mappedUser);
      setIsAuthenticated(true);
      setAuthProvider(AuthProviderEnum.AUTH0);
      setIsLoading(false);

      // Get the token
      getAccessTokenSilently()
        .then((token) => {
          setToken(token);
        })
        .catch((err) => {
          console.error("Failed to get Auth0 token:", err);
          setError("Failed to get authentication token");
        });
    } else if (!isAuth0Loading && !isAuth0Authenticated) {
      // Only check local storage if not authenticated with Auth0
      checkLocalStorageAuth();
    }
  }, [isAuth0Authenticated, auth0User, isAuth0Loading, getAccessTokenSilently]);

  // Check for token in localStorage on initial load
  const checkLocalStorageAuth = async () => {
    await checkAuth();
  };

  // Check auth with the backend
  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem("auth_token");
      const expiresAt = localStorage.getItem("auth_expires_at");

      if (!storedToken || !expiresAt) {
        setIsLoading(false);
        return;
      }

      // Check if token is expired
      if (new Date(parseInt(expiresAt) * 1000) < new Date()) {
        // Token expired, clear storage
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_expires_at");
        setIsLoading(false);
        return;
      }

      // Validate token with backend
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/auth/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: storedToken }),
        }
      );

      if (!response.ok) {
        throw new Error("Token validation failed");
      }

      const data = await response.json();
      setToken(data.access_token);

      // Fetch user data
      const userResponse = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/user`,
        {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        }
      );

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user data");
      }

      const userData = await userResponse.json();
      setUser(userData);
      setIsAuthenticated(true);
      setAuthProvider(AuthProviderEnum.GOOGLE);
    } catch (err) {
      console.error("Authentication error:", err);
      setError(err instanceof Error ? err.message : "Authentication failed");
      // Clear any invalid tokens
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_expires_at");
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth on initial load
  useEffect(() => {
    checkAuth();
  }, []);

  const login = useCallback(
    async (
      provider: AuthProviderEnum = AuthProviderEnum.GOOGLE,
      username?: string,
      password?: string
    ) => {
      if (provider === AuthProviderEnum.AUTH0) {
        // Use Auth0 login
        loginWithRedirect();
        return;
      }

      // Default to Google login
      // Get the current origin to use as redirect URL
      const currentOrigin = window.location.origin;

      try {
        // If username and password are provided, attempt traditional login
        if (username && password) {
          const response = await fetch(
            `${import.meta.env.VITE_SERVER_URL}/token`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                username,
                password,
              }),
            }
          );

          const data = await response.json();

          if (response.ok) {
            localStorage.setItem("token", data.access_token);
            setToken(data.access_token);
            setIsAuthenticated(true);
            setAuthProvider(AuthProviderEnum.GOOGLE);

            // Fetch user data
            await checkAuth();

            return { success: true };
          } else {
            return { success: false, error: data.detail || "Login failed" };
          }
        } else {
          // Use Google OAuth flow
          const response = await fetch(
            `${
              import.meta.env.VITE_SERVER_URL
            }/auth/google?redirect_url=${encodeURIComponent(currentOrigin)}`
          );
          const data = await response.json();

          // Redirect to Google login
          window.location.href = data.auth_url;
          return { success: true };
        }
      } catch (err) {
        console.error("Login error:", err);
        setError(err instanceof Error ? err.message : "Login failed");
        return { success: false, error: "Network error" };
      }
    },
    [loginWithRedirect]
  );

  const logout = useCallback(() => {
    // If using Auth0, use their logout function
    if (authProvider === AuthProviderEnum.AUTH0) {
      auth0Logout({ logoutParams: { returnTo: window.location.origin } });
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      setAuthProvider(null);
      return;
    }
    // Use a synchronous function for the logout action
    if (token) {
      fetch(`${import.meta.env.VITE_SERVER_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .catch((err) => {
          console.error("Logout API error:", err);
        })
        .finally(() => {
          // Clear local storage
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_expires_at");
          localStorage.removeItem("user_profile");

          // Reset state
          setIsAuthenticated(false);
          setUser(null);
          setToken(null);

          // Redirect to home page
          window.location.href = "/";
        });
    } else {
      // If no token, just clear storage and reset state
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_expires_at");
      localStorage.removeItem("user_profile");
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      window.location.href = "/";
    }
  }, [token, authProvider, auth0Logout]);

  const getToken = useCallback(async (): Promise<string | null> => {
    // If using Auth0, get token from Auth0
    if (authProvider === AuthProviderEnum.AUTH0) {
      try {
        return await getAccessTokenSilently();
      } catch (error) {
        console.error("Error getting Auth0 token:", error);
        return null;
      }
    }
    // If we have a token and it's not expired, return it
    if (token) {
      return token;
    }

    // Otherwise, return null
    return null;
  }, [token, authProvider, getAccessTokenSilently]);

  // Use useMemo to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      currentUser: user,
      token,
      error,
      login,
      logout,
      getToken,
      authProvider,
      getAccessTokenSilently,
    }),
    [
      isAuthenticated,
      isLoading,
      user,
      token,
      error,
      login,
      logout,
      getToken,
      authProvider,
      getAccessTokenSilently,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
