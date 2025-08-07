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

  const {  
    createNamedSnapshot,
    isCreatingVersion,
    createVersionError,
    createVersionSuccess,
    clearVersionCreationState
  } = useQuillVersion();

  const [snapshotName, setSnapshotName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Clear error state when user starts typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSnapshotName(e.target.value);
    if (createVersionError) {
      clearVersionCreationState();
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (snapshotName.trim() && !isCreatingVersion) {
      try {
        await createNamedSnapshot(snapshotName);
        // Clear input only on successful creation
        setSnapshotName("");
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } catch (error) {
        // Error is handled by the context
        console.error("Failed to create version:", error);
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
            onChange={handleInputChange}
            placeholder="Version name"
            className={`px-2 border rounded flex-grow text-xs transition-colors ${
              createVersionError 
                ? "border-red-500 focus:border-red-500" 
                : "border-gray-300 focus:border-blue-500"
            }`}
            disabled={isCreatingVersion}
            aria-invalid={!!createVersionError}
            aria-describedby={createVersionError ? "version-error" : undefined}
          />
          <Button
            type="submit"
            id="create-button"
            className="px-3 py-2 rounded text-xs text-white create-button transition-all duration-200"
            style={{
              backgroundColor: createVersionSuccess ? "#22c55e" : "#000",
              color: "#fff",
              width: "60px",
            }}
            disabled={!snapshotName.trim() || isCreatingVersion}
          >
            {isCreatingVersion ? (
              <div className="flex items-center justify-center">
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : createVersionSuccess ? (
              <div className="flex items-center justify-center">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            ) : (
              "Create"
            )}
          </Button>
        </form>
        
        {/* Error Message */}
        {createVersionError && (
          <div 
            id="version-error"
            className="mt-2 text-xs text-red-600 flex items-center gap-1"
            role="alert"
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {createVersionError}
          </div>
        )}
      </div>
      {openHistory && <VersionList handleViewAll={handleViewAll} />}
    </div>
  );
};

export default VersionControls;
