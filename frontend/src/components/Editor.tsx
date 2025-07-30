import { memo, useCallback, useEffect, useRef, useState } from "react";
import Quill from "quill";
import Toolbar from "./Toolbar/Toolbar";
import "quill/dist/quill.snow.css";
import quill_import from "./quillExtension";
import { useQuillVersion } from "../contexts/VersionContext";
import LineNumberVirtualized from "./LineNumbers";
import CommentInitialize from "./Comment/CommentInitialize";
import TableOfContent from "./TableOfContent";
import { useEditor } from "@/contexts/EditorContext";
import { editor_config, EDITOR_ENTER_ONLY } from "@/utils/editorConfig";
import { updateContentDocument } from "@/api/document";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CommentBubble from "./Comment/CommentBubble";
import { createPortal } from "react-dom";
import FootnoteView from "./Footnote/FootnoteView";
import { useTranslate } from "@tolgee/react";
import emitter from "@/services/eventBus";
import { useUmamiTracking } from "@/hooks/use-umami-tracking";
import { getUserContext } from "@/hooks/use-umami-tracking";
import { useAuth } from "@/auth/use-auth-hook";
import SkeletonLoader from "./SkeletonLoader";
quill_import();

const Editor = ({
  documentId,
  isEditable,
  currentDoc,
}: {
  documentId?: string;
  isEditable: boolean;
  currentDoc: Document;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarId =
    "toolbar-container" + "-" + Math.random().toString(36).slice(2, 6);
  const counterId =
    "counter-container" + "-" + Math.random().toString(36).slice(2, 6);
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const { registerQuill, transitionPhase } = useQuillVersion();
  const {
    registerQuill: registerQuill2,
    unregisterQuill: unregisterQuill2,
    getLineNumber,
  } = useEditor();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const { t } = useTranslate();
  const { currentUser } = useAuth();
  const { trackDocumentOpened, trackDocumentSaved } = useUmamiTracking();

  // Track document opening
  useEffect(() => {
    if (documentId && currentDoc) {
      // Determine if this is a root document by checking if it has translations
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
    mutationFn: (content: Record<string, unknown>) =>
      updateContentDocument(documentId as string, {
        docs_prosemirror_delta: content.ops,
      }),
    onError: (error) => {
      console.error("Error updating document content:", error);
    },
    onSuccess: () => {
      // Track document save
      if (documentId) {
        trackDocumentSaved(documentId, "auto", getUserContext(currentUser));
      }
    },
  });

  const isSynced = !updateDocumentMutation.isPending;
  const queryClient = useQueryClient();
  const debouncedSave = useCallback(
    (content: Record<string, unknown>) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (!documentId) return;
        updateDocumentMutation.mutate(content);
      }, 3000); // 3 second debounce
    },
    [documentId, updateDocumentMutation]
  );

  useEffect(() => {
    const signal = new AbortController();

    const editorId = documentId;
    const tool = document.getElementById(toolbarId);
    if (!editorRef.current || !tool) return;

    function handleFormatChange(type: string) {
      const range = quill.getSelection();
      if (range) {
        const format = quill.getFormat(range);
        quill.format(type, !format[type], "user");
      } else {
        // If no selection, create one at cursor position
        quill.focus();
        const newRange = quill.getSelection(true);
        if (newRange) {
          const format = quill.getFormat(newRange);
          quill.format(type, !format[type], "user");
        }
      }
    }

    // Initialize the Yjs document and text with awareness
    const quill = new Quill(editorRef.current, {
      theme: "snow",
      modules: {
        history: editor_config.HISTORY_CONFIG,
        toolbar: {
          container: `#${toolbarId}`,
          handlers: {
            bold: () => handleFormatChange("bold"),
            italic: () => handleFormatChange("italic"),
            underline: () => handleFormatChange("underline"),
            background: function (value: string) {
              const range = quill.getSelection();
              if (range) {
                quill.format("background", value, "user");
              }
            },
            headerN: function (value: string | number | null) {
              if (value === null) {
                quill.format("headerN", false, "user");
              } else {
                quill.format("headerN", value, "user");
              }
            },
            redo: () => {
              quill.history.redo();
            },
            undo: () => {
              quill.history.undo();
            },
          },
        },
        // cursors: {
        //   transformOnTextChange: false,
        // },
        keyboard: true,
        counter: { container: `#${counterId}`, unit: "character" },
      },
      readOnly: !isEditable,
      placeholder: "Start collaborating...",
      // className is not a valid Quill option, apply these styles to the container instead
    });
    registerQuill(quill);
    quillRef.current = quill;
    registerQuill2(editorId, quill);
    quill?.root.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        if (EDITOR_ENTER_ONLY) {
          if (e.key !== "Enter") {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      },
      signal
    );
    // Fetch comments when the editor loads
    quill.on("text-change", function (delta, oldDelta, source) {
      if (source === "user") {
        const currentContent = quill.getLength() > 1 ? quill.getContents() : "";
        setTimeout(() => {
          debouncedSave(currentContent);
        }, 0);
      }
    });
    quill.on("selection-change", (range) => {
      if (!range) return;
      const selection = document.getSelection();
      if (selection && selection.rangeCount > 0) {
        const domrange = selection.getRangeAt(0);
        const rect = domrange.getBoundingClientRect();
        const { left, top } = rect;

        const lineNumber = getLineNumber(quill);
        const newRange = {
          ...range,
          left,
          top,
          lineNumber,
        };
        // You can use left and top coordinates for positioning elements
        setCurrentRange(newRange);
      }
    });

    return () => {
      const currentContent = quill.getContents();
      updateDocumentMutation.mutate(currentContent);
      unregisterQuill2(editorId);
      queryClient.removeQueries({
        queryKey: [`document-${documentId}`],
      });
      signal.abort();
      quill.disable();
    };
  }, [isEditable]);

  useEffect(() => {
    if (
      quillRef.current &&
      quillRef.current.getText().trim() === "" &&
      currentDoc?.docs_prosemirror_delta
    ) {
      setTimeout(() => {
        quillRef.current?.setContents(currentDoc.docs_prosemirror_delta);
      }, 0);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentDoc?.docs_prosemirror_delta]);

  function addComment() {
    if (!currentRange || currentRange?.length === 0) return;

    setShowCommentModal(true);
  }
  function addFootnote() {
    if (!currentRange || currentRange?.length === 0) return;
    emitter.emit("createFootnote", { range: currentRange, documentId });
  }
  if (!documentId) return null;
  return (
    <>
      {createPortal(
        <Toolbar
          addComment={addComment}
          addFootnote={addFootnote}
          synced={isSynced}
          documentId={documentId}
          toolbarId={toolbarId}
          range={currentRange}
          isEditable={isEditable}
        />,
        document.getElementById("toolbar-container")!
      )}
      <div className="relative w-full flex flex-1 ">
        <TableOfContent documentId={documentId} />
        <div className="editor-container w-full flex flex-1  relative max-w-6xl mx-auto  ">
          <LineNumberVirtualized
            editorRef={editorRef}
            documentId={documentId}
          />
          <div className="flex flex-col overflow-y-auto flex-1 relative">
            <div
              ref={editorRef}
              className={`editor-content flex-1 pb-1 w-full overflow-hidden`}
              style={{
                fontFamily: "Monlam",
                fontSize: "1rem",
                lineHeight: 1.5,
              }}
            />
            
            {/* Skeleton Overlay */}
            {transitionPhase === 'skeleton' && (
              <div className="absolute inset-0 bg-white z-10 p-4 overflow-y-auto">
                <SkeletonLoader className="version-skeleton-loader" />
              </div>
            )}
            
            <FootnoteView documentId={documentId} isEditable={isEditable} />
          </div>
          {createPortal(
            <div className="flex gap-1 items-center">
              <div id={`${counterId}`} className="leading-[normal]">
                0
              </div>
              {t("editor.characters")}
            </div>,
            document.getElementById("counter")!
          )}

          {showCommentModal && (
            <CommentInitialize
              documentId={documentId}
              setShowCommentModal={setShowCommentModal}
              currentRange={currentRange}
            />
          )}
          <CommentBubble documentId={documentId} isEditable={isEditable} />
        </div>
        {/* <OverlayLoading isLoading={!isSynced} /> */}
      </div>
    </>
  );
};

export default memo(Editor);
