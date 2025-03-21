import React, { useState } from "react";
import { useQuillHistory } from "../contexts/HistoryContext";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import VersionList from "./VersionList";

const QuillHistoryControls = () => {
  const { autoSaveEnabled, saveVersion, createNamedSnapshot, toggleAutoSave } =
    useQuillHistory();

  const [snapshotName, setSnapshotName] = useState("");

  const handleCreateSnapshot = (e) => {
    e.preventDefault();
    if (snapshotName.trim()) {
      createNamedSnapshot(snapshotName);
      setSnapshotName("");
    }
  };
  return (
    <div className="p-4 border rounded bg-white shadow-md w-72">
      {/* Auto Versioning Section */}
      <div className="flex justify-between mb-4">
        <h4 className=" flex-1 text-xs font-semibold mb-2">Auto</h4>
        <Switch
          checked={autoSaveEnabled}
          onCheckedChange={toggleAutoSave}
          style={{
            backgroundColor: autoSaveEnabled ? "black" : "#ccc",
            color: autoSaveEnabled ? "#fff" : "#000",
            width: "40px",
          }}
        />
      </div>

      {/* Manual Versioning Section */}
      <div className="mb-4">
        <form onSubmit={handleCreateSnapshot} className="flex gap-2">
          <input
            type="text"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            placeholder="Version name"
            className="px-2 border rounded flex-grow text-xs"
          />
          <Button
            type="submit"
            className="px-3 py-2 rounded text-xs "
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
      <VersionList />
    </div>
  );
};

export default QuillHistoryControls;
