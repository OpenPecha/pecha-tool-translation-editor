import { useState } from "react";
import { Link } from "react-router-dom";
import EditModal from "./EditModal";
import { useAuth } from "@/auth/use-auth-hook";
import PermissionsModal from "./PermissionsModal";

import ProjectItem from "./ProjectItem";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Project, deleteProject, updateProject } from "@/api/project";
import { formatDate } from "@/lib/formatDate";

interface EachProjectProps {
  readonly project: Project;
  readonly view: "grid" | "list";
}

export default function EachProject({ project, view }: EachProjectProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      // Invalidate and refetch projects query
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      console.error("Error deleting project:", error);
    },
  });

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const permission = confirm(
      "Delete this project? This action cannot be undone."
    );
    if (permission) {
      deleteProjectMutation.mutate(project.id);
    }
  };

  type UpdateProjectParams = {
    id: string;
    data: {
      name?: string;
      identifier?: string;
      status?: string;
      metadata?: Record<string, unknown>;
    };
  };

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: UpdateProjectParams) => updateProject(id, data),
    onSuccess: () => {
      // Invalidate and refetch projects query
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowEditModal(false);
    },
    onError: (error) => {
      console.error("Error updating project:", error);
    },
  });

  const handleUpdate = async (name: string, identifier: string) => {
    updateProjectMutation.mutate({
      id: project.id,
      data: {
        name,
        identifier,
      },
    });
  };
  // Check if user has permission to edit the project
  const hasPermission =
    project.ownerId === currentUser?.id ||
    project.permissions?.some(
      (permission) =>
        permission.userId === currentUser?.id && permission.canWrite === true
    );
  const editOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEditModal(true);
  };

  const documentCount =
    (project.roots?.length || 0) +
    (project.roots?.reduce(
      (count, root) => count + (root.translations?.length ?? 0),
      0
    ) ?? 0);
  return (
    <>
      <Link
        to={
          project.roots && project.roots.length > 0
            ? `/documents/${project.roots[0]?.id}`
            : "#"
        }
        className="contents"
      >
        <ProjectItem
          title={project.name}
          subtitle={
            project.roots && project.roots.length > 0
              ? project.roots[0].name
              : "No root document"
          }
          date={formatDate(project.updatedAt)}
          hasDocument={project.roots ? project.roots.length > 0 : false}
          documentCount={documentCount}
          hasSharedUsers={false}
          owner={
            project.ownerId === currentUser?.id
              ? "Me"
              : project.owner?.username ?? ""
          }
          hasPermission={hasPermission}
          updateDocument={editOpen}
          deleteDocument={handleDelete}
          view={view}
          status={project.status}
        />
      </Link>

      {showEditModal && (
        <EditModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onUpdate={(name, identifier) => handleUpdate(name, identifier)}
        />
      )}
    </>
  );
}
