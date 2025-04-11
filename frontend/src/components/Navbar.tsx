import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/use-auth-hook";
import { Button } from "./ui/button";
import { AuthProvider } from "@/auth/types";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const Navbar = ({ title }: { title?: string }) => {
  const { currentUser, logout, login, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const handleAuth0Login = () => {
    login(AuthProvider.AUTH0);
  };

  return (
    <nav className="  px-6 py-2 flex justify-between items-center">
      {/* Logo and Brand */}
      <Link to="/" className="flex items-center gap-3">
        <img
          alt="icon"
          src="/icon/icon.png"
          width={28}
          className="object-contain"
        />
        <div className="text-xl font-semibold text-gray-700 hover:text-gray-900 transition capitalize">
          {title}
        </div>
      </Link>

      {/* Navigation Menu */}
      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <div className="text-gray-700 text-sm flex gap-1 items-center">
              <Avatar>
                <AvatarImage src={currentUser?.picture} />
                <AvatarFallback>
                  {currentUser?.name?.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="capitalize font-medium text-gray-900">
                {currentUser?.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg shadow hover:bg-red-600 transition"
            >
              Logout
            </button>
          </>
        ) : (
          <Button
            onClick={handleAuth0Login}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-600 transition"
          >
            Login
          </Button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
