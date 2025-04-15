import { useState } from "react";
import { Project } from "@/api/project";

interface EditModalProps {
  project: Project;
  onClose: () => void;
  onUpdate: (name: string, identifier: string) => Promise<void>;
}

const EditModal: React.FC<EditModalProps> = ({ project, onClose, onUpdate }) => {
  const [name, setName] = useState(project.name);
  const [identifier, setIdentifier] = useState(project.identifier);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await onUpdate(name, identifier);
      onClose();
    } catch (error) {
      console.error("Error updating project:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md shadow-lg">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            Edit Project: {project.name}
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700 text-xl"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <div className="mb-4">
              <label htmlFor="name" className="block mb-1 font-medium">
                Project Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="identifier" className="block mb-1 font-medium">
                Identifier
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Used in URLs and references. Should be lowercase with hyphens.
              </p>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200  flex justify-end gap-4">
            <button
              type="button"
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;
