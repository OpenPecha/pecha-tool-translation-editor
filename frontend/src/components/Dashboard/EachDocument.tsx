import { useState } from "react";
import { deleteDocument, updateDocument } from "../../api/document";
import { Link } from "react-router-dom";
import { Document } from "../Dashboard/DocumentList";
import EditModal from "./EditModal";
import { useAuth } from "@/auth/use-auth-hook";
import { formatDate } from "@/lib/formatDate";
import ProjectItem from "./ProjectItem";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface EachDocumentProps {
  readonly doc: Document & {
    permissions?: Array<{ userId: string; canWrite: boolean }>;
  };
  readonly documents: Document[];
  readonly view: "grid" | "list";
}

export default function EachDocument({
  doc,
  documents,
  view,
}: EachDocumentProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: (deleted) => {
      if (deleted.message) {
        // Invalidate and refetch documents query
        queryClient.invalidateQueries({ queryKey: ["documents"] });
      }
    },
    onError: (error) => {
      console.error("Error deleting document:", error);
    },
  });

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const permission = confirm("Delete the document?");
    if (permission) {
      deleteDocumentMutation.mutate(doc.id);
    }
  };

  type UpdateDocumentParams = {
    id: string;
    data: {
      isRoot: boolean;
      rootId: string | null;
      identifier: string;
      isPublic: boolean;
    };
  };

  const updateDocumentMutation = useMutation({
    mutationFn: ({ id, data }: UpdateDocumentParams) =>
      updateDocument(id, data),
    onSuccess: (updatedDoc) => {
      // Invalidate and refetch documents query

      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => {
      console.error("Error updating document:", error);
    },
  });

  const handleUpdate = async (
    isRoot: boolean,
    rootId: string | null,
    identifier: string | null,
    isPublic: boolean | null
  ) => {
    updateDocumentMutation.mutate({
      id: doc.id,
      data: {
        isRoot,
        rootId,
        identifier: identifier ?? "",
        isPublic: isPublic ?? false,
      },
    });
  };
  // Check if user has permission to edit the document
  const hasPermission =
    doc.ownerId === currentUser?.id ||
    doc.permissions?.some(
      (permission: { userId: string; canWrite: boolean }) =>
        permission.userId === currentUser?.id && permission.canWrite === true
    );
  const editOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEditModal(true);
  };
  return (
    <>
      <Link to={`/documents/${doc.id}`} className="contents">
        <ProjectItem
          title={doc.identifier}
          date={formatDate(doc.updatedAt)}
          hasDocument={true}
          hasSharedUsers={false}
          owner={""}
          hasPermission={hasPermission}
          updateDocument={editOpen}
          deleteDocument={handleDelete}
          view={view}
        />
      </Link>

      {showEditModal && (
        <EditModal
          doc={doc}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdate}
          documents={documents}
        />
      )}
    </>
  );
}
