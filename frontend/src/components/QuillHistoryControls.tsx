// src/components/QuillHistoryControls.js

import React, { useState } from 'react';
import { useQuillHistory } from '../contexts/HistoryContext';

const QuillHistoryControls = () => {
  const {
    versions,
    currentVersionId,
    autoSaveEnabled,
    saveVersion,
    loadVersion,
    deleteVersion,
    createNamedSnapshot,
    toggleAutoSave
  } = useQuillHistory();
  
  const [snapshotName, setSnapshotName] = useState('');

  const handleCreateSnapshot = (e) => {
    e.preventDefault();
    if (snapshotName.trim()) {
      createNamedSnapshot(snapshotName);
      setSnapshotName('');
    }
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <div className="quill-history-controls p-4 border rounded">
      <h3 className="text-lg font-bold mb-4">Document History</h3>
      
      {/* Save controls */}
      <div className="mb-4">
        <form onSubmit={handleCreateSnapshot} className="flex gap-2 mb-2">
          <input
            type="text"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            placeholder="Version name"
            className="border p-2 flex-grow"
          />
          <button 
            type="submit" 
            className="bg-blue-500 text-white px-4 py-2 rounded"
            disabled={!snapshotName.trim()}
          >
            Save Version
          </button>
        </form>
        
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="auto-save"
            checked={autoSaveEnabled}
            onChange={toggleAutoSave}
            className="mr-2"
          />
          <label htmlFor="auto-save">Auto-save enabled</label>
        </div>
      </div>
      
      {/* Versions list */}
      <div className="versions-list">
        <h4 className="font-bold mb-2">Saved Versions</h4>
        {versions.length === 0 ? (
          <p className="text-gray-500">No saved versions yet</p>
        ) : (
          <div className="max-h-60 overflow-y-auto border">
            {versions.slice().reverse().map((version) => (
              <div 
                key={version.id} 
                className={`p-2 flex justify-between items-center border-b hover:bg-gray-100 ${
                  version.id === currentVersionId ? 'bg-blue-100' : ''
                }`}
              >
                <div>
                  <div className="font-medium">{version.label}</div>
                  <div className="text-sm text-gray-500">{formatDate(version.timestamp)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadVersion(version.id)}
                    disabled={version.id === currentVersionId}
                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this version?')) {
                        deleteVersion(version.id);
                      }
                    }}
                    className="px-2 py-1 bg-red-100 rounded hover:bg-red-200 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuillHistoryControls;