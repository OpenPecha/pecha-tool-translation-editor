import { useState, useEffect, SetStateAction, Dispatch } from "react";
import { fetchDocuments } from "../../api/document";
import DocumentCreateModal from "../DocumentCreateModal/DocumentCreateModal";
import EachDocument from "./EachDocument";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
export interface Document {
  id: string;
  identifier: string;
  isRoot: boolean;
  rootId: string | null;
  updatedAt: string;
}
const DocumentList = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "root" | "translations">(
    "all"
  );

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

  const filteredTexts = (() => {
    switch (activeTab) {
      case "root":
        return documents.filter((doc) => doc.isRoot);
      case "translations":
        return documents.filter((doc) => !doc.isRoot);
      default:
        return documents;
    }
  })();
  return (
    <div className="flex border-t border-t-gray-300">
      <div className="p-4 w-full">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold text-dharma-burgundy mb-2">
            Pecha Text
          </h1>
          <p className="text-center text-gray-600 max-w-2xl">
            A collection of Buddhist texts, including original root texts and
            their translations.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <div className="flex pb-3 justify-between">
          <Tabs
            defaultValue="all"
            className=" mb-8"
            onValueChange={(value) => setActiveTab(value as any)}
          >
            <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
              <TabsTrigger value="all">All Texts</TabsTrigger>
              <TabsTrigger value="root">Root Texts</TabsTrigger>
              <TabsTrigger value="translations">Translations</TabsTrigger>
            </TabsList>
          </Tabs>
          <DocumentCreateModal documents={documents} />
        </div>
        <List
          documents={filteredTexts}
          isLoading={isLoading}
          setDocuments={setDocuments}
        />
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

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <p>You don't have any documents yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => {
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
