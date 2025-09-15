import React, { useState } from "react";
import { Link } from "react-router-dom";
import EditProjectModal from "./EditProjectModal";
import ShareModal from "../ShareModal";
import { useAuth } from "@/auth/use-auth-hook";

import ProjectItem from "./ProjectItem";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Project, deleteProject, updateProject } from "@/api/project";
import formatTimeAgo from "@/lib/formatTimeAgo";
import { useTranslate } from "@tolgee/react";
import { useUmamiTracking } from "@/hooks/use-umami-tracking";
import { getUserContext } from "@/hooks/use-umami-tracking";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface EachProjectProps {
  readonly project: Project;
  readonly view: "grid" | "list";
}

export default function EachProject({ project, view }: EachProjectProps) {
  const { t } = useTranslate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const {
    trackProjectOpened,
    trackModalOpened,
    trackModalClosed,
    trackProjectShared,
  } = useUmamiTracking();

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

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    deleteProjectMutation.mutate(project.id);
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
      trackModalClosed("project_edit", getUserContext(currentUser));
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
    trackModalOpened("project_edit", getUserContext(currentUser));
  };

  const shareOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareModal(true);
    trackModalOpened("project_share", getUserContext(currentUser));
    trackProjectShared(project.id, "modal_opened", getUserContext(currentUser));
  };

  const handleProjectClick = () => {
    trackProjectOpened(project.id, project.name, getUserContext(currentUser));
  };

  const documentCount = project.roots?.length || 0;
  const url =
    project.roots && project.roots.length > 0
      ? `/documents/${project.roots[0]?.id}`
      : "#";
  return (
    <>
      <Link to={url} className=" " onClick={handleProjectClick}>
        <ProjectItem
          title={project.name}
          subtitle={
            project.roots && project.roots.length > 0
              ? project.roots[0].name
              : t("projects.noRootDocument")
          }
          date={formatTimeAgo(project.updatedAt)}
          hasDocument={project.roots ? project.roots.length > 0 : false}
          documentCount={documentCount}
          hasSharedUsers={false}
          owner={
            project.ownerId === currentUser?.id
              ? t("projects.me")
              : project.owner?.username ?? ""
          }
          hasPermission={hasPermission}
          updateDocument={editOpen}
          deleteDocument={handleDelete}
          shareDocument={shareOpen}
          view={view}
          status={project.status}
          url={url}
        />
      </Link>

      {showEditModal && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onUpdate={(name, identifier) => handleUpdate(name, identifier)}
        />
      )}

      {showShareModal && (
        <ShareModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => setShowShareModal(false)}
        />
      )}

      <ConfirmationModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={t("projects.deleteProject")}
        message={t("projects.deleteProjectMessage")}
        confirmText={t("projects.deleteProjectConfirmText")}
        loading={deleteProjectMutation.isPending}
      />
    </>
  );
}
