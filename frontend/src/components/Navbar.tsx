import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/use-auth-hook";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Menu } from "lucide-react";
import { useState } from "react";
import NavSidebar from "./Dashboard/NavSidebar";
import { User } from "@auth0/auth0-react";

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
  const showSidebar = !title || title === "";
  return (
    <nav className="  px-6 py-2 flex justify-between items-center">
      {/* Logo and Brand */}
      <div className="flex gap-2">
        {showSidebar && (
          <div
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            className="p-[12px] hover:bg-gray-300 cursor-pointer rounded-full"
          >
            <Menu size={20} />
            <span className="sr-only">Toggle sidebar</span>
          </div>
        )}
        <NavSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <Link
          to="/"
          className="flex items-center gap-3 font-semibold text-gray-700 hover:text-gray-900 transition capitalize"
        >
          <img
            alt="icon"
            src="/icon/doc.svg"
            width={52}
            className=" object-contain"
          />
        </Link>
        <div className="flex flex-col">
          <TitleWrapper title={title} />
          <NavMenuList />
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex items-center gap-4">
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

  const toggleDropdown = () => setIsOpen(!isOpen);

  const onLogout = () => {
    handleLogout();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div
        className="text-gray-700 text-sm flex gap-1 items-center cursor-pointer"
        onClick={toggleDropdown}
      >
        <Avatar>
          <AvatarImage src={currentUser?.picture} />
          <AvatarFallback>{currentUser?.name?.slice(0, 2)}</AvatarFallback>
        </Avatar>
      </div>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-[999999]">
          <span className="p-3 capitalize font-medium text-gray-900">
            {currentUser?.name}
          </span>
          <button
            onClick={onLogout}
            className="block w-full text-left px-4 py-2 text-sm  hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
function TitleWrapper({ title }: { readonly title: string }) {
  if (!title) return null;
  return (
    <span className="text-md font-semibold text-gray-700 hover:text-gray-900 transition capitalize">
      {title}
    </span>
  );
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Permissions from "./Permissions";

export function NavMenuList() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span className="cursor-pointer hover:bg-gray-200  w-fit px-2 -translate-x-2 rounded-sm">
          File
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 z-[99999]">
        {/* <DropdownMenuLabel>File</DropdownMenuLabel> */}
        {/* <DropdownMenuSeparator /> */}
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Permissions />
          </DropdownMenuItem>
          <DropdownMenuItem>Export</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>Team</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Email</DropdownMenuItem>
                <DropdownMenuItem>Message</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>More...</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem>
            New Team
            <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default Navbar;
