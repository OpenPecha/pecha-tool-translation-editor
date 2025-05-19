import { useQuillVersion } from "@/contexts/VersionContext";
import { MdDelete } from "react-icons/md";
import { SiTicktick } from "react-icons/si";
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
            {versions.map((version: Version) => (
              <EachVersion key={version.id} version={version} />
            ))}
          </div>
        )}
      </div>

      {/* Version Diff Modal */}
    </>
  );
}

function EachVersion({ version }: { version: Version }) {
  const { currentVersionId, loadVersion, deleteVersion } = useQuillVersion();
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

      <div className="text-xs text-gray-500">
        {version?.user?.username} {"  "}
        {formatTimeAgo(version.timestamp)}
      </div>
    </div>
  );
}

export default VersionList;
