import React, { useRef, useState } from "react";
import { createDocument } from "../api/document";
import { useNavigate } from "react-router-dom";

function DocumentCreateModal({
  documents,
  setShowCreateModal,
}: {
  documents: Document[];
  setShowCreateModal: (show: boolean) => void;
}) {
  const [newDocIdentifier, setNewDocIdentifier] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRoot, setIsRoot] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [rootId, setRootId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const createDoc = async () => {
    if (!newDocIdentifier) return;

    const formData = new FormData();
    formData.append("identifier", newDocIdentifier);
    formData.append("isRoot", isRoot.toString());
    formData.append("isPublic", isPublic.toString());
    if (!isRoot && rootId) {
      formData.append("rootId", rootId);
    }
    if (selectedFile) {
      formData.append("file", selectedFile);
    }

    createDocument(formData)
      .then((response) => {
        setNewDocIdentifier("");
        setSelectedFile(null);
        setIsRoot(false);
        setIsPublic(false);
        setRootId(null);
        setShowCreateModal(false);
        navigate(`/documents/${response.id}`);
      })
      .catch((error) => {
        console.error("Error creating document:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create document";
        setError(errorMessage);
      });
  };

  return (
    <div className="fixed inset-0  flex justify-center items-center z-50">
      <div className="bg-white  rounded-lg w-full max-w-md shadow-lg">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Document</h2>
          <button
            className="text-gray-500 hover:text-gray-700 text-xl"
            onClick={() => setShowCreateModal(false)}
          >
            &times;
          </button>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <label htmlFor="docIdentifier" className="block mb-1">
              Document Identifier
            </label>
            <input
              type="text"
              id="docIdentifier"
              value={newDocIdentifier}
              onChange={(e) => setNewDocIdentifier(e.target.value)}
              placeholder="Enter document identifier"
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <label htmlFor="isRootCheckbox">Is Root Document</label>
            <input
              id="isRootCheckbox"
              type="checkbox"
              checked={isRoot}
              onChange={(e) => {
                setIsRoot(e.target.checked);
                if (e.target.checked) setRootId(null);
              }}
            />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <label htmlFor="isPublicCheckbox">Is Public Document</label>
            <input
              id="isPublicCheckbox"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
          </div>
          {!isRoot && (
            <div className="mb-4">
              <label htmlFor="rootDocSelect" className="block mb-1">
                Connect to Root Document:
              </label>
              <select
                id="rootDocSelect"
                value={rootId ?? ""}
                onChange={(e) => setRootId(e.target.value || null)}
                className="w-full p-2 border rounded"
                disabled={isRoot}
              >
                <option value="">Select a root document</option>
                {documents
                  .filter((d) => d.isRoot)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.identifier}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <div className="mb-4">
            <label htmlFor="fileInput" className="block mb-1">
              Upload File (Optional)
            </label>
            <input
              type="file"
              id="fileInput"
              ref={fileInputRef}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full p-2 border rounded"
              accept=".txt,.md"
            />
          </div>
        </div>
        <div className="p-4 border-t border-gray-200  flex justify-end gap-4">
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            onClick={() => setShowCreateModal(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={createDoc}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocumentCreateModal;
