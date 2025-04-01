import { getVersionDiff } from "@/api/version";
import { useQuillHistory } from "@/contexts/HistoryContext";
import React from "react";
import { MdDelete } from "react-icons/md";
import { SiTicktick } from "react-icons/si";

function VersionList() {
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
  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  const handleVersionClick = async (versionId: string) => {
    const diff = await getVersionDiff(versionId);
    console.log(diff);
  };

  return (
    <div className="versions-list">
      <h4 className="font-bold mb-2 text-xs">Versions</h4>
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
