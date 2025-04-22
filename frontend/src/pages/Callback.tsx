import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/use-auth-hook";

const Callback: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Once authentication is complete and not loading, redirect to home
    if (isAuthenticated) {
      navigate("/");
    }

    const queryParams = new URLSearchParams(location.search);
    const errormessage = queryParams.get("error");
    if (errormessage?.includes("login_required")) {
      const logoutURL = import.meta.env.VITE_WORKSPACE_URL + "/logout";
      window.location.href = logoutURL;
    }
  }, [isAuthenticated]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">
          Processing your login...
        </h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
};

export default Callback;
