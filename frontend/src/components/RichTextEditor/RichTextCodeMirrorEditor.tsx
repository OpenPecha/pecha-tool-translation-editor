import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useCodeMirror } from "@uiw/react-codemirror";

// Local imports
import { createCodeMirrorExtensions } from "./extensions/codeMirrorExtensions";
import {
  useContentSync,
  useContentInitialization,
  useFormatting,
} from "./hooks";
import type { RichTextCodeMirrorEditorProps, AnnotationRange } from "./types";

// Component imports
import CodeMirrorToolbar from "../CodeMirrorToolbar";
import AutoSaveIndicator from "../AutoSaveIndicator";

const RichTextCodeMirrorEditor: React.FC<RichTextCodeMirrorEditorProps> = ({
  documentId,
  isEditable,
  currentDoc,
}) => {
  // State management
  const [formatRanges, setFormatRanges] = useState<AnnotationRange[]>([]);
  // Refs for CodeMirror extensions
  const formatRangesRef = useRef(formatRanges);

  // State to track when container is ready
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  // Ref callback to set container immediately when DOM element is created
  const editorRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      console.log("🔗 CodeMirror container ref attached");
      setContainer(node);
    }
  }, []);

  // Update refs when state changes
  useEffect(() => {
    formatRangesRef.current = formatRanges;
  }, [formatRanges]);

  // Note: Removed isUserTyping logic since decorations are always rebuilt now

  // Debug: Log document data on mount/change
  useEffect(() => {
    console.log("🎯 RichTextCodeMirrorEditor received document:", {
      docId: currentDoc.id,
      contentLength: currentDoc.content?.length || 0,
      annotationsCount: currentDoc.annotations?.length || 0,
      annotations: currentDoc.annotations,
    });
  }, [currentDoc]);

  // Clean up localStorage annotations on mount (since we don't use localStorage anymore)
  useEffect(() => {
    if (documentId) {
      const annotationsKey = `annotations_${documentId}`;
      if (localStorage.getItem(annotationsKey)) {
        console.log("🧹 Cleaning up old localStorage annotations");
        localStorage.removeItem(annotationsKey);
      }
    }
  }, [documentId]);

  // Custom hooks
  const {
    currentContent,
    hasUnsavedChanges,
    onContentSaved,
    initializeContent,
    setCurrentContent,
    setHasUnsavedChanges,
  } = useContentSync();

  // Note: All content and annotation changes now go through AutoSaveIndicator's 3-second debounce
  // No more immediate saves - everything respects the inactivity timer

  // Clear annotations when content is empty
  const clearAnnotationsWhenEmpty = useCallback(
    (isEmpty: boolean) => {
      if (isEmpty) {
        console.log("🧹 Clearing annotations due to empty content");
        setFormatRanges([]);
      }
    },
    [setFormatRanges]
  );

  // Update annotation ranges when text changes
  const updateAnnotationRanges = useCallback(
    (updater: (ranges: AnnotationRange[]) => AnnotationRange[]) => {
      setFormatRanges((currentRanges) => {
        const newRanges = updater(currentRanges);
        console.log("🔄 Annotation ranges updated:", {
          before: currentRanges.length,
          after: newRanges.length,
          changes: newRanges.map((r) => `${r.type}:${r.from}-${r.to}`),
        });

        // Note: Content updates are handled by the updateListener
        // This callback only updates annotation ranges

        return newRanges;
      });
    },
    [setFormatRanges]
  );

  // Memoize extensions to prevent editor recreation
  const extensions = useMemo(() => {
    return createCodeMirrorExtensions(
      isEditable,
      formatRangesRef,
      clearAnnotationsWhenEmpty,
      setCurrentContent,
      setHasUnsavedChanges,
      updateAnnotationRanges
    );
  }, [
    isEditable,
    clearAnnotationsWhenEmpty,
    setCurrentContent,
    setHasUnsavedChanges,
    updateAnnotationRanges,
  ]);

  // Initialize CodeMirror with useCodeMirror hook - only when container is ready
  const { view } = useCodeMirror({
    container, // Use state-based container instead of ref.current
    value: "", // Start with empty content, we'll set it when ready
    height: "100%",
    width: "100%",
    extensions,
    editable: isEditable,
    basicSetup: {
      lineNumbers: true,
      foldGutter: false,
      dropCursor: false,
      allowMultipleSelections: false,
      indentOnInput: true,
      bracketMatching: true,
      closeBrackets: true,
      autocompletion: true,
      highlightSelectionMatches: false,
      searchKeymap: true,
    },
  });

  // Content initialization hook
  const { contentInitialized } = useContentInitialization(
    currentDoc,
    documentId,
    view,
    setFormatRanges
  );

  // Formatting hook
  const {
    handleBold,
    handleItalic,
    handleUnderline,
    handleHeader,
    addComment,
    addFootnote,
  } = useFormatting(
    view,
    formatRanges,
    setFormatRanges,
    setCurrentContent,
    setHasUnsavedChanges
  );

  // Initialize currentContent when document loads and we have the editor view
  useEffect(() => {
    if (view && currentDoc?.content && contentInitialized) {
      const content = view.state.doc.toString();
      console.log("🎯 Initializing currentContent with document content", {
        docContent: currentDoc.content.substring(0, 100) + "...",
        editorContent: content.substring(0, 100) + "...",
        formatRanges: formatRanges.length,
      });
      initializeContent(content, formatRanges);
    }
  }, [view, currentDoc, contentInitialized, formatRanges, initializeContent]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <CodeMirrorToolbar
        onBold={handleBold}
        onItalic={handleItalic}
        onUnderline={handleUnderline}
        onHeader={handleHeader}
        onComment={addComment}
        onFootnote={addFootnote}
        onExportData={() => {}}
        isEditable={isEditable}
      />

      {/* Auto-save indicator with autosave functionality */}
      {documentId && (
        <AutoSaveIndicator
          docId={documentId}
          hasUnsavedChanges={hasUnsavedChanges}
          lastSavedAt={hasUnsavedChanges ? undefined : new Date()}
          content={currentContent} // Clean content (no annotation markers)
          annotations={formatRanges} // Annotations array sent separately to backend
          onContentSaved={onContentSaved}
        />
      )}

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <div
          ref={editorRefCallback}
          className="h-full w-full border border-gray-200 rounded overflow-hidden"
          style={{ maxWidth: "100%", overflowX: "hidden" }}
        />
      </div>

      {/* Debug info */}
      <div className="p-2 bg-gray-100 text-xs border-t">
        Doc: {currentDoc ? "✅" : "❌"} | Container: {container ? "✅" : "❌"} |
        View: {view ? "✅" : "❌"} | Init: {contentInitialized ? "✅" : "❌"} |
        Content: {view ? view.state.doc.length : 0} chars | Annotations:{" "}
        {formatRanges.length} | CurrentContent: {currentContent.length} chars |
        IsClean:{" "}
        {!currentContent.includes("⟪") && !currentContent.includes("⟫")
          ? "✅"
          : "❌"}{" "}
        | Preview: {view ? view.state.doc.toString().substring(0, 50) : ""}...
      </div>
    </div>
  );
};

export default RichTextCodeMirrorEditor;
