import { useContext, useEffect, useRef, useState } from "react";
import Quill from "quill";
import { QuillBinding } from "y-quill";
import YjsContext from "../lib/yjsProvider";
import Toolbar from "./Toolbar";
import "quill/dist/quill.snow.css";
import quill_import from "./quillExtension";
import OverlayLoading from "./OverlayLoading";
import { fetchDocument } from "../api/document";
import { useQuillHistory } from "../contexts/HistoryContext";
import LineNumberVirtualized from "./LineNumbers";
import CommentModal from "./CommentModal";
import TableOfContent from "./TableOfContent";
import { useEditor } from "@/contexts/EditorContext";
quill_import();

const Editor = ({
  documentId,
  isEditable,
}: {
  documentId: string;
  isEditable: boolean;
}) => {
  const editorRef = useRef(null);
  const toolbarId =
    "toolbar-container" + "-" + Math.random().toString(36).substring(7);
  const counterId =
    "counter-container" + "-" + Math.random().toString(36).substring(7);

  const { clearYjsProvider, toggleConnection, online, yText, yjsProvider } =
    useContext(YjsContext);
  const [synced, setSynced] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const { registerQuill } = useQuillHistory();
  const { registerQuill: registerQuill2, unregisterQuill: unregisterQuill2 } =
    useEditor();
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  useEffect(() => {
    const editorId = documentId;
    const quill = new Quill(editorRef?.current, {
      theme: "snow",
      modules: {
        toolbar: {
          container: `#${toolbarId}`,
          handlers: {
            headerN: function (value) {
              const range = quill.getSelection();
              if (range) {
                quill.format("headerN", value || false);
              }
            },
          },
        },
        cursors: { transformOnTextChange: false },
        history: { delay: 2000, maxStack: 500 },
        counter: { container: `#${counterId}`, unit: "character" },
      },
      readOnly: !isEditable,
      placeholder: "Start collaborating...",
      className: "overflow-y-auto h-full ",
    });
    registerQuill(quill);
    registerQuill2(editorId, quill);
    new QuillBinding(yText, quill, yjsProvider?.awareness);
    yjsProvider?.on("sync", (isSynced: boolean) => {
      setSynced(isSynced);
      if (isSynced) {
        setShowOverlay(false);
        const plainText = quill.getText();
        if (plainText.trim().length === 0) {
          fetchDocument(documentId).then((doc) => {
            quill.setContents(doc.docs_prosemirror_delta);
          });
        } else {
          console.log("text is not empty");
        }
      }
    });
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
      setCurrentRange(range);
    });

    return () => {
      clearYjsProvider();
      unregisterQuill2("editor" + editorId);
    };
  }, []);

  return (
    <div className="w-full relative flex-1 h-full">
      <Toolbar
        id={toolbarId}
        addSuggestion={() => setShowCommentModal((p) => !p)}
        synced={synced}
        documentId={documentId}
      />
      <TableOfContent documentId={documentId} />
      <div className="relative h-full">
        <div className="editor-container w-full h-full flex relative overflow-hidden ">
          <LineNumberVirtualized
            editorRef={editorRef}
            documentId={documentId}
          />
          <div
            ref={editorRef}
            className="editor-content flex-1"
            style={{ fontFamily: "Monlam", fontSize: 18 }}
          />
        </div>
        <OverlayLoading isLoading={showOverlay} />
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
          range={currentRange}
          setShowCommentModal={setShowCommentModal}
        />
      )}
      {/* 🔥 Pass comments and update function to Comments */}
      {/* <div className="comment-container w-1/4">
        <Comments  comments={comments}  />
      </div> */}
    </div>
  );
};

export default Editor;
