// components/RouteTracker.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useMatomo } from "@datapunt/matomo-tracker-react";
import { useAuth } from "../auth/use-auth-hook";

const RouteTracker = () => {
  const location = useLocation();
  const { trackPageView, pushInstruction } = useMatomo();
  const { isAuthenticated, currentUser } = useAuth();

  useEffect(() => {
    trackPageView({
      documentTitle: document.title || location.pathname,
      href: window.location.href,
      customDimensions: [
        {
          id: 1,
          value: isAuthenticated ? "loggedIn" : "notLoggedIn",
        },
      ],
    });
    if (currentUser?.email) {
      pushInstruction("setUserId", currentUser.email);
    }
  }, [location, isAuthenticated, trackPageView]);

  return null;
};

export default RouteTracker;
