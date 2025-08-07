import {
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
  updateVersionContent,
  fetchCurrentVersion,
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
  // Version creation mutation states
  isCreatingVersion: boolean;
  createVersionError: string | null;
  createVersionSuccess: boolean;
  registerQuill: (quill: Quill) => void;
  saveVersion: (label?: string) => Promise<Version | null>;
  updateCurrentVersion: () => Promise<Version | null>;
  loadVersion: (versionId: string) => Promise<boolean>;
  loadVersions: () => void;
  deleteVersion: (versionId: string) => Promise<void>;
  createNamedSnapshot: (name: string) => Promise<Version | null>;
  toggleAutoSave: () => void;
  setAutoSaveInterval: (milliseconds: number) => void;
  clearVersionCreationState: () => void;
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
  
  // Version creation feedback states
  const [createVersionSuccess, setCreateVersionSuccess] = useState<boolean>(false);
  
  // Fetch versions using react-query
  const {
    data: versions = [],
    isLoading,
    refetch: refetchVersions,
  } = useQuery({
    queryKey: [`versions-${docId}`],
    enabled: !!docId,
    queryFn: () => fetchVersions(docId!),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Fetch current version from database to sync with stored currentVersionId
  const {
    data: databaseCurrentVersion,
  } = useQuery({
    queryKey: [`current-version-${docId}`],
    enabled: !!docId,
    queryFn: () => fetchCurrentVersion(docId!),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Effect to sync currentVersionId with database when data loads
  useEffect(() => {
    if (databaseCurrentVersion?.id) {
      // Always use the database's currentVersionId as the source of truth
      setCurrentVersionId(databaseCurrentVersion.id);
    } else if (versions.length > 0) {
      // Fallback to latest version if no current version is set in database
      const latestVersion = versions[0]; // versions are ordered by timestamp desc
      setCurrentVersionId(latestVersion.id);
    }
  }, [databaseCurrentVersion, versions]);

  // Create version mutation
  const createVersionMutation = useMutation({
    mutationFn: ({ label, content }: { label: string; content: any }) =>
      createVersion(docId!, label, content),
    onSuccess: (newVersion) => {
      queryClient.setQueryData(
        [`versions-${docId}`],
        (oldData: Version[] = []) => {
          const updatedVersions = [newVersion,...oldData];
          return updatedVersions.length > maxVersions
            ? updatedVersions.slice(-maxVersions)
            : updatedVersions;
        }
      );
      queryClient.invalidateQueries({ queryKey: [`versions-${docId}`] });
      queryClient.invalidateQueries({ queryKey: [`current-version-${docId}`] });
      setCurrentVersionId(newVersion.id);
      
      // Show success feedback
      setCreateVersionSuccess(true);
      
      // Auto-hide success state after 2 seconds
      setTimeout(() => {
        setCreateVersionSuccess(false);
      }, 2000);
    },
    onError: (error) => {
      console.error("Version creation failed:", error);
      // Error state is handled by mutation.isError
    },
  });

  // Delete version mutation
  const deleteVersionMutation = useMutation({
    mutationFn: (versionId: string) => deleteVersionAPI(versionId),
    onSuccess: async (_, versionId) => {
      // Filter out the deleted version
      const updatedVersions = versions.filter((v: Version) => v.id !== versionId);
      // Update cache with filtered data
      queryClient.setQueryData([`versions-${docId}`], () => updatedVersions);
      // Invalidate current version query to sync with backend changes
      queryClient.invalidateQueries({ queryKey: [`current-version-${docId}`] });
      // If deleted version was current and there are still versions left
      if (versionId === currentVersionId && updatedVersions.length > 0) {
        setCurrentVersionId(updatedVersions[0].id);
      }
    },
  });

  // Load versions from API
  const loadVersions = useCallback(() => {
    refetchVersions();
    // Also invalidate current version query to ensure consistency
    queryClient.invalidateQueries({ queryKey: [`current-version-${docId}`] });
  }, [refetchVersions, queryClient, docId]);

  // Register Quill instance
  const registerQuill = useCallback(
    (quill: Quill) => {
      setQuillInstance(quill);
      if (quill && versions.length > 0) {
        // Use the current version from database if available, otherwise fall back to latest
        const targetVersion = databaseCurrentVersion || 
          versions.find((v: Version) => v.id === currentVersionId) || 
          versions[0]; // versions are ordered by timestamp desc, so [0] is latest
        
        if (targetVersion?.content) {
          quill.setContents(targetVersion.content);
        }
        // Don't override currentVersionId here - let the sync effect handle it
      }
    },
    [versions, databaseCurrentVersion, currentVersionId]
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

  // Update current version with latest content from editor
  const updateCurrentVersion = useCallback(
    async (): Promise<Version | null> => {
      if (!quillInstance || !currentVersionId) return null;

      try {
        const content = quillInstance.getContents();
        const updatedVersion = await updateVersionContent(currentVersionId, content);
        
        // Update the version in the cache
        queryClient.setQueryData(
          [`versions-${docId}`],
          (oldData: Version[] = []) => {
            return oldData.map(version => 
              version.id === currentVersionId 
                ? { ...version, ...updatedVersion, content }
                : version
            );
          }
        );
        
        // Invalidate current version query to ensure sync with backend
        queryClient.invalidateQueries({ queryKey: [`current-version-${docId}`] });
        
        return updatedVersion;
      } catch (error) {
        console.error("Error updating current version:", error);
        throw error;
      }
    },
    [quillInstance, currentVersionId, queryClient, docId]
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

  // Clear version creation state
  const clearVersionCreationState = useCallback(() => {
    setCreateVersionSuccess(false);
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
      // Version creation mutation states
      isCreatingVersion: createVersionMutation.isPending,
      createVersionError: createVersionMutation.error?.message || null,
      createVersionSuccess,
      registerQuill,
      saveVersion,
      updateCurrentVersion,
      loadVersion,
      loadVersions,
      deleteVersion,
      createNamedSnapshot,
      toggleAutoSave,
      setAutoSaveInterval: setAutoSaveIntervalTime,
      clearVersionCreationState,
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
      createVersionMutation.isPending,
      createVersionMutation.error?.message,
      createVersionSuccess,
      registerQuill,
      saveVersion,
      updateCurrentVersion,
      loadVersion,
      loadVersions,
      deleteVersion,
      createNamedSnapshot,
      toggleAutoSave,
      setAutoSaveIntervalTime,
      clearVersionCreationState,
    ]
  );

  return (
    <QuillVersionContext.Provider value={value}>
      {children}
    </QuillVersionContext.Provider>
  );
};

export default QuillVersionContext;
