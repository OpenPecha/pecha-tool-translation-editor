import { memo, useCallback, useEffect, useRef, useState } from "react";
import Quill from "quill";
import Toolbar from "./Toolbar/Toolbar";
import "quill/dist/quill.snow.css";
import quill_import from "./quillExtension";
import { useQuillVersion } from "../contexts/VersionContext";
import LineNumberVirtualized from "./LineNumbers";
import CommentModal from "./Comment/CommentModal";
import TableOfContent from "./TableOfContent";
import { useEditor } from "@/contexts/EditorContext";
import { editor_config, EDITOR_ENTER_ONLY } from "@/utils/editorConfig";
import { updateContentDocument } from "@/api/document";
import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CommentBubble from "./Comment/CommentBubble";
import { createPortal } from "react-dom";
quill_import();

const Editor = ({
  documentId,
  isEditable,
}: {
  documentId?: string;
  isEditable: boolean;
}) => {
  const { currentDoc } = useCurrentDoc(documentId);
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarId = "toolbar-container" + "-" + documentId?.substring(0, 4);
  const counterId = "counter-container" + "-" + documentId;
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const { registerQuill } = useQuillVersion();
  const { registerQuill: registerQuill2, unregisterQuill: unregisterQuill2 } =
    useEditor();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const queryClient = useQueryClient();
  const updateDocumentMutation = useMutation({
    mutationFn: (content: any) =>
      updateContentDocument(documentId as string, {
        docs_prosemirror_delta: content.ops,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`document-${documentId}`],
        refetchType: "active",
      });
    },
    onError: (error) => {
      console.error("Error updating document content:", error);
    },
  });
  const isSynced = !updateDocumentMutation.isPending;
  const debouncedSave = useCallback(
    (content: any) => {
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
          },
        },
        cursors: {
          transformOnTextChange: false,
        },
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
        debouncedSave(currentContent);
      }
    });
    quill.on("selection-change", (range) => {
      if (!range) return;
      const selection = document.getSelection();
      if (selection && selection.rangeCount > 0) {
        const domrange = selection.getRangeAt(0);
        const rect = domrange.getBoundingClientRect();
        const { left, top } = rect;
        const newRange = {
          ...range,
          left,
          top,
        };
        // You can use left and top coordinates for positioning elements
        setCurrentRange(newRange);
      }
    });

    return () => {
      const currentContent = quill.getContents();
      updateDocumentMutation.mutate(currentContent);
      unregisterQuill2(editorId);
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
      quillRef.current.setContents(currentDoc.docs_prosemirror_delta);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentDoc?.docs_prosemirror_delta]);

  function addComment() {
    if (!currentRange) return;
    setShowCommentModal(true);
  }
  if (!documentId) return null;
  return (
    <>
      {createPortal(
        <Toolbar
          addComment={addComment}
          synced={isSynced}
          documentId={documentId}
          toolbarId={toolbarId}
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
          <div
            ref={editorRef}
            className={`editor-content flex-1 pb-3 w-full`}
            style={{
              fontFamily: "Monlam",
              fontSize: "1rem",
              lineHeight: 1.5,
            }}
          />
          {createPortal(
            <div id={`${counterId}`}>0 Characters</div>,
            document.getElementById("counter")!
          )}
          <CommentBubble documentId={documentId} />
          {showCommentModal && (
            <CommentModal
              documentId={documentId}
              setShowCommentModal={setShowCommentModal}
              currentRange={currentRange}
            />
          )}
        </div>
        {/* <OverlayLoading isLoading={!isSynced} /> */}
      </div>
    </>
  );
};

export default memo(Editor);
