import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { User } from "@auth0/auth0-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/use-auth-hook";
import { Button } from "./ui/button";
import { updateDocument } from "@/api/document";

import DocIcon from "@/assets/doc_icon.png";
import AvatarWrapper from "./ui/custom-avatar";
import PermissionsModal from "./PermissionsModal";
import { BiShare } from "react-icons/bi";

type Project = {
  id: string;
  name: string;
};

const Navbar = ({ title, project }: { title?: string; project: Project }) => {
  const { currentUser, logout, login, isAuthenticated } = useAuth();
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const handleLogout = () => {
    logout();
  };
  const handleAuth0Login = () => {
    login(false);
  };

  const permissionsOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPermissionsModal(true);
  };
  return (
    <nav className="  px-6 pt-2 flex justify-between items-center">
      {/* Logo and Brand */}
      <div className="flex gap-2 items-center">
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
        <div className="flex flex-col w-fit  items-center -space-y-1">
          <TitleWrapper title={title!} />
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex items-center gap-4">
        <NavMenuList permissionsOpen={permissionsOpen} />
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
      {showPermissionsModal && (
        <PermissionsModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => setShowPermissionsModal(false)}
        />
      )}
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
        <AvatarWrapper
          imageUrl={currentUser?.picture}
          name={currentUser?.name}
          size={32}
        />
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
function TitleInput({ initialTitle }: { readonly initialTitle: string }) {
  const [inputValue, setInputValue] = useState(initialTitle);
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Set up mutation for updating document title
  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!id) throw new Error("Document ID not found");
      // Update the document name instead of the identifier
      return await updateDocument(id, { name: newTitle });
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
    if (newValue === initialTitle) return;
    if (newValue.trim() === "") return;
    setInputValue(newValue);
  };

  // Save changes if title has changed and is not empty
  const saveChanges = () => {
    if (inputValue !== initialTitle && inputValue.trim()) {
      updateTitleMutation.mutate(inputValue);
    }
  };

  // Handle form submission (Enter key)
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveChanges();
    // Blur the input on enter
    (document.activeElement as HTMLElement)?.blur();
  };

  // Handle blur event to save changes when focus is lost
  const handleBlur = () => {
    saveChanges();
  };

  return (
    <div className="inline-block">
      <form onSubmit={handleSubmit}>
        <input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="text-md text-gray-700 hover:text-gray-900 transition capitalize hover:outline hover:outline-gray-300"
          style={{
            width: `${inputValue.length + 1}ch`,
            minWidth: "50px",
          }}
        />
      </form>
    </div>
  );
}

export function NavMenuList({
  permissionsOpen,
}: {
  readonly permissionsOpen: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex gap-3 font-google-sans">
      <Button
        onClick={permissionsOpen}
        variant="outline"
        className="flex items-center gap-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 rounded-full px-3 py-1 h-auto"
        aria-label="Share document"
      >
        <BiShare className="text-blue-600" />
        <span>Share</span>
      </Button>
    </div>
  );
}

export default Navbar;
