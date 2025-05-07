 import { useState } from 'react';
import { fetchDocument } from '../api/document';
import { useAuth } from '@/auth/use-auth-hook';
import { useQuery } from '@tanstack/react-query';
import { EDITOR_READ_ONLY } from "@/utils/editorConfig";

interface Translation {
  id: string;
  identifier: string;
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
}

interface UseCurrentDocReturn {
  currentDoc: Document | null;
  loading: boolean;
  error: string | null;
  isEditable: boolean;
}

export const useCurrentDoc = (docId: string | undefined): UseCurrentDocReturn => {
  const { currentUser } = useAuth();
  const [isEditable,setIsEditable] =useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: [`document-${docId}`],
    queryFn: async () => {
      if (!docId) return null;
      const doc=await fetchDocument(docId)
      if (doc?.permissions && !EDITOR_READ_ONLY) {
        doc?.permissions.find((permission) => {
          if (permission?.userId === currentUser?.id && permission?.canWrite) {
            setIsEditable(true);
          }
        });
      } 
      return doc;
    },
    enabled: !!docId,
    staleTime:0,
  });

  return {
    currentDoc: data,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load document') : null,
    isEditable:true
  };
};
 