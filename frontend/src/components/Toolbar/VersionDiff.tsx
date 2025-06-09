import { useQuillVersion } from "@/contexts/VersionContext";
import { useState, useEffect } from "react";
import { IoMdClose } from "react-icons/io";
import { getVersionDiff } from "@/api/version";
import DiffViewer from "../../pages/DiffViewer";
import { Button } from "@/components/ui/button";
import formatTimeAgo from "@/lib/formatTimeAgo";

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

interface QuillVersionContext {
  versions: Version[];
  loadVersion: (id: string) => Promise<boolean>;
  isLoading: boolean;
}

interface DiffResponse {
  diffs: [number, string][];
  prev: [number, string][];
  currentText: string;
}

interface VersionDiffProps {
  readonly onClose: () => void;
}

function VersionDiff({ onClose }: VersionDiffProps) {
  const { versions, isLoading, loadVersion } =
    useQuillVersion() as QuillVersionContext;
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

  const handleRestore = async () => {
    if (selectedVersionId) {
      try {
        await loadVersion(selectedVersionId);
        onClose();
      } catch (error) {
        console.error("Error restoring version:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-700">Loading versions...</div>
      </div>
    );
  }
  const lastVersionId = versions?.[0]?.id;
  return (
    <div className="min-h-screen bg-gray-50 z-[999999] ">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex justify-between items-center">
        <button
          onClick={onClose}
          className="flex flex-row items-center text-gray-500 hover:text-gray-700"
        >
          <IoMdClose size={20} className="mr-2 font-bold" />
        </button>
        <Button
          onClick={handleRestore}
          disabled={!selectedVersionId || selectedVersionId === lastVersionId}
          title="Restore version"
        >
          Restore
        </Button>
      </div>

      {/* Main content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left panel - Diff view */}
        <div className="flex-1 bg-white p-6 overflow-y-auto">
          {selectedVersionId && diffData ? (
            <DiffViewer diffDelta={diffData.diffs} />
          ) : (
            <div className="text-center text-gray-500 mt-20">
              Select a version to see the changes
            </div>
          )}
        </div>

        {/* Right panel - Version list */}
        <div className="w-1/4 border-l bg-white overflow-y-auto">
          <div className="p-4">
            <h2 className=" font-semibold mb-4">Version History</h2>
            {versions && versions.length > 0 ? (
              versions.map((version: Version) => (
                <button
                  type="button"
                  key={version.id}
                  className={`p-4 flex flex-col  border-b w-full cursor-pointer ${
                    version.id === selectedVersionId
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedVersionId(version.id)}
                >
                  <div className="flex justify-between items-start">
                    <span>{version.label}</span>
                    <p className="text-sm text-gray-500">
                      {formatTimeAgo(version.timestamp)}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500 self-start capitalize">
                    {version.user ? version?.user?.username : "system"}
                  </div>
                </button>
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
