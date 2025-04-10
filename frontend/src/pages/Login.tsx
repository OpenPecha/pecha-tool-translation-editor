import { AuthProvider } from "@/auth/types";
import { useAuth } from "@/auth/use-auth-hook";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const { currentUser, logout, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate("/");
    } else {
      login(AuthProvider.AUTH0);
    }
  }, []);
  return <div></div>;
}

export default Login;
