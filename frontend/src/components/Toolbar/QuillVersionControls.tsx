import React, { useState, useRef, useEffect } from "react";
import { useQuillVersion } from "../../contexts/VersionContext";
import { Button } from "../ui/button";
import VersionList from "./VersionList";

const VersionControls = ({
  openHistory,
  setShowVersionDiff,
}: {
  openHistory: boolean;
  setShowVersionDiff: (show: boolean) => void;
}) => {
  const { createNamedSnapshot } =
    useQuillVersion();

  const [snapshotName, setSnapshotName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleCreateSnapshot = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (snapshotName.trim()) {
      createNamedSnapshot(snapshotName);
      setSnapshotName("");
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };
  const handleViewAll = () => {
    setShowVersionDiff(true);
  };
  return (
    <div className="p-4 border rounded bg-white shadow-md w-72">
      {/* Manual Versioning Section */}
      <div className="mb-4">
        <form onSubmit={handleCreateSnapshot} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            placeholder="Version name"
            className="px-2 border rounded flex-grow text-xs"
          />
          <Button
            type="submit"
            id="create-button"
            className="px-3 py-2 rounded text-xs text-white create-button"
            style={{
              backgroundColor: "#000",
              color: "#fff",
              width: "50px",
            }}
            disabled={!snapshotName.trim()}
          >
            Create
          </Button>
        </form>
      </div>
      {openHistory && <VersionList handleViewAll={handleViewAll} />}
    </div>
  );
};

export default VersionControls;
