import { useState, useEffect } from "react";
import { fetchPublicDocuments } from "../api/document";
import EachDocument from "./EachDocument";

interface Document {
  id: string;
  identifier: string;
  isRoot: boolean;
  rootId: string | null;
  updatedAt: string;
  isPublic: boolean;
}

const PublicDocumentList = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const docs = await fetchPublicDocuments();
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

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center py-4">Loading documents...</div>;
    }

    if (documents.length === 0) {
      return (
        <div className="text-center py-8">
          <p>There is no publicly shared documents</p>
        </div>
      );
    }

    return (
      <>
        <h1 className="text-2xl font-bold mb-4">Public Documents</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <EachDocument
              key={doc.id}
              doc={doc}
              setDocuments={() => {}}
              documents={documents}
            />
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="p-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {renderContent()}
    </div>
  );
};

export default PublicDocumentList;
