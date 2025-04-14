import { useState } from "react";
import { deleteDocument, updateDocument } from "../../api/document";
import { Link } from "react-router-dom";
import { MdDelete, MdEdit } from "react-icons/md";

import { Badge } from "../ui/badge";
import { isTibetan } from "@/lib/isTibetan";
import { Card, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Document } from "../Dashboard/DocumentList";
import EditModal from "./EditModal";
import { useAuth } from "@/auth/use-auth-hook";
import { FileText } from "lucide-react";
import { formatDate } from "@/lib/formatDate";
import { TableCell, TableRow } from "../ui/table";
import ProjectItem from "./ProjectItem";

interface EachDocumentProps {
  readonly doc: Document;
  readonly setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  readonly documents: Document[];
}

export default function EachDocument({
  doc,
  setDocuments,
  documents,
}: EachDocumentProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const { currentUser } = useAuth();
  const isShared = doc.ownerId !== currentUser?.id;
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const permission = confirm("Delete the document?");
    if (permission) {
      try {
        const deleted = await deleteDocument(doc.id);
        if (deleted.message) {
          setDocuments((prev: Document[]) =>
            prev.filter((d: Document) => d.id !== doc.id)
          );
        }
      } catch (e) {
        console.error("Error deleting document:", e);
      }
    }
  };

  const handleUpdate = async (
    isRoot: boolean,
    rootId: string | null,
    identifier: string,
    isPublic: boolean
  ) => {
    try {
      const updatedDoc = await updateDocument(doc.id, {
        isRoot,
        rootId,
        identifier,
        isPublic,
      });
      setDocuments((prev: Document[]) =>
        prev.map((d: Document) =>
          d.id === doc.id
            ? {
                ...d,
                isRoot: updatedDoc.isRoot,
                rootId: updatedDoc.rootId,
                identifier: updatedDoc.identifier,
                isPublic: updatedDoc.isPublic,
              }
            : d
        )
      );
    } catch (error) {
      console.error("Error updating document:", error);
    }
  };
  const hasPermission =
    doc.ownerId === currentUser?.id ||
    doc.permissions.some(
      (permission) =>
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
