// src/contexts/QuillHistoryContext.js

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create the context
const QuillHistoryContext = createContext();

// Custom hook to use the history context
export const useQuillHistory = () => {
  const context = useContext(QuillHistoryContext);
  if (!context) {
    throw new Error('useQuillHistory must be used within a QuillHistoryProvider');
  }
  return context;
};

// Provider component
export const QuillHistoryProvider = ({ children, docId = 'default-doc', maxVersions = 50 }) => {
  const [quillInstance, setQuillInstance] = useState(null);
  const [versions, setVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState(5000);
  const [intervalId, setIntervalId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get storage key for this document
  const getStorageKey = useCallback(() => {
    return `quill-history-${docId}`;
  }, [docId]);

  // Load versions from localStorage
  const loadVersionsFromStorage = useCallback(() => {
    const versionsJson = localStorage.getItem(getStorageKey());
    if (!versionsJson) return [];
    
    try {
      return JSON.parse(versionsJson);
    } catch (e) {
      console.error('Error parsing versions from localStorage:', e);
      return [];
    }
  }, [getStorageKey]);

  // Save versions to localStorage
  const saveVersionsToStorage = useCallback((newVersions) => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(newVersions));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
      
      // Handle localStorage quota exceeded
      if (e.name === 'QuotaExceededError') {
        // Remove oldest versions to make space
        const prunedVersions = newVersions.slice(-maxVersions);
        localStorage.setItem(getStorageKey(), JSON.stringify(prunedVersions));
        return prunedVersions;
      }
    }
    return newVersions;
  }, [getStorageKey, maxVersions]);

  // Initialize - load versions on mount
  useEffect(() => {
    const loadedVersions = loadVersionsFromStorage();
    setVersions(loadedVersions);
    
    if (loadedVersions.length > 0) {
      setCurrentVersionId(loadedVersions[loadedVersions.length - 1].id);
    }
    
    setIsLoading(false);
  }, [loadVersionsFromStorage]);

  // Register Quill instance
  const registerQuill = useCallback((quill) => {
    setQuillInstance(quill);
    
    // Load latest version content into Quill
    if (quill) {
      const loadedVersions = loadVersionsFromStorage();
      if (loadedVersions.length > 0) {
        const latestVersion = loadedVersions[loadedVersions.length - 1];
        quill.setContents(latestVersion.content);
        setCurrentVersionId(latestVersion.id);
      }
    }
  }, [loadVersionsFromStorage]);

  // Auto-save functionality
  useEffect(() => {
    // Clean up previous interval if it exists
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    
    // Set up new interval if auto-save is enabled and we have a Quill instance
    if (autoSaveEnabled && quillInstance) {
      const id = setInterval(() => {
        saveVersion('Auto-save');
      }, autoSaveInterval);
      setIntervalId(id);
    }
    
    // Clean up on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoSaveEnabled, autoSaveInterval, quillInstance]);

  // Save a version
  const saveVersion = useCallback((label = 'Unnamed version') => {
      if (!quillInstance) return null;
    
    const newVersion = {
      id: Date.now(), // Use timestamp as ID
      label,
      timestamp: new Date().toISOString(),
      content: quillInstance.getContents()
    };
    
    setVersions(prevVersions => {
      // Add new version
      const updatedVersions = [...prevVersions, newVersion];
      
      // Prune if necessary
      const prunedVersions = updatedVersions.length > maxVersions 
        ? updatedVersions.slice(-maxVersions) 
        : updatedVersions;
      
      // Save to localStorage
      saveVersionsToStorage(prunedVersions);
      
      return prunedVersions;
    });
    
    setCurrentVersionId(newVersion.id);
    return newVersion;
  }, [quillInstance, maxVersions, saveVersionsToStorage]);

  // Load a specific version
  const loadVersion = useCallback((versionId) => {
    if (!quillInstance) return false;
    
    const version = versions.find(v => v.id === versionId);
    if (version && version.content) {
      quillInstance.setContents(version.content);
      setCurrentVersionId(versionId);
      return true;
    }
    
    return false;
  }, [quillInstance, versions]);

  // Delete a version
  const deleteVersion = useCallback((versionId) => {
    setVersions(prevVersions => {
      const filteredVersions = prevVersions.filter(v => v.id !== versionId);
      
      // Only update if we actually removed something
      if (filteredVersions.length !== prevVersions.length) {
        saveVersionsToStorage(filteredVersions);
        
        // If we deleted the current version, set current to the latest
        if (versionId === currentVersionId && filteredVersions.length > 0) {
          setCurrentVersionId(filteredVersions[filteredVersions.length - 1].id);
        }
        
        return filteredVersions;
      }
      
      return prevVersions;
    });
  }, [currentVersionId, saveVersionsToStorage]);

  // Create a named snapshot
  const createNamedSnapshot = useCallback((name) => {
    return saveVersion(name);
  }, [saveVersion]);

  // Toggle auto-save
  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled(prev => !prev);
  }, []);

  // Set auto-save interval
  const setAutoSaveIntervalTime = useCallback((milliseconds) => {
    setAutoSaveInterval(milliseconds);
  }, []);

  // Context value
  const value = {
    // State
    versions,
    currentVersionId,
    autoSaveEnabled,
    autoSaveInterval,
    isLoading,
    
    // Actions
    registerQuill,
    saveVersion,
    loadVersion,
    deleteVersion,
    createNamedSnapshot,
    toggleAutoSave,
    setAutoSaveInterval: setAutoSaveIntervalTime
  };

  return (
    <QuillHistoryContext.Provider value={value}>
      {children}
    </QuillHistoryContext.Provider>
  );
};

export default QuillHistoryContext;