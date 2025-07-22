import { useQuillVersion } from "@/contexts/VersionContext";
import { MdDelete } from "react-icons/md";
import { SiTicktick } from "react-icons/si";
import { FaSpinner } from "react-icons/fa";
import formatTimeAgo from "@/lib/formatTimeAgo";

// Use the Version type from context

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

function VersionList({ handleViewAll }: { handleViewAll: () => void }) {
  const { versions } = useQuillVersion();

  return (
    <>
      <div className="versions-list">
        <div className="flex  items-center">
          <span className="font-bold mb-2 text-xs flex-1">Versions</span>
          <span
            className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer hover:underline"
            onClick={handleViewAll}
          >
            View all
          </span>
        </div>
        {versions.length === 0 ? (
          <p className="text-gray-500">No saved versions yet</p>
        ) : (
          <div className="max-h-60 overflow-y-auto border">
            {versions.map((version: any) => (
              <EachVersion key={version.id} version={version} />
            ))}
          </div>
        )}
      </div>

      {/* Version Diff Modal */}
    </>
  );
}

function EachVersion({ version }: { version: any }) {
  const { 
    currentVersionId, 
    loadVersion, 
    deleteVersion, 
    isLoadingVersion, 
    loadingVersionId 
  } = useQuillVersion();

  const isLoading = isLoadingVersion && loadingVersionId === version.id;
  const isDisabled = isLoadingVersion;

  const handleVersionSelect = () => {
    if (version.id === currentVersionId) {
      alert("You need to save the current version first");
      return;
    }
    if (isDisabled) return;
    loadVersion(version.id);
  };
  return (
    <div
      key={version.id}
      className={`px-2 py-2 flex flex-col  border-b hover:bg-gray-100 ${
        version.id === currentVersionId ? "bg-blue-100" : ""
      }`}
    >
      <div className="flex justify-between">
        <div className="font-sm">{version.label}</div>
        <div className="flex gap-2">
          <button
            onClick={handleVersionSelect}
            title={isLoading ? "Loading..." : "Load version"}
            disabled={isDisabled}
            className={`px-2 py-1 rounded text-sm transition-colors ${
              isDisabled
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {isLoading ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <SiTicktick />
            )}
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
            disabled={isDisabled}
            className={`px-2 py-1 rounded text-sm transition-colors ${
              isDisabled
                ? "bg-red-50 text-red-300 cursor-not-allowed"
                : "bg-red-100 hover:bg-red-200"
            }`}
          >
            <MdDelete />
          </button>
        </div>
      </div>

              <div className="text-xs text-gray-500">
          {version?.user?.username || version?.user?.name || "System"} {"  "}
          {formatTimeAgo(version.timestamp)}
        </div>
    </div>
  );
}

export default VersionList;
