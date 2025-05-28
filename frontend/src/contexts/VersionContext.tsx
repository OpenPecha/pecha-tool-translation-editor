import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";

import {
  createVersion,
  fetchVersions,
  fetchVersion,
  deleteVersion as deleteVersionAPI,
} from "../api/version";
import Quill from "quill";
import { User } from "@/auth/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const AUTOSAVE_INTERVAL = 900000; // 15min

interface Version {
  id: string;
  content: any;
  label: string;
  createdAt: string;
  timestamp: string;
  userId?: string;
  user?: User;
}

interface QuillVersionContextType {
  versions: Version[];
  currentVersionId: string | null;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  isLoading: boolean;
  registerQuill: (quill: Quill) => void;
  saveVersion: (label?: string) => Promise<Version | null>;
  loadVersion: (versionId: string) => Promise<boolean>;
  loadVersions: () => void;
  deleteVersion: (versionId: string) => Promise<void>;
  createNamedSnapshot: (name: string) => Promise<Version | null>;
  toggleAutoSave: () => void;
  setAutoSaveInterval: (milliseconds: number) => void;
}

interface QuillVersionProviderProps {
  children: ReactNode;
  docId?: string;
  maxVersions?: number;
}

// Create the context
const QuillVersionContext = createContext<QuillVersionContextType | null>(null);

// Custom hook to use the history context
export const useQuillVersion = (): QuillVersionContextType => {
  const context = useContext(QuillVersionContext);
  if (!context) {
    throw new Error(
      "useQuillVersion must be used within a QuillVersionProvider"
    );
  }
  return context;
};

// Provider component
export const QuillVersionProvider = ({
  children,
  docId,
  maxVersions = 50,
}: QuillVersionProviderProps) => {
  const queryClient = useQueryClient();
  const [quillInstance, setQuillInstance] = useState<Quill | null>(null);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(false);
  const [autoSaveInterval, setAutoSaveInterval] =
    useState<number>(AUTOSAVE_INTERVAL);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  // Fetch versions using react-query
  const {
    data: versions = [],
    isLoading,
    refetch: refetchVersions,
  } = useQuery({
    queryKey: ["versions", docId],
    enabled: !!docId,
    queryFn: () => fetchVersions(docId),
    onSuccess: (data) => {
      if (data.length > 0 && !currentVersionId) {
        setCurrentVersionId(data[data.length - 1].id);
      }
    },
  });

  // Create version mutation
  const createVersionMutation = useMutation({
    mutationFn: ({ label, content }: { label: string; content: any }) =>
      createVersion(docId, label, content),
    onSuccess: (newVersion) => {
      queryClient.setQueryData(
        ["versions", docId],
        (oldData: Version[] = []) => {
          const updatedVersions = [...oldData, newVersion];
          return updatedVersions.length > maxVersions
            ? updatedVersions.slice(-maxVersions)
            : updatedVersions;
        }
      );
      queryClient.invalidateQueries({ queryKey: [`versions`, docId] });

      setCurrentVersionId(newVersion.id);
    },
  });

  // Delete version mutation
  const deleteVersionMutation = useMutation({
    mutationFn: (versionId: string) => deleteVersionAPI(versionId),
    onSuccess: (_, versionId) => {
      queryClient.setQueryData(["versions", docId], (oldData: Version[] = []) =>
        oldData.filter((v) => v.id !== versionId)
      );

      if (versionId === currentVersionId && versions.length > 1) {
        setCurrentVersionId(versions[versions.length - 2].id);
      }
    },
  });

  // Load versions from API
  const loadVersions = useCallback(() => {
    refetchVersions();
  }, []);

  // Register Quill instance
  const registerQuill = useCallback(
    (quill: Quill) => {
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
    async (label = "Unnamed version"): Promise<Version | null> => {
      if (!quillInstance) return null;

      try {
        const content = quillInstance.getContents();
        const newVersion = await createVersionMutation.mutateAsync({
          label,
          content,
        });
        return newVersion;
      } catch (error) {
        console.error("Error saving version:", error);
        return null;
      }
    },
    [quillInstance, createVersionMutation]
  );

  // Load a specific version (API)
  const loadVersion = useCallback(
    async (versionId: string): Promise<boolean> => {
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
    async (versionId: string): Promise<void> => {
      try {
        await deleteVersionMutation.mutateAsync(versionId);
      } catch (error) {
        console.error("Error deleting version:", error);
      }
    },
    [deleteVersionMutation]
  );

  // Create a named snapshot
  const createNamedSnapshot = useCallback(
    (name: string): Promise<Version | null> => {
      return saveVersion(name);
    },
    [saveVersion]
  );

  // Toggle auto-save
  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled((prev) => !prev);
  }, []);

  // Set auto-save interval
  const setAutoSaveIntervalTime = useCallback((milliseconds: number) => {
    setAutoSaveInterval(milliseconds);
  }, []);

  // Context value
  const value = useMemo(
    (): QuillVersionContextType => ({
      versions,
      currentVersionId,
      autoSaveEnabled,
      autoSaveInterval,
      isLoading,
      registerQuill,
      saveVersion,
      loadVersion,
      loadVersions,
      deleteVersion,
      createNamedSnapshot,
      toggleAutoSave,
      setAutoSaveInterval: setAutoSaveIntervalTime,
    }),
    [
      versions,
      currentVersionId,
      autoSaveEnabled,
      autoSaveInterval,
      isLoading,
      registerQuill,
      saveVersion,
      loadVersion,
      loadVersions,
      deleteVersion,
      createNamedSnapshot,
      toggleAutoSave,
      setAutoSaveIntervalTime,
    ]
  );

  return (
    <QuillVersionContext.Provider value={value}>
      {children}
    </QuillVersionContext.Provider>
  );
};

export default QuillVersionContext;
