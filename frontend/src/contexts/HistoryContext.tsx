import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  createVersion,
  fetchVersions,
  fetchVersion,
  deleteVersion as deleteVersionAPI,
} from "../api/version";

// Create the context
const QuillHistoryContext = createContext();

// Custom hook to use the history context
export const useQuillHistory = () => {
  const context = useContext(QuillHistoryContext);
  if (!context) {
    throw new Error(
      "useQuillHistory must be used within a QuillHistoryProvider"
    );
  }
  return context;
};

// Provider component
export const QuillHistoryProvider = ({
  children,
  docId = "default-doc",
  maxVersions = 50,
}) => {
  const [quillInstance, setQuillInstance] = useState(null);
  const [versions, setVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState(5000);
  const [intervalId, setIntervalId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load versions from API
  const loadVersions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchVersions(docId);
      setVersions(data);

      if (data.length > 0) {
        setCurrentVersionId(data[data.length - 1].id);
      }
    } catch (error) {
      console.error("Error fetching versions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [docId]);

  // Initialize - Load versions from API on mount
  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  // Register Quill instance
  const registerQuill = useCallback(
    (quill) => {
      setQuillInstance(quill);

      if (quill && versions.length > 0) {
        const latestVersion = versions[versions.length - 1];
        quill.setContents(latestVersion.content);
        setCurrentVersionId(latestVersion.id);
      }
    },
    [versions]
  );

  // Auto-save functionality
  useEffect(() => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }

    if (autoSaveEnabled && quillInstance) {
      const id = setInterval(() => {
        saveVersion("Auto-save");
      }, autoSaveInterval);
      setIntervalId(id);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoSaveEnabled, autoSaveInterval, quillInstance]);

  // Save a version (API)
  const saveVersion = useCallback(
    async (label = "Unnamed version") => {
      if (!quillInstance) return null;

      try {
        const newVersion = await createVersion(
          docId,
          label,
          quillInstance.getContents()
        );

        setVersions((prevVersions) => {
          const updatedVersions = [...prevVersions, newVersion];
          return updatedVersions.length > maxVersions
            ? updatedVersions.slice(-maxVersions)
            : updatedVersions;
        });

        setCurrentVersionId(newVersion.id);
        return newVersion;
      } catch (error) {
        console.error("Error saving version:", error);
      }
    },
    [quillInstance, docId, maxVersions]
  );

  // Load a specific version (API)
  const loadVersion = useCallback(
    async (versionId) => {
      if (!quillInstance) return false;

      try {
        const version = await fetchVersion(versionId);
        quillInstance.setContents(version.content);
        setCurrentVersionId(versionId);
        return true;
      } catch (error) {
        console.error("Error loading version:", error);
        return false;
      }
    },
    [quillInstance]
  );

  // Delete a version (API)
  const deleteVersion = useCallback(
    async (versionId) => {
      try {
        await deleteVersionAPI(versionId);
        setVersions((prevVersions) =>
          prevVersions.filter((v) => v.id !== versionId)
        );

        if (versionId === currentVersionId && versions.length > 1) {
          setCurrentVersionId(versions[versions.length - 2].id);
        }
      } catch (error) {
        console.error("Error deleting version:", error);
      }
    },
    [currentVersionId, versions]
  );

  // Create a named snapshot
  const createNamedSnapshot = useCallback(
    (name) => {
      return saveVersion(name);
    },
    [saveVersion]
  );

  // Toggle auto-save
  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled((prev) => !prev);
  }, []);

  // Set auto-save interval
  const setAutoSaveIntervalTime = useCallback((milliseconds) => {
    setAutoSaveInterval(milliseconds);
  }, []);

  // Context value
  const value = {
    versions,
    currentVersionId,
    autoSaveEnabled,
    autoSaveInterval,
    isLoading,
    registerQuill,
    saveVersion,
    loadVersion,
    deleteVersion,
    createNamedSnapshot,
    toggleAutoSave,
    setAutoSaveInterval: setAutoSaveIntervalTime,
  };

  return (
    <QuillHistoryContext.Provider value={value}>
      {children}
    </QuillHistoryContext.Provider>
  );
};

export default QuillHistoryContext;
