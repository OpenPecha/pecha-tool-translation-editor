import { useContext, useEffect, useRef, useState } from "react";
import Quill from "quill";
import { QuillBinding } from "y-quill";
import { useAuth } from "../contexts/AuthContext";
import YjsContext from "../lib/yjsProvider";
import Toolbar from "./Toolbar";
import "quill/dist/quill.snow.css";
import quill_import from "./quillExtension";
import { fetchComments } from "../api/comment";
import OverlayLoading from "./OverlayLoading";
import { fetchSuggests } from "../api/suggest";
import { fetchDocument } from "../api/document";
import { useQuillHistory } from "../contexts/HistoryContext";
import LineNumberVirtualized from "./LineNumbers";
import SuggestionModal from "./SuggestionModal";
quill_import();

const Editor = ({
  documentId,
  isEditable,
  quillRef,
}: {
  documentId: string;
  isEditable: boolean;
  quillRef: any;
}) => {
  const editorRef = useRef(null);
  const [quill, setQuill] = useState<Quill | null>(null);
  const toolbarId =
    "toolbar-container" + "-" + Math.random().toString(36).substring(7);
  const counterId =
    "counter-container" + "-" + Math.random().toString(36).substring(7);

  const { clearYjsProvider, toggleConnection, online, yText, yjsProvider } =
    useContext(YjsContext);
  const [synced, setSynced] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const { registerQuill } = useQuillHistory();
  const [currentRange, setCurrentRange] = useState<Range | null>(null);

  useEffect(() => {
    const quill = new Quill(editorRef?.current, {
      theme: "snow",
      modules: {
        toolbar: { container: `#${toolbarId}` },
        cursors: { transformOnTextChange: false },
        history: { delay: 2000, maxStack: 500 },
        counter: { container: `#${counterId}`, unit: "character" },
      },
      readOnly: !isEditable,
      placeholder: "Start collaborating...",
      className: "overflow-y-auto h-full ",
    });
    setQuill(quill);
    quillRef.current = quill;
    registerQuill(quill);
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
    };
  }, []);

  return (
    <div className="w-full relative flex-1 h-full">
      <Toolbar
        id={toolbarId}
        addSuggestion={() => setShowSuggestionModal((p) => !p)}
        synced={synced}
        quill={quill}
        documentId={documentId}
      />
      <div className="relative h-[calc(100dvh-52px)]">
        <div className="editor-container w-full h-full flex relative overflow-hidden ">
          <LineNumberVirtualized
            quill={quill}
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
      {showSuggestionModal && (
        <SuggestionModal
          quill={quill}
          documentId={documentId}
          range={currentRange}
          setShowSuggestionModal={setShowSuggestionModal}
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
