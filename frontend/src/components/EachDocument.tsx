import { useState } from "react";
import { deleteDocument, updateDocument } from "../api/document";
import { Link } from "react-router-dom";
import { MdDelete, MdEdit } from "react-icons/md";
import EditModal from "./EditModal";

interface EachDocumentProps {
    readonly doc: Document;
    readonly setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
    readonly documents: Document[];
  }
  
export default function EachDocument({ doc, setDocuments, documents }: EachDocumentProps) {
    const [showEditModal, setShowEditModal] = useState(false);
  
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString();
    };
  
    const handleDelete = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const permission = confirm('Delete the document?');
      if (permission) {
        try {
          const deleted = await deleteDocument(doc.id);
          if (deleted.message) {
            console.log('Document deleted:', deleted);
            console.log('documents', documents)
            setDocuments((prev: Document[]) => prev.filter((d: Document) => d.id !== doc.id));
          }
        } catch (e) {
          console.error('Error deleting document:', e);
        }
      }
    };
  
    const handleUpdate = async (isRoot: boolean, rootId: string | null) => {
      try {
        const updatedDoc = await updateDocument(doc.id, { isRoot, rootId });
        setDocuments((prev: Document[]) => prev.map((d: Document) => 
          d.id === doc.id ? { ...d, isRoot: updatedDoc.isRoot, rootId: updatedDoc.rootId } : d
        ));
      } catch (error) {
        console.error('Error updating document:', error);
      }
    };
  
    return (
      <div>
        <Link to={`/documents/${doc.id}`} className="block border rounded-lg p-4 hover:shadow-md transition-shadow" key={doc.id}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold">
              <span className="capitalize">{doc.identifier}</span>{" "}
              <span className="text-sm text-gray-500">{doc.isRoot ? '(root)' : ''}</span>
              <span className="text-sm text-gray-500">{doc.root ? `(${doc.root.identifier})` : ''}</span>
            </h3>
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
              <button
                onClick={handleDelete}
                className="z-20 p-2 rounded-md transition-all duration-200 hover:bg-red-500 hover:text-white hover:scale-110"
              >
                <MdDelete/>
              </button>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            <span>
              Last updated: {formatDate(doc.updatedAt)}
            </span>
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
  