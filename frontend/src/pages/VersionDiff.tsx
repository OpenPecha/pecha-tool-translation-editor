import { useQuillHistory } from "@/contexts/HistoryContext";
import { useState, useEffect } from "react";
import { IoMdClose } from "react-icons/io";
import { getVersionDiff } from "@/api/version";
import DiffViewer from "./DiffViewer";

interface DeltaOperation {
  insert: string;
  attributes?: {
    bold?: boolean;
    italic?: boolean;
    color?: string;
    background?: string;
  };
}

interface DeltaContent {
  ops: DeltaOperation[];
}

interface Version {
  id: string;
  label: string;
  timestamp: string;
  content: DeltaContent;
}

interface QuillHistoryContext {
  versions: Version[];
  loadVersion: (id: string) => Promise<boolean>;
  isLoading: boolean;
}

interface DiffResponse {
  diffs: [number, string][];
  previousText: string;
  currentText: string;
}

interface VersionDiffProps {
  readonly onClose: () => void;
}

function VersionDiff({ onClose }: VersionDiffProps) {
  const { versions, isLoading } = useQuillHistory() as QuillHistoryContext;
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  useEffect(() => {
    const fetchDiff = async () => {
      if (selectedVersionId) {
        try {
          const diff = await getVersionDiff(selectedVersionId);
          setDiffData(diff);
        } catch (error) {
          setDiffData(null);
          console.error("Error fetching diff:", error);
        }
      }
    };

    fetchDiff();
  }, [selectedVersionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading versions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center">
        <button
          onClick={onClose}
          className="flex flex-row items-center text-gray-600 hover:text-gray-900"
        >
          <IoMdClose size={20} className="mr-2 font-bold" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left panel - Diff view */}
        <div className="flex-1 bg-white p-6 overflow-y-auto">
          {selectedVersionId && diffData ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Changes</h2>
              <div className="border rounded-lg p-4 bg-gray-50">
                <DiffViewer
                  diffDelta={diffData.diffs}
                  prev={diffData.previousText}
                />
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-20">
              Select a version to see the changes
            </div>
          )}
        </div>

        {/* Right panel - Version list */}
        <div className="w-1/4 border-l bg-white overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Version History</h2>
            {versions && versions.length > 0 ? (
              versions
                .slice()
                .reverse()
                .map((version: Version) => (
                  <div
                    key={version.id}
                    className={`p-4 border-b cursor-pointer ${
                      version.id === selectedVersionId
                        ? "bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedVersionId(version.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{version.label}</h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(version.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-gray-500 text-center py-8">
                No versions available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VersionDiff;
