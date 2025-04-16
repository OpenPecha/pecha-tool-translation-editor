import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { User } from "@auth0/auth0-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/use-auth-hook";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { updateDocument } from "@/api/document";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Permissions from "./Permissions";

const Navbar = ({ title }: { title?: string }) => {
  const { currentUser, logout, login, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const handleAuth0Login = () => {
    login(false);
  };
  return (
    <nav className="  px-6 py-2 flex justify-between items-center">
      {/* Logo and Brand */}
      <div className="flex gap-2">
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
        <div className="flex flex-col w-fit">
          <TitleWrapper title={title!} />
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
  // Create a separate component for the input to avoid conditional hook calls
  if (!title) return null;
  return <TitleInput initialTitle={title} />;
}

// Separate component to handle the input logic
function TitleInput({ initialTitle }: { initialTitle: string }) {
  const [inputValue, setInputValue] = useState(initialTitle);
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Set up mutation for updating document title
  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!id) throw new Error("Document ID not found");
      return await updateDocument(id, { identifier: newTitle });
    },
    onSuccess: () => {
      // Invalidate and refetch document data
      queryClient.invalidateQueries({ queryKey: ["document", id] });
    },
    onError: (error) => {
      console.error("Failed to update document title:", error);
      // Revert to original title on error
      setInputValue(initialTitle);
    },
  });

  // Update input value when it changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Blur the input field to trigger the blur event
    (document.activeElement as HTMLElement)?.blur();
  };

  // Handle blur event to save changes when focus is lost
  const handleBlur = () => {
    if (inputValue !== initialTitle && inputValue.trim()) {
      updateTitleMutation.mutate(inputValue);
    }
  };

  return (
    <div className="inline-block">
      <form onSubmit={handleSubmit}>
        <input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="text-md  text-gray-700 hover:text-gray-900 transition capitalize hover:outline hover:outline-gray-300 "
          style={{
            width: `${inputValue.length + 1}ch`,
            minWidth: "50px",
          }}
        />
      </form>
    </div>
  );
}

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
