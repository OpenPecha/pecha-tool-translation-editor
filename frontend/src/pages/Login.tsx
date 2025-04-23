import { useAuth } from "@/auth/use-auth-hook";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate("/");
    } else {
      login(false);
    }
  }, []);
  return <div></div>;
}

export default Login;
