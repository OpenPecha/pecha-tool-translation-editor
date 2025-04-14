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
    <>
      <Link to={`/documents/${doc.id}`} className="contents">
        <TableRow className=" transition-all  hover:bg-blue-100 ">
          <TableCell
            className={`flex gap-5 items-center capitalize ${
              isTibetan("བོད་ལ་") ? "font-monlam" : "font-sans"
            }`}
          >
            {" "}
            <div className="p-1 bg-blue-300 rounded-full">
              <FileText />
            </div>
            <div className="flex gap-2 text-gray-600 leading-[20px] font-monlam ">
              {doc.identifier}
              <span className=" text-sm text-gray-500 flex gap-2">
                {doc.isRoot && <Badge>Root</Badge>}
                {doc.root && (
                  <Badge variant="outline">{doc.root.identifier}</Badge>
                )}
              </span>
            </div>
            {isShared && (
              <div>
                <Badge variant="outline">Shared</Badge>
              </div>
            )}
          </TableCell>
          <TableCell>{formatDate(doc.updatedAt)}</TableCell>
          <TableCell>
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
          </TableCell>
        </TableRow>
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
