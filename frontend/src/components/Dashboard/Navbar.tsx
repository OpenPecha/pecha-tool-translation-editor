import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SearchInput from "./SearchInput";
import { memo, useState } from "react";
import NavSidebar from "./NavSidebar";
import { useAuth } from "@/auth/use-auth-hook";
import AppLauncher from "@/components/Applauncher";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DocIcon from "@/assets/doc_icon.png";
const Navbar = () => {
  const { login, isAuthenticated } = useAuth();
  return (
    <nav className="  px-6 py-2 flex justify-between items-center">
      <div className="flex gap-2">
        <NavSidebar />
        <Link
          to="/"
          className="flex items-center gap-3 font-semibold text-gray-500 hover:text-gray-700 transition capitalize"
        >
          <img
            alt="icon"
            src={DocIcon}
            width={40}
            className=" object-contain"
          />
        </Link>
      </div>
      <SearchInput />
      <div className="flex items-center gap-4">
        <AppLauncher />
        {isAuthenticated ? (
          <ProfileArea />
        ) : (
          <Button
            onClick={() => login(false)}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-600 transition"
          >
            Login
          </Button>
        )}
      </div>
    </nav>
  );
};

const ProfileArea = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useAuth();

  const onLogout = () => {
    logout();
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
        <span className="p-3 capitalize font-medium text-gray-700">
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
});

export default Navbar;
