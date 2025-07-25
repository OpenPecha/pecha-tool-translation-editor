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
  isLoadingVersion: boolean;
  loadingVersionId: string | null;
  transitionPhase: 'idle' | 'fade-out' | 'skeleton' | 'fade-in';
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
  const [isLoadingVersion, setIsLoadingVersion] = useState<boolean>(false);
  const [loadingVersionId, setLoadingVersionId] = useState<string | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'fade-out' | 'skeleton' | 'fade-in'>('idle');
  // Fetch versions using react-query
  const {
    data: versions = [],
    isLoading,
    refetch: refetchVersions,
  } = useQuery({
    queryKey: [`versions-${docId}`],
    enabled: !!docId,
    queryFn: () => fetchVersions(docId!),
    // onSuccess: (data) => {
    //   if (data.length > 0 && !currentVersionId) {
    //     setCurrentVersionId(data[data.length - 1].id);
    //   }
    // },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Create version mutation
  const createVersionMutation = useMutation({
    mutationFn: ({ label, content }: { label: string; content: any }) =>
      createVersion(docId, label, content),
    onSuccess: (newVersion) => {
      queryClient.setQueryData(
        [`versions-${docId}`],
        (oldData: Version[] = []) => {
          const updatedVersions = [...oldData, newVersion];
          return updatedVersions.length > maxVersions
            ? updatedVersions.slice(-maxVersions)
            : updatedVersions;
        }
      );
      queryClient.invalidateQueries({ queryKey: [`versions-${docId}`] });
      setCurrentVersionId(newVersion.id);
    },
  });

  // Delete version mutation
  const deleteVersionMutation = useMutation({
    mutationFn: (versionId: string) => deleteVersionAPI(versionId),
    onSuccess: async (_, versionId) => {
      // Filter out the deleted version
      const updatedVersions = versions.filter((v) => v.id !== versionId);
      // Update cache with filtered data
      queryClient.setQueryData([`versions-${docId}`], () => updatedVersions);
      // If deleted version was current and there are still versions left
      if (versionId === currentVersionId && updatedVersions.length > 0) {
        // Set current to the last remaining version (most recent)
        const newCurrentVersion = updatedVersions[updatedVersions.length - 1];
        setCurrentVersionId(newCurrentVersion.id);
        const version = await fetchVersion(newCurrentVersion.id);
        // Update editor content
        if (newCurrentVersion && quillInstance) {
          quillInstance.setContents(version.content);
        }
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
      
    },
    [] 
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

  // Enhanced version loading with three-phase transition
  const loadVersion = useCallback(
    async (versionId: string): Promise<boolean> => {
      if (!quillInstance || isLoadingVersion) return false;

      try {
        // Phase 1: Start loading and fade-out
        setIsLoadingVersion(true);
        setLoadingVersionId(versionId);
        setTransitionPhase('fade-out');

        // Wait for fade-out transition
        await new Promise(resolve => setTimeout(resolve, 100));

        // Phase 2: Show skeleton
        setTransitionPhase('skeleton');

        // Fetch version content (with minimum skeleton display time)
        const [version] = await Promise.all([
          fetchVersion(versionId),
          new Promise(resolve => setTimeout(resolve, 300)) // Minimum skeleton time
        ]);

        // Phase 3: Apply content and fade-in
        setTransitionPhase('fade-in');
        quillInstance.setContents(version.content);
        setCurrentVersionId(versionId);

        // Wait for fade-in transition
        await new Promise(resolve => setTimeout(resolve, 300));

        // Reset to idle state
        setTransitionPhase('idle');
        setIsLoadingVersion(false);
        setLoadingVersionId(null);

        return true;
      } catch (error) {
        console.error("Error loading version:", error);
        
        // Reset states on error
        setTransitionPhase('fade-in'); // Fade back to original content
        await new Promise(resolve => setTimeout(resolve, 300));
        setTransitionPhase('idle');
        setIsLoadingVersion(false);
        setLoadingVersionId(null);
        
        return false;
      }
    },
    [quillInstance, isLoadingVersion]
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
      isLoadingVersion,
      loadingVersionId,
      transitionPhase,
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
      isLoadingVersion,
      loadingVersionId,
      transitionPhase,
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
