import { useQuillHistory } from "@/contexts/HistoryContext";
import { useState } from "react";
import { MdDelete } from "react-icons/md";
import { SiTicktick } from "react-icons/si";
import VersionDiff from "@/pages/VersionDiff";
import { createPortal } from "react-dom";

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

function VersionList() {
  const { versions, currentVersionId, loadVersion, deleteVersion } =
    useQuillHistory();
  const [showVersionDiff, setShowVersionDiff] = useState(false);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const handleViewAll = () => {
    setShowVersionDiff(true);
  };

  return (
    <>
      <div className="versions-list">
        <div className="flex justify-between items-center">
          <h4 className="font-bold mb-2 text-xs">Versions</h4>
          <h4
            className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
            onClick={handleViewAll}
          >
            View all
          </h4>
        </div>
        {versions.length === 0 ? (
          <p className="text-gray-500">No saved versions yet</p>
        ) : (
          <div className="max-h-60 overflow-y-auto border">
            {versions
              .slice()
              .reverse()
              .map((version: Version) => (
                <div
                  key={version.id}
                  className={`px-2  flex justify-between items-center border-b hover:bg-gray-100 ${
                    version.id === currentVersionId ? "bg-blue-100" : ""
                  }`}
                >
                  <div>
                    <div className="font-sm">{version.label}</div>
                    <div className="text-xs text-gray-500">
                      {formatDate(version.timestamp)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadVersion(version.id)}
                      disabled={version.id === currentVersionId}
                      title="Load version"
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                    >
                      <SiTicktick />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to delete this version?"
                          )
                        ) {
                          deleteVersion(version.id);
                        }
                      }}
                      title="Delete version"
                      className="px-2 py-1 bg-red-100 rounded hover:bg-red-200 text-sm"
                    >
                      <MdDelete />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Version Diff Modal */}
      {showVersionDiff &&
        createPortal(
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-opacity-50" />
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-1 bg-white rounded-lg shadow-xl m-4 overflow-hidden">
                <VersionDiff onClose={() => setShowVersionDiff(false)} />
              </div>
            </div>
          </div>,
          document.getElementById("diff-portal")
        )}
    </>
  );
}

export default VersionList;
