 import { useState, useEffect } from 'react';
import { fetchDocument } from '../api/document';

interface Translation {
  id: string;
  identifier: string;
}

interface Document {
  id: string;
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
}

export const useCurrentDoc = (docId: string | undefined): UseCurrentDocReturn => {
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocument() {
      if (!docId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const doc = await fetchDocument(docId);
        setCurrentDoc(doc);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
        setCurrentDoc(null);
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [docId]);

  return { currentDoc, loading, error };
};