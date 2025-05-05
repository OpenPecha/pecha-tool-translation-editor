import { memo, useContext, useEffect, useId, useRef, useState } from "react";
import Quill from "quill";
import { QuillBinding } from "y-quill";
import YjsContext from "../lib/yjsProvider";
import Toolbar from "./Toolbar/Toolbar";
import "quill/dist/quill.snow.css";
import quill_import from "./quillExtension";
import OverlayLoading from "./OverlayLoading";
import { useQuillVersion } from "../contexts/VersionContext";
import LineNumberVirtualized from "./LineNumbers";
import CommentModal from "./Comment/CommentModal";
import TableOfContent from "./TableOfContent";
import { useEditor } from "@/contexts/EditorContext";
import { editor_config, EDITOR_ENTER_ONLY } from "@/utils/editorConfig";
import { updateContentDocument } from "@/api/document";
import { LARGEDOCUMENT_SIZE } from "@/utils/Constants";
quill_import();

const Editor = ({
  documentId,
  isEditable,
}: {
  documentId: string;
  isEditable: boolean;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const unique = useId().replaceAll(":", "");
  const toolbarId = "toolbar-container" + "-" + unique;
  const counterId = "counter-container" + "-" + unique;
  const { yText, yjsProvider, isSynced, ydoc, activeUsers } =
    useContext(YjsContext);
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const { registerQuill } = useQuillVersion();
  const { registerQuill: registerQuill2, unregisterQuill: unregisterQuill2 } =
    useEditor();
  const bindingRef = useRef<QuillBinding | null>(null);
  const quillRef = useRef<Quill | null>(null);
  useEffect(() => {
    console.log("render");
    const signal = new AbortController();

    const editorId = documentId;
    if (!editorRef.current || !yText || !yjsProvider?.awareness) return;

    function handleFormatChange(type: string) {
      const range = quill.getSelection();
      if (range) {
        const format = quill.getFormat(range);
        quill.format(type, !format[type]);
      } else {
        // If no selection, create one at cursor position
        quill.focus();
        const newRange = quill.getSelection(true);
        if (newRange) {
          const format = quill.getFormat(newRange);
          quill.format(type, !format[type]);
        }
      }
    }

    // Initialize the Yjs document and text with awareness
    const quill = new Quill(editorRef.current, {
      theme: "snow",
      modules: {
        toolbar: {
          container: `#${toolbarId}`,
          handlers: {
            bold: () => handleFormatChange("bold"),
            italic: () => handleFormatChange("italic"),
            underline: () => handleFormatChange("underline"),
            headerN: function (value: string | number | null) {
              const range = quill.getSelection();
              if (range) {
                quill.format("h", value || false);
              }
            },
            undo: function () {
              quill.history.undo();
            },
            redo: function () {
              quill.history.redo();
            },
          },
        },
        cursors: {
          transformOnTextChange: false,
        },
        history: editor_config.HISTORY_CONFIG,
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
    // Create the binding between Quill and YText
    if (
      quill &&
      yText.length > 0 &&
      yjsProvider?.awareness &&
      !bindingRef.current
    ) {
      bindingRef.current = new QuillBinding(
        yText,
        quill,
        yjsProvider?.awareness
      );
    }

    // Fetch comments when the editor loads
    quill.on("text-change", function (delta, oldDelta, source) {
      if (source === "user") {
        if (quill.getLength() <= 1) {
          const shouldDelete = confirm(
            "Are you sure you want to delete all content?"
          );
          if (!shouldDelete) {
            quill.setContents(oldDelta);
          }
        }
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
    if (yjsProvider._resyncInterval !== null && isSynced) {
      clearInterval(yjsProvider._resyncInterval);
      console.log("close interval socket");
      yjsProvider._resyncInterval = null; // Prevent it from being cleared again or reused
    }
    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
      quill.disable();
      unregisterQuill2("editor" + editorId);
      signal.abort();
    };
  }, [isSynced, yjsProvider?.awareness, documentId, isEditable]);

  // Effect to track initial sync completion
  useEffect(() => {
    if (isSynced && !initialSyncComplete) {
      setInitialSyncComplete(true);
    }
  }, [isSynced, initialSyncComplete]);

  useEffect(() => {
    return () => {
      if (!quillRef.current) return;

      const content = quillRef.current?.getText();
      const delta = quillRef.current?.getContents();
      const activeUsersCount = Array.from(
        new Set(activeUsers.map((user) => user.name))
      ).length;
      if (content.length > LARGEDOCUMENT_SIZE && activeUsersCount < 1) {
        updateContentDocument(documentId, {
          docs_prosemirror_delta: delta.ops,
        })
          .then((data) => {
            console.log(data.json());
          })
          .catch((error) => {
            console.error("Error updating document content:", error);
          });
      }
    };
  }, []);

  function addSuggestion() {
    if (!currentRange) return;

    setShowCommentModal(true);
  }

  return (
    <div className="w-full relative flex-1 h-full">
      <Toolbar
        id={toolbarId}
        addSuggestion={addSuggestion}
        synced={isSynced}
        documentId={documentId}
      />
      <TableOfContent documentId={documentId} />
      <div className="relative h-full flex justify-center">
        <div className="editor-container w-full max-w-[816px]  h-full flex relative overflow-hidden ">
          <LineNumberVirtualized
            editorRef={editorRef}
            documentId={documentId}
          />
          <div
            ref={editorRef}
            className={`editor-content flex-1 pb-3 `}
            style={{ fontFamily: "Monlam", fontSize: "1rem", lineHeight: 1.5 }}
          />
        </div>
        <OverlayLoading isLoading={!isSynced && !initialSyncComplete} />
        <div
          className="absolute bottom-2 right-2 bg-white rounded-lg shadow-md px-4 py-2 text-gray-600 text-sm border border-gray-200"
          id={`${counterId}`}
        >
          0 characters
        </div>
      </div>
      {showCommentModal && (
        <CommentModal
          documentId={documentId}
          setShowCommentModal={setShowCommentModal}
          currentRange={currentRange}
        />
      )}
    </div>
  );
};

export default memo(Editor);
