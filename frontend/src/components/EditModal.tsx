import { useState } from "react";

interface EditModalProps {
    doc: Document;
    onClose: () => void;
    onUpdate: (isRoot: boolean, rootId: string | null) => Promise<void>;
    documents: Document[];
  }
  const EditModal: React.FC<EditModalProps> = ({ doc, onClose, onUpdate, documents }) => {
    const [isRoot, setIsRoot] = useState(doc.isRoot);
    const [rootId, setRootId] = useState(doc.rootId);
    const [isUpdating, setIsUpdating] = useState(false);
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsUpdating(true);
      try {
        await onUpdate(isRoot, rootId);
        onClose();
      } catch (error) {
        console.error('Error updating document:', error);
      } finally {
        setIsUpdating(false);
      }
    };
  
    const rootDocuments = documents.filter(d => d.isRoot && d.id !== doc.id);
  
    return (
      <div className="fixed inset-0  flex justify-center items-center z-50">
        <div className="bg-white  rounded-lg w-full max-w-md shadow-lg">
          <div className="p-4 border-b border-gray-200  flex justify-between items-center">
            <h2 className="text-lg font-semibold">Edit Document: {doc.identifier}</h2>
            <button className="text-gray-500 hover:text-gray-700 text-xl" onClick={onClose}>&times;</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="p-4">
              <div className="mb-4">
                <label htmlFor="isRootCheckbox" className="flex items-center gap-2">
                  <input
                    id="isRootCheckbox"
                    type="checkbox"
                    checked={isRoot}
                    onChange={(e) => {
                      setIsRoot(e.target.checked);
                      if (e.target.checked) setRootId(null);
                    }}
                  />
                  Is Root Document
                </label>
              </div>
              {!isRoot && (
                <div className="mb-4">
                  <label htmlFor="rootDocSelect" className="block mb-1">Connect to Root Document:</label>
                  <select
                    id="rootDocSelect"
                    value={rootId ?? ''}
                    onChange={(e) => setRootId(e.target.value || null)}
                    className="w-full p-2 border rounded"
                    disabled={isRoot}
                  >
                    <option value="">Select a root document</option>
                    {rootDocuments.map(d => (
                      <option key={d.id} value={d.id}>{d.identifier}</option>
                    ))}
                  </select>
                </div>
              )}
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
                {isUpdating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  
export default EditModal;