import { useState, useEffect, SetStateAction, Dispatch } from "react";
import { fetchDocuments } from "../../api/document";
import DocumentCreateModal from "../DocumentCreateModal/DocumentCreateModal";
import EachDocument from "./EachDocument";
import "./style.css";
export interface Document {
  id: string;
  identifier: string;
  isRoot: boolean;
  rootId: string | null;
  updatedAt: string;
  ownerId?: string;
}
const DocumentList = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const docs = await fetchDocuments();
        setDocuments(docs);
        setIsLoading(false);
      } catch (e) {
        setError("Failed to fetch documents");
        setIsLoading(true);
        console.error("Error fetching documents:", e);
      }
    };
    fetchDocs();
  }, []);

  return (
    <div className="flex  flex-col border-t-gray-300">
      <div className="bg-[#f2f3f5] p-3">
        <div className="max-w-6xl mx-auto">
          <div className="start_document">Start a new document</div>
          <DocumentCreateModal documents={documents} />
        </div>
      </div>
      <div className="p-4 w-full">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <div className="max-w-6xl mx-auto">
          <List
            documents={documents}
            isLoading={isLoading}
            setDocuments={setDocuments}
          />
        </div>
      </div>
    </div>
  );
};

const List = ({
  documents,
  isLoading,
  setDocuments,
}: {
  documents: Document[];
  isLoading: boolean;
  setDocuments: Dispatch<SetStateAction<Document[]>>;
}) => {
  if (isLoading) {
    return <div className="text-center py-4">Loading documents...</div>;
  }

  if (documents?.length === 0) {
    return (
      <div className="text-center py-8">
        <p>You don't have any documents yet. Create one to get started!</p>
      </div>
    );
  }

  function TableHeading({ children }) {
    return (
      <div className="table-heading text-gray-600 font-semibold">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="flex justify-between w-full p-3">
        <TableHeading>Documents</TableHeading>
        <TableHeading>Last opened</TableHeading>
        <TableHeading>Options</TableHeading>
      </div>
      {documents?.map((doc) => {
        return (
          <EachDocument
            key={doc.id}
            doc={doc}
            setDocuments={setDocuments}
            documents={documents}
          />
        );
      })}
    </div>
  );
};

export default DocumentList;
