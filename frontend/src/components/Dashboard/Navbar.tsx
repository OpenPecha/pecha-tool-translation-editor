import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import SearchInput from "./SearchInput";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import NavSidebar from "./NavSidebar";
import { User } from "@auth0/auth0-react";
import { useAuth } from "@/auth/use-auth-hook";
import AppLauncher from "../Applauncher";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import DocIcon from "@/assets/doc_icon.png";
import { useMatomo } from "@datapunt/matomo-tracker-react";
const Navbar = ({ title }: { title?: string }) => {
  const { currentUser, logout, login, isAuthenticated } = useAuth();
  const { trackPageView, trackEvent, pushInstruction } = useMatomo();

  useEffect(() => {
    trackPageView({
      documentTitle: "Home page", // optional
      href: "https://translations.pecha.tools", // optional
      customDimensions: [
        {
          id: 1,
          value: "loggedIn",
        },
      ], // optional
    });
    pushInstruction("setUserId", currentUser?.id);
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleLogout = () => {
    logout();
  };

  const handleAuth0Login = () => {
    login(false);
  };
  const closeSidebar = () => setIsSidebarOpen(false);
  return (
    <nav className="  px-6 py-2 flex justify-between items-center">
      {/* Logo and Brand */}

      <div className="flex gap-2">
        <NavSidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          trigger={
            <button
              className="p-2 rounded-full hover:bg-gray-100 h-fit transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
          }
        />

        <Link
          to="/"
          className="flex items-center gap-3 font-semibold text-gray-700 hover:text-gray-900 transition capitalize"
        >
          <img
            alt="icon"
            src={DocIcon}
            width={40}
            className=" object-contain"
          />
        </Link>
      </div>

      {!title && <SearchInput trackEvent={trackEvent} />}
      {/* Navigation Menu */}
      <div className="flex items-center gap-4">
        <AppLauncher />
        {isAuthenticated ? (
          <ProfileArea handleLogout={handleLogout} currentUser={currentUser} />
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

function ProfileArea({
  handleLogout,
  currentUser,
}: {
  readonly handleLogout: () => void;
  readonly currentUser: User | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const onLogout = () => {
    handleLogout();
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Avatar>
          <AvatarImage src={currentUser?.picture} />
          <AvatarFallback style={{ backgroundColor: "#f59e0b", color: "#fff" }}>
            {currentUser?.name?.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      </PopoverTrigger>
      <PopoverContent align="end">
        <span className="p-3 capitalize font-medium text-gray-900">
          {currentUser?.name}
        </span>
        <button
          onClick={onLogout}
          className="block w-full text-left px-4 py-2 text-sm  hover:bg-gray-100"
        >
          Logout
        </button>
      </PopoverContent>
    </Popover>
  );
}

export default Navbar;
