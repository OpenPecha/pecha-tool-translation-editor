import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/auth/use-auth-hook";
import { isTokenExpired } from "@/utils/tokenUtils";

/**
 * Custom hook to monitor token expiration and handle automatic logout
 */
export const useTokenExpiration = () => {
  const { logout, getToken, isAuthenticated } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  const checkTokenExpiration = useCallback(async () => {
    // Prevent multiple simultaneous checks
    if (isCheckingRef.current || !isAuthenticated) {
      return;
    }

    isCheckingRef.current = true;

    try {
      // First check localStorage token
      const storedToken = localStorage.getItem("access_token");
      if (storedToken && isTokenExpired(storedToken)) {
        console.log("Stored token has expired, logging out...");
        logout();
        return;
      }

      // Then check the Auth0 token
      try {
        const currentToken = await getToken();
        if (currentToken && isTokenExpired(currentToken)) {
          console.log("Current token has expired, logging out...");
          logout();
          return;
        }
      } catch (error) {
        console.error(
          "Error getting current token for expiration check:",
          error
        );
        // If we can't get the token, consider it expired
        logout();
        return;
      }
    } catch (error) {
      console.error("Error checking token expiration:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [getToken, logout, isAuthenticated]);

  const setupTokenExpirationCheck = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!isAuthenticated) {
      return;
    }

    // Check immediately
    checkTokenExpiration();

    // Set up periodic checking every 30 seconds
    intervalRef.current = setInterval(() => {
      checkTokenExpiration();
    }, 30 * 1000);
  }, [checkTokenExpiration, isAuthenticated]);

  const checkTokenOnFocus = useCallback(() => {
    // Check token when window gains focus (user returns to tab)
    if (isAuthenticated) {
      checkTokenExpiration();
    }
  }, [checkTokenExpiration, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      setupTokenExpirationCheck();

      // Add event listener for window focus
      window.addEventListener("focus", checkTokenOnFocus);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        window.removeEventListener("focus", checkTokenOnFocus);
      };
    } else {
      // Clear interval if not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isAuthenticated, setupTokenExpirationCheck, checkTokenOnFocus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    checkTokenExpiration,
  };
};
