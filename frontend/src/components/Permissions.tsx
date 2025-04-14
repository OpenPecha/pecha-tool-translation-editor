import React, { useState } from "react";
import { updatePermission } from "../api/document";
import { FaShare } from "react-icons/fa";
import { MdCancel, MdSaveAs } from "react-icons/md";
import { Button } from "./ui/button";
import { createPortal } from "react-dom";
import { ToolbarButton } from "./Toolbar";

function Permissions({ documentId }: { readonly documentId: string }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Grant Permission Button */}
      <ToolbarButton
        title="Share"
        onClick={() => setShowModal(true)}
        className="py-2 rounded-md  transition"
      >
        <FaShare />
      </ToolbarButton>

      {/* Permission Modal */}
      {showModal &&
        createPortal(
          <PermissionModal
            documentId={documentId}
            setShowModal={setShowModal}
          />,
          document.body
        )}
    </>
  );
}

function PermissionModal({
  documentId,
  setShowModal,
}: {
  readonly documentId: string;
  readonly setShowModal: (showModal: boolean) => void;
}) {
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [canRead, setCanRead] = useState(true);
  const [canWrite, setCanWrite] = useState(false);

  const handleGrantPermission = async () => {
    try {
      const canread = "true";
      const canwrite = canWrite ? "true" : "false";
      const response = await updatePermission(
        documentId,
        email,
        canread,
        canwrite
      );
      if (response) {
        if (response.error) {
          setError(response.error);
        } else {
          setShowModal(false);
          setError(null);
          setEmail("");
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Memoize the form inputs to prevent unnecessary re-renders
  const formInputs = React.useMemo(
    () => (
      <>
        <input
          type="email"
          placeholder="User Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded-md mb-4"
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="canWrite"
            checked={canWrite}
            onChange={(e) => {
              setCanWrite(e.target.checked);
              if (e.target.checked) {
                setCanRead(true);
              }
            }}
            className="w-4 h-4"
          />
          <label htmlFor="canWrite" className="text-gray-700">
            Can read/Write
          </label>
        </div>
      </>
    ),
    [email, error, canRead, canWrite]
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.3)] bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h3 className="text-lg font-semibold mb-4">Grant Permission</h3>
        {formInputs}
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleGrantPermission}
            className=" px-4 py-2   rounded-md hover:bg-green-600 transition flex-1"
          >
            <MdSaveAs />
            save
          </Button>
          <Button
            onClick={() => {
              setShowModal(false);
              setEmail("");
              setError(null);
            }}
            variant="outline"
            className="  px-4 py-2 rounded-md  hover:bg-red-600 transition flex-1"
          >
            <MdCancel /> cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Permissions;
