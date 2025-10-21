import { useAuth } from "@/auth/use-auth-hook";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const loginURI = import.meta.env.VITE_WORKSPACE_URL + "/login";

  useEffect(() => {
    if (currentUser) {
      navigate("/");
    } else {
      window.location.href = loginURI;
    }
  }, []);
  return <div> </div>;
}

export default Login;
