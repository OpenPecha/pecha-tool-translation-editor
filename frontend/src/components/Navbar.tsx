import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/use-auth-hook";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import SearchInput from "./SearchInput";
import { Menu } from "lucide-react";
import { useState } from "react";
import NavSidebar from "./NavSidebar";

const Navbar = ({ title }: { title?: string }) => {
  const { currentUser, logout, login, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleLogout = () => {
    logout();
  };

  const handleAuth0Login = () => {
    login(false);
  };
  const onToggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  return (
    <nav className="  px-6 py-2 flex justify-between items-center">
      {/* Logo and Brand */}
      <div className="flex gap-2">
        <div
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="p-[12px] hover:bg-gray-300 cursor-pointer rounded-full"
        >
          <Menu size={20} />
          <span className="sr-only">Toggle sidebar</span>
        </div>
        <NavSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
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
      </div>

      {!title && <SearchInput />}
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
