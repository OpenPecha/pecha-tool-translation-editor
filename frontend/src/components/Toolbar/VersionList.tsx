import { useQuillVersion } from "@/contexts/VersionContext";
import { useEffect, useState } from "react";
import { MdDelete } from "react-icons/md";
import { SiTicktick } from "react-icons/si";
import VersionDiff from "@/components/Toolbar/VersionDiff";
import { createPortal } from "react-dom";
import { formatDate } from "@/lib/formatDate";

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
  const { versions, loadVersions } = useQuillVersion();
  const [showVersionDiff, setShowVersionDiff] = useState(false);

  const handleViewAll = () => {
    setShowVersionDiff(true);
  };
  useEffect(() => {
    loadVersions();
  }, []);
  return (
    <>
      <div className="versions-list">
        <div className="flex  items-center">
          <span className="font-bold mb-2 text-xs flex-1">Versions</span>
          <span
            className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
            onClick={handleViewAll}
          >
            View all
          </span>
        </div>
        {versions.length === 0 ? (
          <p className="text-gray-500">No saved versions yet</p>
        ) : (
          <div className="max-h-60 overflow-y-auto border">
            {versions.map((version: Version) => (
              <EachVersion key={version.id} version={version} />
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
              <div className="flex-1 bg-white rounded-lg shadow-xl  overflow-hidden">
                <VersionDiff onClose={() => setShowVersionDiff(false)} />
              </div>
            </div>
          </div>,
          document.getElementById("diff-portal")
        )}
    </>
  );
}

function EachVersion({ version }: { version: Version }) {
  const { currentVersionId, loadVersion, deleteVersion } = useQuillVersion();
  return (
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
              window.confirm("Are you sure you want to delete this version?")
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
  );
}

export default VersionList;
