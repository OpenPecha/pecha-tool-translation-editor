import { useQuillVersion } from "@/contexts/VersionContext";
import { MdDelete } from "react-icons/md";
import { SiTicktick } from "react-icons/si";
import { FaSpinner } from "react-icons/fa";
import formatTimeAgo from "@/lib/formatTimeAgo";
import { useState } from "react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { createPortal } from "react-dom";

// Use the Version type from context

interface EachVersionProps {
  version: any;
  onDeleteClick: (versionId: string, versionLabel: string) => void;
  isDeleting: boolean;
}

function VersionList({ handleViewAll }: { handleViewAll: () => void }) {
  const { versions, deleteVersion } = useQuillVersion();
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    versionId: string | null;
    versionLabel: string | null;
    isDeleting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    versionId: null,
    versionLabel: null,
    isDeleting: false,
    error: null,
  });

  const handleDeleteClick = (versionId: string, versionLabel: string) => {
    console.log("Delete button clicked for version:", versionLabel);
    setDeleteModalState({
      isOpen: true,
      versionId,
      versionLabel,
      isDeleting: false,
      error: null,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalState.versionId) return;

    setDeleteModalState((prev) => ({ ...prev, isDeleting: true, error: null }));

    try {
      await deleteVersion(deleteModalState.versionId);
      setDeleteModalState({
        isOpen: false,
        versionId: null,
        versionLabel: null,
        isDeleting: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to delete version:", error);
      setDeleteModalState((prev) => ({
        ...prev,
        isDeleting: false,
        error: "Failed to delete version. Please try again.",
      }));
    }
  };

  const handleCloseModal = () => {
    setDeleteModalState({
      isOpen: false,
      versionId: null,
      versionLabel: null,
      isDeleting: false,
      error: null,
    });
  };

  return (
    <>
      <div className="versions-list">
        <div className="flex  items-center">
          <span className="font-bold mb-2 text-xs flex-1">Versions</span>
          <span
            className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer hover:underline"
            onClick={handleViewAll}
          >
            View all
          </span>
        </div>
        {versions.length === 0 ? (
          <p className="text-gray-500">No saved versions yet</p>
        ) : (
          <div className="max-h-60 overflow-y-auto border">
            {versions.map((version: any) => (
              <EachVersion
                key={version.id}
                version={version}
                onDeleteClick={handleDeleteClick}
                isDeleting={
                  deleteModalState.isDeleting &&
                  deleteModalState.versionId === version.id
                }
              />
            ))}
          </div>
        )}
      </div>

      {createPortal(
        <ConfirmationModal
          open={deleteModalState.isOpen}
          onClose={handleCloseModal}
          onConfirm={
            deleteModalState.error ? handleCloseModal : handleDeleteConfirm
          }
          title={deleteModalState.error ? "Error" : "Delete Version"}
          message={
            deleteModalState.error
              ? deleteModalState.error
              : `Are you sure you want to delete the version "${deleteModalState.versionLabel}"? This action cannot be undone.`
          }
          confirmText={deleteModalState.error ? "OK" : "Delete"}
          cancelText={deleteModalState.error ? undefined : "Cancel"}
          loading={deleteModalState.isDeleting}
        />,
        document.getElementById("diff-portal")!
      )}
    </>
  );
}

function EachVersion({ version, onDeleteClick, isDeleting }: EachVersionProps) {
  const {
    currentVersionId,
    loadVersion,
    isLoadingVersion,
    loadingVersionId,
    versions,
  } = useQuillVersion();

  const isLoading = isLoadingVersion && loadingVersionId === version.id;
  const isCurrentVersion = version.id === currentVersionId;
  const isLatestVersion = versions[0]?.id === version.id;
  const isSystemVersion = version.user === null;
  const canDelete =
    isLatestVersion &&
    !isLoading &&
    !isDeleting &&
    !isSystemVersion;

  const handleLoad = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;
    loadVersion(version.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canDelete) {
      onDeleteClick(version.id, version.label);
    }
  };

  return (
    <div
      className={`px-2 py-2 border-b hover:bg-gray-100 ${isCurrentVersion ? "bg-blue-100" : ""
        }`}
    >
      <div className="flex justify-between items-center">
        <div
          className={`flex items-center gap-1 ${isCurrentVersion ? "font-semibold text-blue-600" : ""
            }`}
        >
          {version.label}
        </div>
        <div className="flex gap-2 justify-end">
          {/* First button slot: Load (non-current) or invisible placeholder (current) */}

          {!isCurrentVersion || isSystemVersion ?
            <button
              onClick={handleLoad}
              disabled={isLoading}
              className="px-2 py-1 rounded text-sm bg-gray-200 hover:bg-gray-300"
            >
              {isLoading ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <SiTicktick />
              )}
            </button>
            : <div className="px-2 py-1 w-8">
            </div>
          }


          {/* Second button slot: Delete (non-system) or invisible placeholder (system) */}
          {!isSystemVersion ? (
            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className={`px-2 py-1 rounded text-sm ${canDelete ? "bg-red-100 hover:bg-red-200" : "invisible"
                }`}
            >
              {isDeleting ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <MdDelete />
              )}
            </button>
          ) : (
            <div className="px-2 py-1 w-8"></div>
          )}
        </div>
      </div>

      <div
        className={`text-xs mt-1 ${isCurrentVersion ? "text-blue-600" : "text-gray-500"
          }`}
      >
        {version?.user?.username || version?.user?.name || "System"} •{" "}
        {formatTimeAgo(version.createdAt)}
      </div>
    </div>
  );
}

export default VersionList;