import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDocument } from "../../api/document";
import SelectLanguage from "./SelectLanguage";
import SelectPechas, { PechaType } from "./SelectPechas";
import { DialogFooter } from "../ui/dialog";
import { Document } from "../Dashboard/DocumentList";

export function NewPechaForm({
  documents,
  closeModal,
}: {
  readonly documents: Document[];
  readonly closeModal: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newDocIdentifier, setNewDocIdentifier] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRoot, setIsRoot] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [rootId, setRootId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const navigate = useNavigate();

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
        closeModal();
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
    <div className="p-4">
      <SelectLanguage
        setSelectedLanguage={setSelectedLanguage}
        selectedLanguage={selectedLanguage}
      />
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
      <DocumentCreateModalFooter
        createDoc={createDoc}
        closeModal={closeModal}
      />
    </div>
  );
}

export function PechaFromOpenPecha({
  closeModal,
}: {
  readonly closeModal: () => void;
}) {
  const [selectedRootPecha, setSelectedRootPecha] = useState<PechaType | null>(
    null
  );
  //selected datas

  return (
    <div className="p-4">
      <SelectPechas
        selectedRootPecha={selectedRootPecha}
        setSelectedRootPecha={setSelectedRootPecha}
      />
      <DocumentCreateModalFooter createDoc={() => {}} closeModal={closeModal} />
    </div>
  );
}

function DocumentCreateModalFooter({
  createDoc,
  closeModal,
}: {
  readonly createDoc: () => void;
  readonly closeModal: () => void;
}) {
  return (
    <DialogFooter>
      <button
        type="button"
        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        onClick={closeModal}
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
    </DialogFooter>
  );
}
