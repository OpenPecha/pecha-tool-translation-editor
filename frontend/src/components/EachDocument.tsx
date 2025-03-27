import { useState } from "react";
import { deleteDocument, updateDocument } from "../api/document";
import { Link } from "react-router-dom";
import { MdDelete, MdEdit } from "react-icons/md";
import EditModal from "./EditModal";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "./ui/badge";
import { isTibetan } from "@/lib/isTibetan";

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

  return (
    <div>
      <Link
        to={`/documents/${doc.id}`}
        className="block border-gray-300 border rounded-lg p-4 hover:shadow-md transition-shadow"
        key={doc.id}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-semibold truncate">
            <span
              className={`capitalize ${
                isTibetan("བོད་ལ་") ? "font-monlam" : "font-sans"
              }`}
            >
              {doc.identifier}
            </span>
          </h3>
          {hasPermission && (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowEditModal(true);
                }}
                className="z-20 p-2 rounded-md transition-all duration-200 hover:bg-blue-500 hover:text-white hover:scale-110"
                title="Edit Document"
              >
                <MdEdit />
              </button>
              {!isShared && (
                <button
                  onClick={handleDelete}
                  className="z-20 p-2 rounded-md transition-all duration-200 hover:bg-red-500 hover:text-white hover:scale-110"
                >
                  <MdDelete />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="mt-2 text-sm text-gray-500 flex gap-2">
          {isShared && <Badge variant="outline">Shared</Badge>}
          {doc.isRoot && <Badge>Root</Badge>}
          {doc.root && <Badge variant="outline">{doc.root.identifier}</Badge>}
        </div>
      </Link>

      {showEditModal && (
        <EditModal
          doc={doc}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdate}
          documents={documents}
        />
      )}
    </div>
  );
}
