import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createDocument, deleteDocument, updateDocument, fetchDocuments } from '../api/document';
import { MdDelete, MdEdit } from "react-icons/md";
import { CiCirclePlus } from 'react-icons/ci';

interface Document {
  id: string;
  identifier: string;
  isRoot: boolean;
  rootId: string | null;
  updatedAt: string;
}

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
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Edit Document: {doc.identifier}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group mb-4">
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
              <div className="form-group">
                <label htmlFor="rootDocSelect">Connect to Root Document:</label>
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
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
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

const DocumentList = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocIdentifier, setNewDocIdentifier] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const docs = await fetchDocuments();
        setDocuments(docs);
        setIsLoading(false);
      } catch (e) {
        setError('Failed to fetch documents');
        setIsLoading(true);
        console.error('Error fetching documents:', e);
      }
    };
    fetchDocs();
  }, []);

  const createDoc = async () => {
    if (!newDocIdentifier) return;

    createDocument(newDocIdentifier)
      .then(response => {
        setNewDocIdentifier('');
        setShowCreateModal(false);
        navigate(`/documents/${response.id}`);
      })
      .catch(e => {
        console.error('Error creating document:', e);
        const data = e.response?.data;
        setError(data?.detail ?? 'Failed to create document');
      });
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="loading">Loading documents...</div>;
    }
    
    if (documents.length === 0) {
      return (
        <div className="no-documents">
          <p>You don't have any documents yet. Create one to get started!</p>
        </div>
      );
    }

    return (
      <div className="document-grid">
        {documents.map(doc => (
          <EachDocument 
            key={doc.id} 
            doc={doc} 
            setDocuments={setDocuments}
            documents={documents}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="document-list-container">
      <div className="flex gap-2 pb-3">
        <h1>My Pechas</h1>
        <button className="flex gap-2 items-center rounded-xl uppercase" onClick={() => setShowCreateModal(true)}>
          <CiCirclePlus size={30}/>
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {renderContent()}

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Document</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="docIdentifier">Document Identifier</label>
                <input
                  type="text"
                  id="docIdentifier"
                  value={newDocIdentifier}
                  onChange={(e) => setNewDocIdentifier(e.target.value)}
                  placeholder="Enter document identifier"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={createDoc} disabled={!newDocIdentifier}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface EachDocumentProps {
  readonly doc: Document;
  readonly setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  readonly documents: Document[];
}

function EachDocument({ doc, setDocuments, documents }: EachDocumentProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const permission = confirm('Delete the document?');
    if (permission) {
      try {
        const deleted = await deleteDocument(doc.id);
        if (deleted?.id) {
          setDocuments((prev: Document[]) => prev.filter((d: Document) => d.id !== doc.id));
        }
      } catch (e) {
        console.error('Error deleting document:', e);
      }
    }
  };

  const handleUpdate = async (isRoot: boolean, rootId: string | null) => {
    try {
      const updatedDoc = await updateDocument(doc.id, { isRoot, rootId });
      setDocuments((prev: Document[]) => prev.map((d: Document) => 
        d.id === doc.id ? { ...d, isRoot: updatedDoc.isRoot, rootId: updatedDoc.rootId } : d
      ));
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  return (
    <div>
      <Link to={`/documents/${doc.id}`} className="document-card" key={doc.id}>
        <div className="document-card-header">
          <h3 className='text-xl font-semibold'>
            <span className='capitalize'>{doc.identifier}</span>{" "}
            <span className='text-sm text-gray-500'>{doc.isRoot ? '(root)' : ''}</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowEditModal(true);
              }}
              className="z-20 p-2 rounded-md transition-all duration-200 hover:bg-blue-500 hover:text-white hover:scale-110"
              title="Edit Document"
            >
              <MdEdit />
            </button>
            <button
              onClick={handleDelete}
              className="z-20 p-2 rounded-md transition-all duration-200 hover:bg-red-500 hover:text-white hover:scale-110"
            >
              <MdDelete/>
            </button>
          </div>
        </div>
        <div className="document-card-footer">
          <span className="document-date">
            Last updated: {formatDate(doc.updatedAt)}
          </span>
        </div>
      </Link>

      {showEditModal && (
        <EditModal
          doc={doc}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdate}
          documents={documents}
        />
      )}
    </div>
  );
}

export default DocumentList;
