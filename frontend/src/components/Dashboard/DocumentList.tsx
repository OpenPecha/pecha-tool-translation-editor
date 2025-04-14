import { useState, useEffect, SetStateAction, Dispatch } from "react";
import { fetchDocuments } from "../../api/document";
import DocumentCreateModal from "../DocumentCreateModal/DocumentCreateModal";
import EachDocument from "./EachDocument";
import "./style.css";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
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
    <div className="flex  flex-col border-t-gray-300 ">
      <div className="pt-14 px-6 ">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-medium mb-6">Start new project</h1>
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
          {documents?.length > 0 && (
            <List
              documents={documents}
              isLoading={isLoading}
              setDocuments={setDocuments}
            />
          )}
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

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium">Projects</h2>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-sm">
            Owned by anyone
          </Button>

          <Button variant="outline" size="sm" className="h-8 text-sm">
            Last opened by me
          </Button>

          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <span className="sr-only">Grid view</span>
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path
                  fill="currentColor"
                  d="M1 1h6v6H1V1zm8 0h6v6H9V1zm-8 8h6v6H1V9zm8 0h6v6H9V9z"
                />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <span className="sr-only">List view</span>
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path
                  fill="currentColor"
                  d="M1 1h14v2H1V1zm0 4h14v2H1V5zm0 4h14v2H1V9zm0 4h14v2H1v-2z"
                />
              </svg>
            </Button>
          </div>
        </div>
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
