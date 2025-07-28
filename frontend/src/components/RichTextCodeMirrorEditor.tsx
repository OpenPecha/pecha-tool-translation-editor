import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { useCodeMirror } from "@uiw/react-codemirror";
import {
  EditorView,
  keymap,
  Decoration,
  DecorationSet,
  ViewPlugin,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { completionKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
// Removed updateContentDocument and mutation - now handled by AutoSaveIndicator
import CodeMirrorToolbar from "./CodeMirrorToolbar";
import AutoSaveIndicator from "./AutoSaveIndicator";

interface CurrentDocType {
  id: string;
  content?: string; // Plain text content
  docs_prosemirror_delta?: { ops: Array<{ insert: string }> };
  translations?: Array<{ id: string; language: string; name: string }>;
}

interface RichTextCodeMirrorEditorProps {
  documentId: string | undefined;
  isEditable: boolean;
  currentDoc: CurrentDocType;
}

const RichTextCodeMirrorEditor: React.FC<RichTextCodeMirrorEditorProps> = ({
  documentId,
  isEditable,
  currentDoc,
}) => {
  const [formatRanges, setFormatRanges] = useState<
    Array<{
      from: number;
      to: number;
      type: "bold" | "italic" | "underline" | string;
    }>
  >([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Query client removed - now handled by AutoSaveIndicator
  const editorRef = useRef<HTMLDivElement>(null);
  const formatRangesRef = useRef(formatRanges);
  const pendingSaveContentRef = useRef<string>("");

  // Get initial content from database
  const getInitialContent = useCallback(() => {
    if (!currentDoc) return "";

    if (currentDoc.content && currentDoc.content.trim()) {
      console.log("✅ Using document content from database");
      return currentDoc.content;
    } else if (currentDoc.docs_prosemirror_delta) {
      // Fallback for legacy data
      const delta = currentDoc.docs_prosemirror_delta;
      if (delta.ops) {
        const content = delta.ops
          .map((op) => (typeof op.insert === "string" ? op.insert : ""))
          .join("");
        console.log("📜 Using legacy document delta");
        return content;
      }
    }
    return "";
  }, [currentDoc]);

  // Update formatRanges ref whenever it changes
  useEffect(() => {
    formatRangesRef.current = formatRanges;
  }, [formatRanges]);

  // Content state for AutoSaveIndicator
  const [currentContent, setCurrentContent] = useState<string>("");

  // Trigger save function - wrapper for editor view
  const triggerSave = useCallback(
    (view: EditorView) => {
      const content = view.state.doc.toString();

      if (!content.trim()) {
        console.log("⏭️ Skipping save - content is empty");
        return;
      }

      setHasUnsavedChanges(true);
      setCurrentContent(content);

      console.log(
        `🎯 [${new Date().toISOString()}] Content updated - Length: ${
          content.length
        }`
      );
    },
    [setCurrentContent]
  );

  // Memoize extensions to prevent editor recreation
  const extensions = useMemo(() => {
    // Create decoration plugin for formatting
    const formatDecorationPlugin = ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        view: EditorView;

        constructor(view: EditorView) {
          this.view = view;
          this.decorations = this.buildDecorations(view);
        }

        update() {
          // Rebuild decorations when formatRanges change
          this.decorations = this.buildDecorations(this.view);
        }

        buildDecorations(view: EditorView): DecorationSet {
          const ranges: Array<
            ReturnType<ReturnType<typeof Decoration.mark>["range"]>
          > = [];

          try {
            // Use ref to get current formatRanges
            formatRangesRef.current.forEach((range) => {
              if (
                range.from >= 0 &&
                range.to <= view.state.doc.length &&
                range.from < range.to
              ) {
                let className = "";
                switch (range.type) {
                  case "bold":
                    className = "format-bold";
                    break;
                  case "italic":
                    className = "format-italic";
                    break;
                  case "underline":
                    className = "format-underline";
                    break;
                  default:
                    if (range.type.startsWith("h")) {
                      className = `format-${range.type}`;
                    }
                    break;
                }

                if (className) {
                  const mark = Decoration.mark({ class: className });
                  ranges.push(mark.range(range.from, range.to));
                }
              }
            });

            return Decoration.set(ranges);
          } catch (error) {
            console.error("Error building decorations:", error);
            return Decoration.set([]);
          }
        }
      },
      {
        decorations: (v) => v.decorations,
      }
    );

    return [
      history(),
      EditorView.lineWrapping,
      formatDecorationPlugin,
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        ...completionKeymap,
        ...lintKeymap,
      ]),
      EditorView.theme({
        "&": {
          height: "100%",
          fontSize: "16px",
          fontFamily: "MonlamTBslim, serif",
        },
        ".cm-scroller": {
          fontFamily: "inherit",
        },
        ".format-bold": {
          fontWeight: "bold",
        },
        ".format-italic": {
          fontStyle: "italic",
        },
        ".format-underline": {
          textDecoration: "underline",
        },
        ".format-h1": {
          fontSize: "2em",
          fontWeight: "bold",
          display: "block",
        },
        ".format-h2": {
          fontSize: "1.5em",
          fontWeight: "bold",
          display: "block",
        },
        ".format-h3": {
          fontSize: "1.2em",
          fontWeight: "bold",
          display: "block",
        },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const content = update.state.doc.toString();

          // Check if this is user input
          const isUserInput = update.transactions.some(
            (tr) =>
              tr.isUserEvent("input") ||
              tr.isUserEvent("input.type") ||
              tr.isUserEvent("input.paste")
          );

          console.log("🔄 Editor update:", {
            contentLength: content.length,
            isUserInput,
          });

          // Only save if this is user input
          if (isUserInput) {
            console.log("👤 User input detected - triggering save");
            triggerSave(update.view);
          }
        }
      }),
      EditorView.editable.of(isEditable),
    ];
  }, [isEditable, triggerSave]); // Only recreate when isEditable or triggerSave changes

  // Memoize initial content to prevent recalculation
  const initialContent = useMemo(
    () => getInitialContent(),
    [getInitialContent]
  );

  // Initialize CodeMirror with useCodeMirror hook
  const { setContainer, view } = useCodeMirror({
    container: editorRef.current,
    value: initialContent, // Use memoized database content
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

  // Set container ref
  useEffect(() => {
    if (editorRef.current) {
      setContainer(editorRef.current);
    }
  }, [setContainer]);

  // Load annotations from localStorage
  useEffect(() => {
    if (documentId) {
      try {
        const savedAnnotations = localStorage.getItem(
          `annotations_${documentId}`
        );
        if (savedAnnotations) {
          const parsedAnnotations = JSON.parse(savedAnnotations);
          setFormatRanges(parsedAnnotations);
          console.log("Loaded annotations from localStorage");
        }
      } catch (error) {
        console.error("Error loading annotations:", error);
      }
    }
  }, [documentId]);

  // Apply formatting functions
  const applyFormatting = useCallback(
    (type: "bold" | "italic" | "underline") => {
      if (!view) return;

      const { from, to } = view.state.selection.main;
      if (from === to) return; // No selection

      const newRange = { from, to, type };
      setFormatRanges((prev) => [...prev, newRange]);
      triggerSave(view);
    },
    [view, triggerSave]
  );

  const applyHeaderFormatting = useCallback(
    (level: number) => {
      if (!view) return;

      const selection = view.state.selection.main;
      const line = view.state.doc.lineAt(selection.head);
      const headerType = `h${level}`;

      setFormatRanges((prev) => [
        ...prev,
        { from: line.from, to: line.to, type: headerType },
      ]);
      triggerSave(view);
    },
    [view, triggerSave]
  );

  // Toolbar handlers
  const handleBold = () => applyFormatting("bold");
  const handleItalic = () => applyFormatting("italic");
  const handleUnderline = () => applyFormatting("underline");
  const handleHeader = (level: number) => applyHeaderFormatting(level);
  const addComment = () => console.log("Add comment");
  const addFootnote = () => console.log("Add footnote");

  // Force save logic removed - now handled by AutoSaveIndicator

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
          content={currentContent}
          annotations={formatRanges}
          onContentSaved={() => setHasUnsavedChanges(false)}
        />
      )}

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <div
          ref={editorRef}
          className="h-full w-full border border-gray-200 rounded overflow-hidden"
          style={{ maxWidth: "100%", overflowX: "hidden" }}
        />
      </div>

      {/* Debug info */}
      <div className="p-2 bg-gray-100 text-xs border-t">
        Content length: {view ? view.state.doc.length : 0} | Formats:{" "}
        {formatRanges.length} | Preview:{" "}
        {view ? view.state.doc.toString().substring(0, 50) : ""}...
      </div>
    </div>
  );
};

export default RichTextCodeMirrorEditor;
