import { useState } from "react";
import {
  fetchDocument,
  fetchDocumentTranslations,
  fetchPublicDocument,
  fetchSingleTranslationStatus,
} from "../api/document";
import { useAuth } from "@/auth/use-auth-hook";
import { useQuery } from "@tanstack/react-query";
import { EDITOR_READ_ONLY } from "@/utils/editorConfig";

export interface Translation {
  id: string;
  language: string;
  name: string;
  updatedAt: string;
  translationStatus?: string; // pending, progress, completed, failed
  translationProgress?: number; // 0-100 percentage
  translationJobId?: string; // ID from the translation worker
}

interface Permission {
  userId: string;
  canWrite: boolean;
  canRead: boolean;
}

interface Document {
  id: string;
  name: string;
  identifier: string;
  docs_prosemirror_delta: Record<string, unknown>;
  docs_y_doc_state: Uint8Array;
  created_at?: string;
  updated_at?: string;
  translations?: Translation[];
  rootProjectId?: string;
  translationStatus?: string;
  translationJobId?: string;
  rootsProject?: {
    id?: string;
    name?: string;
    permissions?: Permission[];
  };
}

interface UseCurrentDocReturn {
  currentDoc: Document | null;
  loading: boolean;
  error: string | null;
  isEditable: boolean | undefined;
}

export const useCurrentDoc = (
  docId: string | undefined,
  isPublic: boolean = false
): UseCurrentDocReturn => {
  const { currentUser } = useAuth();
  const [isEditable, setIsEditable] = useState<boolean | undefined>(undefined);
  const { data, isLoading, error } = useQuery({
    queryKey: [`document-${docId}`],
    queryFn: async () => {
      if (!docId) return null;
      const doc = isPublic
        ? await fetchPublicDocument(docId)
        : await fetchDocument(docId);

      // For public documents, always set as not editable
      if (isPublic) {
        setIsEditable(false);
      }

      if (doc?.rootsProject?.permissions && !EDITOR_READ_ONLY) {
        doc?.rootsProject.permissions.map((permission: Permission) => {
          if (permission?.userId === currentUser?.id && permission?.canWrite) {
            setIsEditable(true);
          }
        });
      }
      return doc;
    },
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: !!docId,
    staleTime: 0,
  });
  return {
    currentDoc: data,
    loading: isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to load document"
      : null,
    isEditable,
  };
};

/**
 * Hook to fetch and manage translations for a document
 * @param docId The ID of the document to fetch translations for
 * @returns Object containing translations data, loading state, and error
 */
export const useCurrentDocTranslations = (docId: string | undefined) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [`translations-${docId}`],
    queryFn: async () => {
      if (!docId) return [];
      return await fetchDocumentTranslations(docId);
    },
    enabled: !!docId,
    staleTime: 0, // Always fetch fresh data
  });

  return {
    translations: data ?? [],
    loading: isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to load translations"
      : null,
    refetchTranslations: refetch,
  };
};

/**
 * Hook to manage individual translation status with polling
 * @param translationId The ID of the translation to monitor
 * @param translationStatus Current translation status from the translation list
 * @returns Object containing status data, loading state, and error
 */
export const useTranslationStatus = (
  translationId: string | undefined,
  translationStatus?: string
) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [`translation-status-${translationId}`],
    queryFn: async () => {
      if (!translationId) return null;
      return await fetchSingleTranslationStatus(translationId);
    },
    enabled:
      !!translationId &&
      (translationStatus === "pending" ||
        translationStatus === "started" ||
        translationStatus === "progress" ||
        translationStatus === "failed"),
    refetchInterval: (query) => {
      const status = query.state.data?.translationStatus;
      const message = query.state.data?.message;

      // Stop polling only if translation is completed or permanently failed
      if (status === "completed") {
        return false;
      }

      // Continue polling if status is failed but contains retry information
      if (status === "failed" && message && message.includes("retry")) {
        return 5000; // Poll every 5 seconds during retry scenarios
      }

      // Stop polling for permanent failures (no retry message)
      if (status === "failed") {
        return false;
      }

      return 5000; // Poll every 5 seconds for in-progress translations
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  return {
    statusData: data,
    isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to load status"
      : null,
    refetchStatus: refetch,
  };
};
