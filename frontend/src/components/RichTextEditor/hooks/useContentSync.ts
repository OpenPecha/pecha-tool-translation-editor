import { useCallback, useState } from "react";
import type { AnnotationRange } from "../types";

export const useContentSync = () => {
  const [currentContent, setCurrentContent] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize current content directly (no encoding needed)
  const initializeContent = useCallback(
    (content: string, annotations: AnnotationRange[]) => {
      console.log("🎯 Initializing currentContent:", {
        contentLength: content.length,
        annotationCount: annotations.length,
        isCleanContent: true,
      });
      setCurrentContent(content);
    },
    []
  );

  // Note: syncToDatabase function removed - all saves now go through AutoSaveIndicator debouncing

  const onContentSaved = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  return {
    currentContent,
    hasUnsavedChanges,
    onContentSaved,
    initializeContent,
    setCurrentContent,
    setHasUnsavedChanges,
  };
};
