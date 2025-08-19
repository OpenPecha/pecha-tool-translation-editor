import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/use-auth-hook";
import { Button } from "./ui/button";
import { updateProject } from "@/api/project";
import EditableText from "./ui/EditableText";

import DocIcon from "@/assets/doc_icon.png";
import ShareModal from "./ShareModal";
import { BiShare } from "react-icons/bi";
import ProfileArea from "./ProfileArea";
import { useTolgee, useTranslate } from "@tolgee/react";

type Project = {
  id: string;
  name: string;
};

interface NavbarProps {
  project: Project;
}

const Navbar = ({ project }: NavbarProps) => {
  const { login, isAuthenticated } = useAuth();
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const tolgee = useTolgee();
  const currentLanguage = tolgee.getLanguage();
  const handleAuth0Login = () => {
    login(false);
  };

  const permissionsOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPermissionsModal(true);
  };
  return (
    <nav
      className={`${
        currentLanguage === "bo" && " leading-[normal]"
      } px-6 pt-2 flex justify-between items-center`}
    >
      {/* Logo and Brand */}
      <div className="flex gap-2 items-center">
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
        <div className="flex flex-col w-fit items-center -space-y-1">
          <ProjectNameWrapper project={project} />
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex items-center gap-4">
        <NavMenuList permissionsOpen={permissionsOpen} />
        {isAuthenticated ? (
          <ProfileArea />
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
        <ShareModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => setShowPermissionsModal(false)}
        />
      )}
    </nav>
  );
};

function ProjectNameWrapper({ project }: { readonly project: Project }) {
  // Create a separate component for the input to avoid conditional hook calls
  if (!project?.name) return null;
  return <ProjectNameInput project={project} />;
}

// Separate component to handle the project name input logic
function ProjectNameInput({ project }: { readonly project: Project }) {
  const queryClient = useQueryClient();

  // Set up mutation for updating project name
  const updateProjectMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!project.id) throw new Error("Project ID not found");
      return await updateProject(project.id, { name: newName });
    },
    onSuccess: () => {
      // Invalidate and refetch project and document data
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      queryClient.invalidateQueries({ queryKey: ["document"] });
    },
    onError: (error) => {
      console.error("Failed to update project name:", error);
    },
  });

  const handleSave = async (newName: string) => {
    await updateProjectMutation.mutateAsync(newName);
  };

  return (
    <div className="inline-block font-monlam text-lg leading-[normal]">
      <EditableText
        initialText={project.name}
        onSave={handleSave}
        className="text-md text-gray-500 hover:text-gray-700 transition capitalize hover:outline hover:outline-gray-300"
        placeholder="Project name"
      />
    </div>
  );
}

export function NavMenuList({
  permissionsOpen,
}: {
  readonly permissionsOpen: (e: React.MouseEvent) => void;
}) {
  const { t } = useTranslate();
  return (
    <div className="flex gap-3 font-google-sans">
      <Button
        onClick={permissionsOpen}
        variant="outline"
        className="flex items-center gap-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 rounded-full px-3 py-1 h-auto"
        aria-label="Share document"
      >
        <BiShare className="text-blue-600" />
        <span className="capitalize leading-[normal]">{t("common.share")}</span>
      </Button>
    </div>
  );
}

export default Navbar;
