import { memo, useCallback, useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView, ViewUpdate, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { lineNumbers, highlightActiveLineGutter } from "@codemirror/view";
import { highlightActiveLine, bracketMatching } from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";

import Toolbar from "./Toolbar/Toolbar";
import CommentInitialize from "./Comment/CommentInitialize";
import TableOfContent from "./TableOfContent";
import { useEditor } from "@/contexts/EditorContext";
import { updateContentDocument } from "@/api/document";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CommentBubble from "./Comment/CommentBubble";
import { createPortal } from "react-dom";
import FootnoteView from "./Footnote/FootnoteView";
import { useTranslate } from "@tolgee/react";
import { useUmamiTracking } from "@/hooks/use-umami-tracking";
import { getUserContext } from "@/hooks/use-umami-tracking";
import { useAuth } from "@/auth/use-auth-hook";

// Import our custom CodeMirror extensions
import {
  createCommentExtension,
  createFootnoteExtension,
  createHeaderExtension,
  createVerseExtension,
} from "./codeMirrorExtensions";

interface CurrentDocType {
  id: string;
  docs_prosemirror_delta?: { ops: Array<{ insert: string }> };
  translations?: Array<{ id: string; language: string; name: string }>;
}

const CodeMirrorEditor = ({
  documentId,
  isEditable,
  currentDoc,
}: {
  documentId?: string;
  isEditable: boolean;
  currentDoc: CurrentDocType;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarId =
    "toolbar-container" + "-" + Math.random().toString(36).slice(2, 6);
  const counterId =
    "counter-container" + "-" + Math.random().toString(36).slice(2, 6);
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [documentContent, setDocumentContent] = useState("");

  const {
    registerQuill: registerEditor,
    unregisterQuill: unregisterEditor,
    getLineNumber,
  } = useEditor();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslate();
  const { currentUser } = useAuth();
  const { trackDocumentOpened, trackDocumentSaved } = useUmamiTracking();
  const queryClient = useQueryClient();

  // Track document opening
  useEffect(() => {
    if (documentId && currentDoc) {
      const documentType =
        currentDoc.translations && currentDoc.translations.length > 0
          ? "root"
          : "translation";
      trackDocumentOpened(
        documentId,
        documentType,
        getUserContext(currentUser)
      );
    }
  }, [documentId, currentDoc, trackDocumentOpened, currentUser]);

  const updateDocumentMutation = useMutation({
    mutationFn: (content: string) =>
      updateContentDocument(documentId as string, {
        docs_prosemirror_delta: { ops: [{ insert: content }] },
      }),
    onError: (error) => {
      console.error("Error updating document content:", error);
    },
    onSuccess: () => {
      if (documentId) {
        trackDocumentSaved(documentId, "auto", getUserContext(currentUser));
      }
    },
  });

  // Debounced save function
  const debouncedSave = useCallback(
    (content: string) => {
      // Protect against saving empty content
      if (!content || !content.trim()) {
        console.log(
          "Skipping save - empty content detected in CodeMirror editor"
        );
        return;
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        updateDocumentMutation.mutate(content);
      }, 1000);
    },
    [updateDocumentMutation]
  );

  // Format handlers for toolbar
  const handleFormatChange = useCallback(
    (format: string) => {
      if (!editorView) return;

      // Implement formatting logic for CodeMirror
      const selection = editorView.state.selection.main;
      const from = selection.from;
      const to = selection.to;

      if (from === to) return; // No selection

      let changes;
      const selectedText = editorView.state.doc.sliceString(from, to);

      switch (format) {
        case "bold":
          changes = editorView.state.changes({
            from,
            to,
            insert: `**${selectedText}**`,
          });
          break;
        case "italic":
          changes = editorView.state.changes({
            from,
            to,
            insert: `*${selectedText}*`,
          });
          break;
        case "underline":
          changes = editorView.state.changes({
            from,
            to,
            insert: `<u>${selectedText}</u>`,
          });
          break;
        default:
          return;
      }

      editorView.dispatch({ changes });
    },
    [editorView]
  );

  // CodeMirror extensions
  const extensions = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    bracketMatching(),
    history(),
    markdown(),
    autocompletion(),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      ...completionKeymap,
      ...lintKeymap,
    ]),
    EditorView.theme({
      "&": { height: "100%" },
      ".cm-scroller": { fontFamily: "inherit" },
      ".cm-focused": { outline: "none" },
    }),
    EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        const content = update.state.doc.toString();
        setDocumentContent(content);
        debouncedSave(content);
      }

      if (update.selectionSet) {
        const selection = update.state.selection.main;
        const line = update.state.doc.lineAt(selection.head);
        // Update current range for other components
        setCurrentRange({
          ...selection,
          lineNumber: line.number,
        } as any);
      }
    }),
    // Custom extensions for comments, footnotes, etc.
    createCommentExtension(),
    createFootnoteExtension(),
    createHeaderExtension(),
    createVerseExtension(),
    // Read-only mode
    EditorView.editable.of(isEditable),
  ];

  // Initialize content from currentDoc
  useEffect(() => {
    if (currentDoc?.docs_prosemirror_delta) {
      // Convert Quill delta to plain text for now
      // TODO: Implement proper delta to text conversion
      const content = extractTextFromDelta(currentDoc.docs_prosemirror_delta);
      setDocumentContent(content);
    }
  }, [currentDoc?.docs_prosemirror_delta]);

  // Helper function to extract text from Quill delta
  const extractTextFromDelta = (delta: any): string => {
    if (!delta || !delta.ops) return "";

    return delta.ops
      .map((op: any) => {
        if (typeof op.insert === "string") {
          return op.insert;
        }
        return "";
      })
      .join("");
  };

  function addComment() {
    if (!currentRange || currentRange?.length === 0) return;
    setShowCommentModal(true);
  }

  const abortController = new AbortController();
  const signal = abortController.signal;
  const editorId = documentId || "main-editor";

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      const currentContent = documentContent;
      if (currentContent) {
        updateDocumentMutation.mutate(currentContent);
      }
      unregisterEditor(editorId);
      queryClient.removeQueries({
        queryKey: [`document-${documentId}`],
      });
      signal.abort();
    };
  }, []);

  return (
    <div className="flex w-full h-full overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div id={toolbarId} className="border-b p-2 bg-white sticky top-0 z-40">
          <Toolbar
            documentId={documentId}
            onFormatChange={handleFormatChange}
          />
        </div>
        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 h-full overflow-auto relative">
            <div
              ref={editorRef}
              className="h-full"
              style={{
                fontFamily: "MonlamTBslim, serif",
                fontSize: "16px",
                lineHeight: "1.8",
              }}
            >
              <CodeMirror
                value={documentContent}
                extensions={extensions}
                theme={undefined} // Use light theme by default
                height="100%"
                className="h-full"
                onCreateEditor={(view) => {
                  setEditorView(view);
                  registerEditor(editorId, view);
                }}
              />
            </div>
            {/* Comment Modal */}
            {showCommentModal && currentRange && (
              <CommentInitialize
                currentRange={currentRange}
                documentId={documentId as string}
                onClose={() => setShowCommentModal(false)}
              />
            )}
            {/* Comment Bubbles */}
            {createPortal(
              <CommentBubble documentId={documentId as string} />,
              document.body
            )}
          </div>
        </div>
        <div id={counterId} className="p-2 bg-gray-50 text-sm text-gray-600">
          {/* Character count will be updated by CodeMirror extension */}
        </div>
      </div>

      {/* Table of Contents */}
      <TableOfContent documentId={documentId as string} />

      {/* Footnote View */}
      <FootnoteView documentId={documentId as string} isEditable={isEditable} />
    </div>
  );
};

export default memo(CodeMirrorEditor);
