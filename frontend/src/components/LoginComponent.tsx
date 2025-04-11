import React from "react";
import { Button } from "./ui/button";
import { useAuth } from "../auth/use-auth-hook";

function LoginComponent() {
  const { login } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      <h2 className="text-2xl font-semibold">Sign In</h2>
      <p className="text-muted-foreground">Please sign in to continue</p>
      <Button onClick={() => login(false)} className="w-full">
        Login
      </Button>
    </div>
  );
}

export default LoginComponent;
