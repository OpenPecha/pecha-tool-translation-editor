import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/use-auth-hook";
import { useStore } from "../store";
import { AuthProvider } from "../auth/types";

const Login = () => {
  const [password, setPassword] = useState("");
  const { username, setUsername } = useStore(
    ({ setUsername, username }) => ({
      setUsername,
      username,
    })
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, currentUser, isLoading, isAuthenticated } = useAuth();

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // Using the traditional login method
      const result = await login(AuthProvider.GOOGLE, username, password);

      setUsername(username);
      if (result && 'success' in result && result.success) {
        navigate("/");
      } else if (result && 'error' in result && result.error) {
        setError(result.error);
      }
    } catch (error) {
      console.log(error);
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuth0Login = () => {
    login(AuthProvider.AUTH0);
  };

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      navigate("/");
    }
  }, [isAuthenticated, currentUser, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center">
          <img
            alt="icon"
            src="/icon/icon.png"
            width={100}
            className="object-contain"
          />
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="relative block  pl-2 w-full rounded-t-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative pl-2 block w-full rounded-b-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting || isLoading}
              className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 mb-3"
            >
              {submitting ? "Signing in..." : "Sign in with Username/Password"}
            </button>
            <button
              type="button"
              onClick={handleAuth0Login}
              disabled={submitting || isLoading}
              className="group relative flex w-full justify-center rounded-md bg-gray-800 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-700 focus-visible:outline-offset-2 focus-visible:outline-gray-800 disabled:opacity-50"
            >
              {submitting ? "Signing in..." : "Sign in with Auth0"}
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
