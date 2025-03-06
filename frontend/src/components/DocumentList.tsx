import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchDocuments } from '../api/document';

const server_url = import.meta.env.VITE_SERVER_URL;

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocIdentifier, setNewDocIdentifier] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();

 

  useEffect(() => {
    async function fetch(){
      try{
        let documents = await fetchDocuments(token);
        setDocuments(documents)
        setIsLoading(false)
      }catch(e){
        setError('Failed to fetch documents')
        setIsLoading(true)
      }
    }
    fetch();
  }, [token]);

  const createDocument = async () => {
    if (!newDocIdentifier) {
      return;
    }

    try {
      const response = await fetch(`${server_url}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier: newDocIdentifier,
          docs_prosemirror_delta: {},
          docs_y_doc_state: new Uint8Array()
        })
      });

      if (response.ok) {
        const newDoc = await response.json();
        setShowCreateModal(false);
        setNewDocIdentifier('');
        navigate(`/documents/${newDoc.id}`);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to create document');
      }
    } catch (error) {
      console.error('Error creating document:', error);
      setError('Network error');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="document-list-container ">
      <div className="document-list-header">
        <h1 >My Documents</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          Create New Document
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {isLoading ? (
        <div className="loading">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="no-documents">
          <p>You don't have any documents yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="document-grid">
          {documents.map(doc => (
            <Link to={`/documents/${doc.id}`} className="document-card" key={doc.id}>
              <div className="document-card-header">
                <h3>{doc.identifier}</h3>
              </div>
              <div className="document-card-footer">
                <span className="document-date">
                  Last updated: {formatDate(doc.updatedAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Document Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Create New Document</h2>
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
              <button className="btn btn-primary" onClick={createDocument} disabled={!newDocIdentifier}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
