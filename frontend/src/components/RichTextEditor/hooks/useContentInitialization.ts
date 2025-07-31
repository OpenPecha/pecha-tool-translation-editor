import { useCallback, useState, useEffect, useMemo } from "react";
import { EditorView } from "@codemirror/view";
import type { CurrentDocType, AnnotationRange } from "../types";

export const useContentInitialization = (
  currentDoc: CurrentDocType | null,
  documentId: string | undefined,
  view: EditorView | undefined,
  setFormatRanges: (
    ranges: AnnotationRange[] | ((prev: AnnotationRange[]) => AnnotationRange[])
  ) => void
) => {
  const [contentInitialized, setContentInitialized] = useState(false);

  // Get clean content from database (without annotation markers)
  const getInitialContent = useCallback(() => {
    console.log("🎯 getInitialContent called with currentDoc:", {
      hasDoc: !!currentDoc,
      docId: currentDoc?.id,
      contentLength: currentDoc?.content?.length || 0,
      annotationsCount: currentDoc?.annotations?.length || 0,
      annotations: currentDoc?.annotations,
    });

    if (!currentDoc) {
      console.log("❌ No currentDoc available");
      return "";
    }

    let content = "";

    if (currentDoc.content && currentDoc.content.trim()) {
      content = currentDoc.content;
    } else {
      console.log("⚠️ No content found in currentDoc", currentDoc);
    }

    // Load annotations from database (always set formatRanges, even if empty)
    if (currentDoc.annotations && currentDoc.annotations.length > 0) {
      // Backend sends annotations already in the correct {from, to, type} format
      const formattedAnnotations = currentDoc.annotations;

      console.log("📂 Loading annotations from database", {
        annotationCount: formattedAnnotations.length,
        annotations: formattedAnnotations,
        rawAnnotations: currentDoc.annotations,
      });

      setFormatRanges(formattedAnnotations);
    } else {
      // Important: Reset formatRanges to empty array when no annotations
      console.log("📂 No annotations found - resetting formatRanges to empty");
      setFormatRanges([]);
    }

    return content; // Return clean text
  }, [currentDoc, documentId, setFormatRanges]);

  // Memoize initial content to prevent recalculation, but update when currentDoc changes
  const initialContent = useMemo(() => {
    const content = getInitialContent();

    return content;
  }, [getInitialContent, currentDoc, documentId]);

  // Initialize CodeMirror content when ready
  useEffect(() => {
    if (
      view &&
      currentDoc &&
      initialContent !== undefined &&
      !contentInitialized
    ) {
      // Set the clean content (annotations are already loaded in getInitialContent)
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: initialContent },
      });

      setContentInitialized(true);
      console.log("✅ Content initialization complete");
    }
  }, [view, currentDoc, initialContent, contentInitialized]);

  // Reset initialization flag when document changes
  useEffect(() => {
    setContentInitialized(false);
  }, [documentId]);

  // Handle case where currentDoc loads after view is ready
  useEffect(() => {
    if (view && currentDoc && !contentInitialized) {
      console.log(
        "📦 Document loaded after view was ready, triggering initialization"
      );
      // The content initialization effect above will handle this
    }
  }, [view, currentDoc, contentInitialized]);

  return {
    initialContent,
    contentInitialized,
  };
};
