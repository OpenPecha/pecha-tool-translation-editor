import { getVersionDiff } from "@/api/version";
import { useQuillHistory } from "@/contexts/HistoryContext";
import { useState } from "react";
import { MdDelete } from "react-icons/md";
import { SiTicktick } from "react-icons/si";
import { useNavigate, useParams } from "react-router-dom";

function VersionList() {
  const navigate = useNavigate();
  const { id: documentId } = useParams();
  const {
    versions,
    currentVersionId,
    autoSaveEnabled,
    saveVersion,
    loadVersion,
    deleteVersion,
    createNamedSnapshot,
    toggleAutoSave,
  } = useQuillHistory();
  const [showAllVersions, setShowAllVersions] = useState(false);
  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  const handleVersionClick = async (versionId: string) => {
    const diff = await getVersionDiff(versionId);
  };

  return (
    <div className="versions-list">
      <div className="flex justify-between items-center">
        <h4 className="font-bold mb-2 text-xs">Versions</h4>
        <h4
          className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
          onClick={() => navigate(`/version-history/${documentId}`)}
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
            .map((version) => (
              <div
                key={version.id}
                onClick={() => handleVersionClick(version.id)}
                className={`px-2  flex justify-between items-center border-b hover:bg-gray-100 ${
                  version.id === currentVersionId ? "bg-blue-100" : ""
                }`}
              >
                <div>
                  <div className="font-sm">{version.label}</div>
                  {/* <div className="text-xs text-gray-500">
                    {formatDate(version.timestamp)}
                  </div> */}
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
  );
}

export default VersionList;
