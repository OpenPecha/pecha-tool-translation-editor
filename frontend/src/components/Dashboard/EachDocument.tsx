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
    <div className="w-full">
      <Link to={`/documents/${doc.id}`}>
        <Card className="w-full py-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div
                className={`capitalize ${
                  isTibetan("བོད་ལ་") ? "font-monlam" : "font-sans"
                }`}
              >
                {doc.identifier}
              </div>
              {hasPermission && (
                <div className="flex items-center ">
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
            </CardTitle>
            {/* <CardDescription>Card Description</CardDescription> */}
          </CardHeader>

          <CardFooter>
            <div className="mt-2 text-sm text-gray-500 flex gap-2">
              {isShared && <Badge variant="outline">Shared</Badge>}
              {doc.isRoot && <Badge>Root</Badge>}
              {doc.root && (
                <Badge variant="outline">{doc.root.identifier}</Badge>
              )}
            </div>
          </CardFooter>
        </Card>
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
